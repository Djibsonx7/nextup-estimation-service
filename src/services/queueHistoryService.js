// src/services/queueHistoryService.js
// Mise à jour : Ajout de la fonction saveClientState pour enregistrer les états des clients et le temps passé.

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
const saveClientState = async (queueName, clientId, status, timeSpent) => {
    try {
        const newHistory = new QueueHistory({
            queueName,
            userId: clientId,
            status,
            timeSpent,
        });
        await newHistory.save();
        console.log(`Client state saved for ${clientId} in ${queueName} with status ${status} and timeSpent ${timeSpent} minutes.`);
    } catch (error) {
        console.error('Error saving client state to MongoDB:', error);
    }
};

module.exports = { 
    getQueueHistory, 
    getAllQueueHistories,
    saveClientState  // Export de la nouvelle fonction saveClientState
};
