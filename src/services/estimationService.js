// src/services/estimationService.js
// Mise à jour : Ajout de logs supplémentaires pour capturer la sortie du script Python et assurer que la prédiction est correctement renvoyée dans la réponse HTTP.

const redisClient = require('../config/redisConfig');
const { promisify } = require('util');
const { execFile } = require('child_process');
const path = require('path');

const lrangeAsync = promisify(redisClient.lrange).bind(redisClient);

// Fonction pour charger le modèle Python et faire une prédiction
const getPrediction = async (features) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../model/predict.py'); // Chemin vers le script Python
        const featuresStr = JSON.stringify(features); // Conversion des caractéristiques en chaîne JSON

        console.log('Running Python script with features:', featuresStr); // Log des caractéristiques

        execFile('python', [scriptPath, featuresStr], (error, stdout, stderr) => { // Utilisation de "python" pour exécuter le script
            if (error) {
                console.error('Error executing Python script:', error); // Log des erreurs
                return reject(`Error executing script: ${error.message}`);
            }
            if (stderr) {
                console.error('Python script stderr:', stderr); // Log de la sortie d'erreur du script Python
            }

            console.log('Python script output (before parsing):', stdout); // Log de la sortie du script Python avant traitement

            // Supposons que la sortie soit un nombre
            const prediction = parseFloat(stdout.trim());

            // Log pour vérifier le type et la valeur
            console.log('Parsed prediction:', prediction, 'Type:', typeof prediction);

            if (isNaN(prediction)) {
                return reject('Invalid prediction value received from Python script');
            }

            resolve(prediction);
        });
    });
};

const getMovingAverage = async (queueName) => {
    const key = `wait_times:${queueName}`;
    try {
        const values = await lrangeAsync(key, 0, 9);  // Récupère les 10 dernières valeurs
        console.log('Values retrieved from Redis:', values);  // Log des valeurs récupérées

        if (!Array.isArray(values) || values.length === 0) {
            console.log('No valid data found for queueName:', queueName);
            return null;  // Retourne null si aucune donnée n'est disponible
        }

        // Convertir les valeurs en tableau de nombres
        const numericValues = values.map(value => parseInt(value, 10));
        console.log('Numeric values after conversion:', numericValues);  // Log après conversion

        const sum = numericValues.reduce((acc, value) => acc + value, 0);
        return Math.round(sum / numericValues.length);  // Retourne la moyenne arrondie
    } catch (error) {
        console.error('Error in getMovingAverage:', error);
        return null;
    }
};

const getEstimate = async (queueName) => {
    try {
        const estimate = await promisify(redisClient.get).bind(redisClient)(`estimate:${queueName}`);
        console.log(`Estimate retrieved for ${queueName}:`, estimate);
        return estimate !== null ? parseInt(estimate, 10) : null;
    } catch (error) {
        console.error('Error retrieving estimate from Redis:', error);
        return null;
    }
};

const getPersonalizedEstimate = async (queueName, userId) => {
    try {
        const personalizedEstimate = await promisify(redisClient.get).bind(redisClient)(`estimate:${queueName}:${userId}`);
        console.log(`Personalized estimate retrieved for ${queueName}:${userId}:`, personalizedEstimate);
        return personalizedEstimate !== null ? parseInt(personalizedEstimate, 10) : null;
    } catch (error) {
        console.error('Error retrieving personalized estimate from Redis:', error);
        return null;
    }
};

module.exports = {
    getMovingAverage,
    getEstimate,
    getPersonalizedEstimate,
    getPrediction,  // Export de la nouvelle fonction getPrediction
};
