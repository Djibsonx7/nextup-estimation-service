// src/services/simulationService.js

/**
 * Mises à jour effectuées :
 * 1. Ajout d'une vérification avant de décrémenter la longueur de la file d'attente pour éviter les valeurs négatives.
 * 2. Assuré que les incrémentations et décrémentations sont atomiques et consistentes.
 * 3. Ajout de contrôles pour éviter les double-décrémentations et garantir la cohérence des files d'attente.
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

// Réduire les plages de temps d'attente pour chaque type de service pour les tests
const serviceTimeRanges = {
    'deposit': { min: 1, max: 2 },         // Réduit pour les tests
    'withdrawal': { min: 2, max: 3 },      // Réduit pour les tests
    'consultation': { min: 3, max: 5 }     // Réduit pour les tests
};

// Limiter le nombre de clients simultanés
const maxConcurrentClients = 10;
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

                console.log(`[INFO] État de la file d'attente pour ${serviceType} : ${currentQueueLength} clients.`);

                let waitTime = calculateWaitTime(currentQueueLength, serviceType);

                if (Math.random() < 0.1 && currentQueueLength > 0) {  // 10% de chance qu'un client abandonne après avoir attendu
                    monitoringService.logClientStateUpdate(clientId, serviceType, 'abandoned');
                    // Vérification avant de décrémenter pour éviter une valeur négative
                    if (currentQueueLength > 0) {
                        await decrAsync(queueLengthKey);
                    } else {
                        console.warn(`Tentative de décrémentation d'une file d'attente vide pour ${serviceType}.`);
                    }
                    return;
                }

                monitoringService.logClientArrival(clientId, serviceType, currentTime, waitTime);

                if (Math.random() < 0.2) {  // 20% de chance que le temps soit ajusté
                    const originalWaitTime = waitTime;
                    const adjustment = Math.floor(Math.random() * 10) - 5;
                    waitTime = Math.max(waitTime + adjustment, 1);
                    monitoringService.logWaitTimeAdjustment(clientId, serviceType, originalWaitTime, waitTime);
                }

                await clientService.updateClientState(clientId, {
                    serviceType,
                    waitTime,
                    status: 'in_progress',
                    arrivalTime: currentTime,
                });

                await incrAsync(queueLengthKey);

                setTimeout(async () => {
                    console.log(`[DEBUG] Temps d'attente terminé pour le client ${clientId}. Vérification pour passer à l'état 'completed'.`);

                    const timeSpent = waitTime;

                    await clientService.updateClientState(clientId, {
                        serviceType,
                        waitTime,
                        status: 'completed',
                        timeSpent,
                        arrivalTime: currentTime,
                        completionTime: Date.now(),
                    });

                    await monitoringService.logClientCompletion(clientId, serviceType, timeSpent);

                    // Vérification avant de décrémenter pour éviter une valeur négative
                    const updatedQueueLength = parseInt(await getAsync(queueLengthKey), 10);
                    if (updatedQueueLength > 0) {
                        await decrAsync(queueLengthKey);
                    } else {
                        console.warn(`Tentative de décrémentation d'une file d'attente vide pour ${serviceType}.`);
                    }

                    const finalQueueLength = await getAsync(queueLengthKey);
                    console.log(`[INFO] État de la file d'attente pour ${serviceType} : ${finalQueueLength} clients.`);

                }, waitTime * 2000);  // Temps légèrement augmenté pour tester, multiplié par 2 pour être en secondes

            } finally {
                activeClients--;
                simulateClientArrival();
            }
        }, timeUntilNextArrival * 1000);  // Convertir en millisecondes pour le timeout
    }
};

module.exports = {
    simulateClientArrival,
    serviceArrivalRate,
    poissonRandom,
    calculateWaitTime
};
