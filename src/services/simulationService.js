/**
 * Simulation Service
 * Ce service gère la simulation des arrivées de clients, la gestion des files d'attente et le traitement des clients.
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
const lpushAsync = promisify(redisClient.lpush).bind(redisClient);
const rpopAsync = promisify(redisClient.rpop).bind(redisClient);

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

const maxConcurrentClients = 5;
let activeClients = 0;

const calculateWaitTime = (queueLength, serviceType) => {
    const timeRange = serviceTimeRanges[serviceType];
    let baseTime = Math.floor(Math.random() * (timeRange.max - timeRange.min + 1)) + timeRange.min;

    if (isNaN(baseTime) || isNaN(queueLength)) {
        console.warn(`Problème avec le calcul du temps d'attente: baseTime=${baseTime}, queueLength=${queueLength}`);
        return 0;
    }

    return baseTime * queueLength + baseTime;
};

const generateServiceTime = (serviceType) => {
    const timeRange = serviceTimeRanges[serviceType];
    const serviceTime = Math.floor(Math.random() * (timeRange.max - timeRange.min + 1)) + timeRange.min;

    return serviceTime;
};

const processNextClient = async (serviceType) => {
    const inProgressKey = `in_progress:${serviceType}`;
    const queueKey = `queue:${serviceType}`;
    const inProgressCount = parseInt(await getAsync(inProgressKey)) || 0;

    if (inProgressCount >= maxConcurrentClients) {
        console.log(`[INFO] Limite de clients simultanés atteinte pour ${serviceType}.`);
        return;
    }

    const nextClientData = await rpopAsync(queueKey);

    if (nextClientData) {
        const { clientId, timestamp } = JSON.parse(nextClientData);
        console.log(`[DEBUG] Client récupéré de la file d'attente: ${clientId} pour ${serviceType}`);

        // Récupérer l'heure d'arrivée du client
        const arrivalTime = await getAsync(`arrival_time:${clientId}`);
        const serviceStartTime = Date.now();

        // Calculer le temps passé dans la file d'attente
        const waitTimeInQueue = (serviceStartTime - arrivalTime) / 1000 / 60;

        console.log(`[INFO] Service commencé pour ${clientId} dans ${serviceType} à ${new Date(serviceStartTime).toLocaleTimeString()} (in_progress).`);

        monitoringService.logTimeSpentInQueue(clientId, serviceType, arrivalTime, serviceStartTime);
        await clientService.updateClientState(clientId, {
            serviceType,
            status: 'in_progress',
            serviceStartTime,
            waitTimeInQueue: waitTimeInQueue.toFixed(2),
        });

        // Enregistrer le temps d'attente dans Redis pour le calcul de la moyenne glissante
        await lpushAsync(`wait_times:${serviceType}`, waitTimeInQueue.toFixed(2));

        // Décrémenter la longueur de la file d'attente
        const updatedQueueLength = await decrAsync(`queue_length:${serviceType}`);
        console.log(`[INFO] Longueur de la file d'attente pour ${serviceType} après décrémentation: ${updatedQueueLength} clients.`);

        const newInProgressCount = await incrAsync(inProgressKey);
        console.log(`[INFO] Nombre de clients en cours pour ${serviceType} : ${newInProgressCount}`);

        const serviceTime = generateServiceTime(serviceType);

        setTimeout(async () => {
            const serviceEndTime = Date.now();
            const timeSpent = (serviceEndTime - serviceStartTime) / 1000 / 60;

            console.log(`[INFO] Service terminé pour ${clientId} dans ${serviceType} à ${new Date(serviceEndTime).toLocaleTimeString()}. Temps passé : ${timeSpent.toFixed(2)} minutes (completed).`);

            await clientService.updateClientState(clientId, {
                serviceType,
                status: 'completed',
                timeSpent,
            });

            await monitoringService.logClientCompletion(clientId, serviceType, timeSpent);

            const finalInProgressCount = await decrAsync(inProgressKey);
            console.log(`[INFO] Nombre de clients en cours pour ${serviceType} après décrementation : ${finalInProgressCount}`);

            // Introduire un léger délai avant de traiter le prochain client
            setTimeout(() => {
                processNextClient(serviceType);
            }, 1000); // Délai de 1 seconde avant de démarrer le prochain client

        }, serviceTime * 60000);
    } else {
        console.log(`[DEBUG] Aucun client dans la file d'attente pour ${serviceType}`);
    }
};

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
                const inProgressKey = `in_progress:${serviceType}`;
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
                    console.log(`[INFO] État de la file d'attente pour ${serviceType} : ${currentQueueLength - 1} clients.`);
                    return;
                }

                monitoringService.logClientArrival(clientId, serviceType, currentTime, waitTime);

                // Ajout du client dans la file d'attente avec un timestamp distinct pour garantir le FIFO
                await lpushAsync(`queue:${serviceType}`, JSON.stringify({ clientId, timestamp: currentTime }));
                await incrAsync(queueLengthKey);

                // Stocker l'heure d'arrivée du client
                await setAsync(`arrival_time:${clientId}`, currentTime);

                let inProgressCount = await getAsync(inProgressKey);
                if (inProgressCount === null) {
                    await setAsync(inProgressKey, 0);
                    inProgressCount = 0;
                } else {
                    inProgressCount = parseInt(inProgressCount, 10);
                }

                if (inProgressCount === 0) {
                    console.log(`[DEBUG] Aucun client en cours pour ${serviceType}, démarrage du prochain client.`);
                    processNextClient(serviceType);
                } else {
                    console.log(`[DEBUG] Clients en cours pour ${serviceType} : ${inProgressCount}`);
                }

                console.log(`[INFO] État de la file d'attente pour ${serviceType} : ${currentQueueLength + 1} clients.`);

            } finally {
                activeClients--;
                simulateClientArrival();
            }
        }, timeUntilNextArrival * 2000);
    }
};

module.exports = {
    simulateClientArrival,
    serviceArrivalRate,
    poissonRandom,
    calculateWaitTime
};
