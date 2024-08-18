// src/services/queueHistoryService.js

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

module.exports = { getQueueHistory, getAllQueueHistories };
