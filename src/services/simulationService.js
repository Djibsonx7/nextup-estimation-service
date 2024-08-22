/**
 * Simulation Service
 * Mise à jour effectuée :
 * 1. Optimisation des logs pour l'état de la file d'attente.
 * 2. Mise à jour de l'état de la file d'attente uniquement pour les événements clés (abandon, début de service, arrivée de client).
 */

const redisClient = require('../config/redisConfig');
const clientService = require('./clientService');
const monitoringService = require('./monitoringService');
const { promisify } = require('util');

// Promisify Redis methods
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const incrAsync = promisify(redisClient.incr).bind(redisClient);
const decrAsync = promisify(redisClient.decr).bind(redisClient);

// Fonction pour générer un temps aléatoire basé sur la distribution de Poisson
const poissonRandom = (lambda) => {
    let L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
        k++;
        p *= Math.random();
    } while (p > L);
    return k - 1;
};

// Définir les taux d'arrivée pour chaque type de service
const serviceArrivalRate = {
    'deposit': 10,
    'withdrawal': 8,
    'consultation': 5
};

// Plages de temps d'attente pour chaque type de service
const serviceTimeRanges = {
    'deposit': { min: 1, max: 5 },         
    'withdrawal': { min: 2, max: 7 },      
    'consultation': { min: 5, max: 10 }    
};

// Réduire le nombre de clients simultanés pour éviter la surcharge
const maxConcurrentClients = 5;
let activeClients = 0;

// Fonction pour calculer le temps d'attente en fonction de la longueur de la file d'attente et du type de service
const calculateWaitTime = (queueLength, serviceType) => {
    const timeRange = serviceTimeRanges[serviceType];
    let baseTime = Math.floor(Math.random() * (timeRange.max - timeRange.min + 1)) + timeRange.min;

    if (isNaN(baseTime) || isNaN(queueLength)) {
        console.warn(`Problème avec le calcul du temps d'attente: baseTime=${baseTime}, queueLength=${queueLength}`);
        return 0;
    }

    return baseTime * queueLength + baseTime;
};

// Fonction pour générer un temps de service réaliste
const generateServiceTime = (serviceType) => {
    const timeRange = serviceTimeRanges[serviceType];
    const serviceTime = Math.floor(Math.random() * (timeRange.max - timeRange.min + 1)) + timeRange.min;

    return serviceTime;
};

// Fonction pour simuler l'arrivée des clients de manière asynchrone et dynamique
const simulateClientArrival = async () => {
    const serviceTypes = Object.keys(serviceArrivalRate);

    while (true) {
        if (activeClients >= maxConcurrentClients) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }

        activeClients++;
        const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
        const arrivalRate = serviceArrivalRate[serviceType];
        const timeUntilNextArrival = poissonRandom(arrivalRate);

        setTimeout(async () => {
            try {
                const clientId = `client${Math.floor(Math.random() * 1000)}`;
                const currentTime = Date.now();

                const queueLengthKey = `queue_length:${serviceType}`;
                let currentQueueLength = await getAsync(queueLengthKey) || 0;
                currentQueueLength = parseInt(currentQueueLength, 10);

                if (isNaN(currentQueueLength)) {
                    console.warn(`Longueur de la file d'attente invalide pour ${serviceType}: ${currentQueueLength}. Réinitialisation à 0.`);
                    currentQueueLength = 0;
                    await setAsync(queueLengthKey, 0);
                }

                let waitTime = calculateWaitTime(currentQueueLength, serviceType);

                if (Math.random() < 0.1 && currentQueueLength > 0) {  
                    monitoringService.logClientStateUpdate(clientId, serviceType, 'abandoned');
                    await decrAsync(queueLengthKey);
                    // Mise à jour de la file d'attente après l'abandon
                    const updatedQueueLength = await getAsync(queueLengthKey);
                    console.log(`[INFO] État de la file d'attente pour ${serviceType} : ${updatedQueueLength} clients.`);
                    return;
                }

                monitoringService.logClientArrival(clientId, serviceType, currentTime, waitTime);
                await incrAsync(queueLengthKey);
                // Mise à jour de la file d'attente après l'arrivée d'un client
                const updatedQueueLengthArrival = await getAsync(queueLengthKey);
                console.log(`[INFO] État de la file d'attente pour ${serviceType} : ${updatedQueueLengthArrival} clients.`);

                if (Math.random() < 0.2) {  
                    const originalWaitTime = waitTime;
                    const adjustment = Math.floor(Math.random() * 10) - 5;
                    waitTime = Math.max(waitTime + adjustment, 1);
                    monitoringService.logWaitTimeAdjustment(clientId, serviceType, originalWaitTime, waitTime);
                }

                // Pause avant de commencer le service pour simuler un délai réel
                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));  // Pause correspondant au temps d'attente

                const serviceStartTime = Date.now();
                console.log(`[INFO] Service commencé pour ${clientId} dans ${serviceType} à ${new Date(serviceStartTime).toLocaleTimeString()} (in_progress).`);

                monitoringService.logTimeSpentInQueue(clientId, serviceType, currentTime, serviceStartTime);

                await clientService.updateClientState(clientId, {
                    serviceType,
                    waitTime,
                    status: 'in_progress',
                    arrivalTime: currentTime,
                    serviceStartTime,
                });

                const serviceTime = generateServiceTime(serviceType);

                setTimeout(async () => {
                    const serviceEndTime = Date.now();  
                    const timeSpent = (serviceEndTime - serviceStartTime) / 1000 / 60;

                    console.log(`[INFO] Service terminé pour ${clientId} dans ${serviceType} à ${new Date(serviceEndTime).toLocaleTimeString()}. Temps passé : ${timeSpent.toFixed(2)} minutes (completed).`);

                    await clientService.updateClientState(clientId, {
                        serviceType,
                        waitTime,
                        status: 'completed',
                        timeSpent,
                        arrivalTime: currentTime,
                        completionTime: serviceEndTime,
                    });

                    await monitoringService.logClientCompletion(clientId, serviceType, timeSpent);

                    await decrAsync(queueLengthKey);
                    // Mise à jour de la file d'attente après le passage en état completed
                    const updatedQueueLengthCompleted = await getAsync(queueLengthKey);
                    console.log(`[INFO] État de la file d'attente pour ${serviceType} : ${updatedQueueLengthCompleted} clients.`);

                }, serviceTime * 60000);  // Le temps de service est maintenant réellement simulé dans les minutes spécifiées
            } finally {
                activeClients--;
                simulateClientArrival();
            }
        }, timeUntilNextArrival * 2000);  // Augmenter l'intervalle entre les arrivées pour espacer les clients
    }
};

module.exports = {
    simulateClientArrival,
    serviceArrivalRate,
    poissonRandom,
    calculateWaitTime
};
