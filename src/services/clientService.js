// src/services/clientService.js
// Mise à jour : Ajout de vérifications pour garantir que timeSpent est bien enregistré dans Redis
// et ajout de l'enregistrement de timeSpent dans une liste Redis pour les calculs futurs.

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

            // Ajout dans une liste Redis pour calculer la moyenne mobile sur le temps de service
            await redisClient.lpush(`timeSpent:${stateInfo.serviceType}`, stateInfo.timeSpent);
            console.log(`Time spent (${stateInfo.timeSpent} minutes) enregistré pour ${clientId} dans le service ${stateInfo.serviceType}`);
        }

        // On ne sauvegarde plus directement dans MongoDB ici pour éviter les doublons

    } catch (error) {
        console.error(`Error updating client state for ${clientId}:`, error);
    }
};

module.exports = {
    updateClientState
};
