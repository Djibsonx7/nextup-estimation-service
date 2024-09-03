/**
 * Simulation Service
 * Ce service gère la simulation des arrivées de clients, la gestion des files d'attente et le traitement des clients.
 * Mise à jour : Capture et stockage de `queueLength`, `hourOfDay`, `dayOfWeek` et `minuteOfDay` lors de l'arrivée des clients, et récupération lors du traitement des clients.
 * Ajout : Régulation des arrivées pour éviter les arrivées simultanées.
 */

const redisClient = require('../config/redisConfig');
const clientService = require('./clientService');
const monitoringService = require('./monitoringService');
const { promisify } = require('util');
const moment = require('moment');

// Promisify Redis methods
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const incrAsync = promisify(redisClient.incr).bind(redisClient);
const decrAsync = promisify(redisClient.decr).bind(redisClient);
const lpushAsync = promisify(redisClient.lpush).bind(redisClient);
const rpopAsync = promisify(redisClient.rpop).bind(redisClient);

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
let lastArrivalTime = 0; // Timestamp de la dernière arrivée
const minArrivalInterval = 1000; // 1 seconde minimum entre les arrivées

// Générer un temps d'arrivée aléatoire basé sur une distribution de Poisson
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

// Calculer le temps d'attente basé sur la longueur de la file et le type de service
const calculateWaitTime = (queueLength, serviceType) => {
    const timeRange = serviceTimeRanges[serviceType];
    let baseTime = Math.floor(Math.random() * (timeRange.max - timeRange.min + 1)) + timeRange.min;

    if (isNaN(baseTime) || isNaN(queueLength)) {
        console.warn(`Problème avec le calcul du temps d'attente: baseTime=${baseTime}, queueLength=${queueLength}`);
        return 0;
    }

    return baseTime * queueLength + baseTime;
};

// Générer un temps de service aléatoire basé sur le type de service
const generateServiceTime = (serviceType) => {
    const timeRange = serviceTimeRanges[serviceType];
    return Math.floor(Math.random() * (timeRange.max - timeRange.min + 1)) + timeRange.min;
};

// Mettre à jour la longueur de la file d'attente
const updateQueueLength = async (queueKey, action = 'incr') => {
    if (action === 'incr') {
        return await incrAsync(queueKey);
    } else if (action === 'decr') {
        return await decrAsync(queueKey);
    }
};

// Traiter le prochain client dans la file d'attente
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
        const { clientId, timestamp, queueLength, hourOfDay, dayOfWeek, minuteOfDay } = JSON.parse(nextClientData);
        console.log(`[DEBUG] Client récupéré de la file d'attente: ${clientId} pour ${serviceType}`);

        const arrivalTime = await getAsync(`arrival_time:${clientId}`);
        const serviceStartTime = Date.now();
        const waitTimeInQueue = (serviceStartTime - arrivalTime) / 1000 / 60;

        console.log(`[INFO] Service commencé pour ${clientId} dans ${serviceType} à ${new Date(serviceStartTime).toLocaleTimeString()} (in_progress).`);

        monitoringService.logTimeSpentInQueue(clientId, serviceType, arrivalTime, serviceStartTime);
        await clientService.updateClientState(clientId, {
            serviceType,
            status: 'in_progress',
            serviceStartTime,
            waitTimeInQueue: waitTimeInQueue.toFixed(2),
            queueLength,
            hourOfDay,
            dayOfWeek,
            minuteOfDay
        });

        await lpushAsync(`wait_times:${serviceType}`, waitTimeInQueue.toFixed(2));
        await updateQueueLength(`queue_length:${serviceType}`, 'decr');

        const newInProgressCount = await incrAsync(inProgressKey);
        console.log(`[INFO] Nombre de clients en cours pour ${serviceType} : ${newInProgressCount}`);

        setTimeout(async () => {
            const serviceEndTime = Date.now();
            const timeSpent = (serviceEndTime - serviceStartTime) / 1000 / 60;

            console.log(`[INFO] Service terminé pour ${clientId} dans ${serviceType} à ${new Date(serviceEndTime).toLocaleTimeString()}. Temps passé : ${timeSpent.toFixed(2)} minutes (completed).`);

            await clientService.updateClientState(clientId, {
                serviceType,
                status: 'completed',
                timeSpent,
            });

            await monitoringService.logClientCompletion(clientId, serviceType, timeSpent, queueLength, hourOfDay, dayOfWeek, minuteOfDay);

            await decrAsync(inProgressKey);
            setTimeout(() => {
                processNextClient(serviceType);
            }, 1000);

        }, generateServiceTime(serviceType) * 60000);
    } else {
        console.log(`[DEBUG] Aucun client dans la file d'attente pour ${serviceType}`);
    }
};

// Simuler l'arrivée des clients
const simulateClientArrival = async () => {
    const serviceTypes = Object.keys(serviceArrivalRate);

    while (true) {
        if (activeClients >= maxConcurrentClients) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }

        activeClients++;
        const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
        const timeUntilNextArrival = poissonRandom(serviceArrivalRate[serviceType]) * 2000;

        setTimeout(async () => {
            const currentTime = Date.now();
            const timeSinceLastArrival = currentTime - lastArrivalTime;

            if (timeSinceLastArrival < minArrivalInterval) {
                await new Promise(resolve => setTimeout(resolve, minArrivalInterval - timeSinceLastArrival));
            }

            try {
                const clientId = `client${Math.floor(Math.random() * 1000)}`;
                lastArrivalTime = Date.now(); // Mettre à jour le dernier temps d'arrivée

                const queueLengthKey = `queue_length:${serviceType}`;
                let currentQueueLength = parseInt(await getAsync(queueLengthKey)) || 0;

                if (isNaN(currentQueueLength)) {
                    currentQueueLength = 0;
                    await setAsync(queueLengthKey, 0);
                }

                // Capture la longueur de la file d'attente avant d'ajouter le client
                const queueLengthAtArrival = currentQueueLength;

                // Capture l'heure de la journée, le jour de la semaine et la minute précise de l'arrivée
                const arrivalDate = moment(currentTime);
                const hourOfDay = arrivalDate.hours();
                const dayOfWeek = arrivalDate.day();
                const minuteOfDay = hourOfDay * 60 + arrivalDate.minutes();

                const updatedQueueLength = await updateQueueLength(queueLengthKey);
                const waitTime = calculateWaitTime(updatedQueueLength, serviceType);

                if (Math.random() < 0.1 && currentQueueLength > 0) {
                    monitoringService.logClientStateUpdate(clientId, serviceType, 'abandoned');
                    await updateQueueLength(queueLengthKey, 'decr');
                    console.log(`[INFO] État de la file d'attente pour ${serviceType} : ${updatedQueueLength - 1} clients.`);
                    return;
                }

                monitoringService.logClientArrival(clientId, serviceType, currentTime, waitTime);

                await lpushAsync(`queue:${serviceType}`, JSON.stringify({ clientId, timestamp: currentTime, queueLength: queueLengthAtArrival, hourOfDay, dayOfWeek, minuteOfDay }));
                await setAsync(`arrival_time:${clientId}`, currentTime);

                const inProgressKey = `in_progress:${serviceType}`;
                const inProgressCount = parseInt(await getAsync(inProgressKey)) || 0;

                if (inProgressCount === 0) {
                    processNextClient(serviceType);
                }

            } finally {
                activeClients--;
                simulateClientArrival();
            }

        }, timeUntilNextArrival);
    }
};

module.exports = {
    simulateClientArrival,
    serviceArrivalRate,
    poissonRandom,
    calculateWaitTime
};
