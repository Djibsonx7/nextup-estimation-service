// src/services/queueHistoryService.js
// Mise à jour : Stockage à la fois du temps d'attente (waitTimeInQueue), du temps de traitement (timeSpent),
// et de la longueur de la file d'attente (queueLength) dans MongoDB.

const redisClient = require('../config/redisConfig');
const QueueHistory = require('../models/queueHistoryModel');

// Fonction pour récupérer l'historique d'une file d'attente
const getQueueHistory = async (queueName) => {
    try {
        const history = await QueueHistory.find({ queueName }).sort({ timestamp: -1 });
        console.log(`History for ${queueName} retrieved from MongoDB.`);
        return history;
    } catch (error) {
        console.error('Error retrieving queue history from MongoDB:', error);
        return [];
    }
};

// Fonction pour récupérer l'historique complet
const getAllQueueHistories = async () => {
    try {
        const histories = await QueueHistory.find().sort({ timestamp: -1 });
        console.log(`All queue histories retrieved from MongoDB.`);
        return histories;
    } catch (error) {
        console.error('Error retrieving all queue histories from MongoDB:', error);
        return [];
    }
};

// Fonction pour enregistrer l'état d'un client dans l'historique
const saveClientState = async (queueName, clientId, status) => {
    try {
        const waitTimeInQueue = await redisClient.get(`wait_time_in_queue:${clientId}`); // Récupérer le temps d'attente
        const timeSpent = await redisClient.get(`time_spent:${clientId}`); // Récupérer le temps de traitement
        const queueLength = await redisClient.get(`queue_length:${clientId}`); // Récupérer la longueur de la file d'attente

        const newHistory = new QueueHistory({
            queueName,
            userId: clientId,
            status,
            waitTime: waitTimeInQueue, // Utiliser le temps d'attente
            timeSpent: timeSpent, // Stocker le temps de traitement
            queueLength: queueLength // Stocker la longueur de la file d'attente
        });

        await newHistory.save();
        console.log(`Client state saved for ${clientId} in ${queueName} with status ${status}, waitTime ${waitTimeInQueue} minutes, timeSpent ${timeSpent} minutes, and queueLength ${queueLength}.`);

        // Enregistrer le temps d'attente et le temps de traitement dans Redis pour le calcul de la moyenne mobile
        await redisClient.lpush(`wait_times:${queueName}`, waitTimeInQueue);
        await redisClient.lpush(`time_spent:${queueName}`, timeSpent);
        console.log(`Wait time (${waitTimeInQueue} minutes) and time spent (${timeSpent} minutes) recorded for ${clientId} in Redis for service ${queueName}.`);

    } catch (error) {
        console.error('Error saving client state to MongoDB:', error);
    }
};

module.exports = { 
    getQueueHistory, 
    getAllQueueHistories,
    saveClientState  // Export de la nouvelle fonction saveClientState
};
