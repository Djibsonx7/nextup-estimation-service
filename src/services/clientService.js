// src/services/clientService.js

const redisClient = require('../config/redisConfig');
const monitoringService = require('./monitoringService');

// Fonction pour mettre à jour l'état d'un client dans Redis
const updateClientState = async (clientId, stateInfo) => {
    try {
        // Mise à jour de l'état du client dans Redis
        await redisClient.set(`client:${clientId}:status`, stateInfo.status);

        // Log détaillé de l'état du client
        await monitoringService.logClientStateUpdate(clientId, stateInfo.serviceType, stateInfo.status);

        // Optionnel : Si vous voulez ajouter des informations supplémentaires dans Redis
        if (stateInfo.arrivalTime) {
            await redisClient.set(`client:${clientId}:arrivalTime`, stateInfo.arrivalTime);
        }
        if (stateInfo.completionTime) {
            await redisClient.set(`client:${clientId}:completionTime`, stateInfo.completionTime);
        }
        if (stateInfo.timeSpent) {
            await redisClient.set(`client:${clientId}:timeSpent`, stateInfo.timeSpent);
        }

        // Sauvegarde dans MongoDB uniquement pour le statut "completed"
        if (stateInfo.status === 'completed') {
            await saveClientStateToHistory({
                clientId,
                serviceType: stateInfo.serviceType,
                status: stateInfo.status,
                waitTime: stateInfo.waitTime,
                timeSpent: stateInfo.timeSpent
            });
        }

    } catch (error) {
        console.error(`Error updating client state for ${clientId}:`, error);
    }
};

// Fonction pour sauvegarder l'état du client dans l'historique MongoDB
const saveClientStateToHistory = async (stateInfo) => {
    try {
        await monitoringService.collectAndStoreData(stateInfo.serviceType, stateInfo.clientId, stateInfo.status, stateInfo.timeSpent);
    } catch (error) {
        console.error(`Error saving client state to history for ${stateInfo.clientId}:`, error);
    }
};

module.exports = {
    updateClientState,
    saveClientStateToHistory
};
