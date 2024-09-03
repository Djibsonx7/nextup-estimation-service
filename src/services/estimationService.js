// src/services/estimationService.js
// Ce fichier contient des fonctions pour estimer les temps d'attente en utilisant les moyennes mobiles exponentielles (EMA),
// des prédictions issues d'un modèle d'apprentissage automatique, et des estimations personnalisées.

const redisClient = require('../config/redisConfig');
const config = require('../config/config');
const { promisify } = require('util');
const simulationService = require('./simulationService');

const lrangeAsync = promisify(redisClient.lrange).bind(redisClient);

// Fonction pour filtrer les valeurs anormales avec l'écart interquartile (IQR)
const filterOutliers = (data) => {
    const sortedData = data.slice().sort((a, b) => a - b);
    const q1 = sortedData[Math.floor(sortedData.length * 0.25)];
    const q3 = sortedData[Math.floor(sortedData.length * 0.75)];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return data.filter(x => x >= lowerBound && x <= upperBound);
};

// Fonction pour calculer l'Exponential Moving Average (EMA)
const getEMA = async (queueName, period = 5, keyType = 'wait_times') => {
    const key = `${keyType}:${queueName}`;
    const threshold = 1;

    try {
        const values = await lrangeAsync(key, 0, period - 1);

        if (!Array.isArray(values) || values.length === 0) {
            return null;
        }

        const numericValues = values.map(value => parseInt(value, 10));
        const filteredValues = filterOutliers(numericValues);

        if (filteredValues.length === 0) {
            return null;
        }

        const k = 2 / (filteredValues.length + 1);
        let ema = filteredValues[0];

        for (let i = 1; i < filteredValues.length; i++) {
            const adjustedSmoothingFactor = filteredValues[i] < threshold ? k * 0.5 : k;
            ema = filteredValues[i] * adjustedSmoothingFactor + ema * (1 - adjustedSmoothingFactor);
        }

        return Math.round(ema);
    } catch (error) {
        console.error('Error in getEMA:', error);
        return null;
    }
};

// Fonction pour calculer une estimation combinée des EMA
const getCombinedEMA = async (queueName) => {
    try {
        const emaWaitTime = await getEMA(queueName, 5, 'wait_times');
        const emaServiceTime = await getEMA(queueName, 5, 'timeSpent');

        if (emaWaitTime === null || emaServiceTime === null) {
            return null;
        }

        const combinedEstimate = (emaWaitTime + emaServiceTime) / 2;
        return Math.round(combinedEstimate);
    } catch (error) {
        console.error('Error in getCombinedEMA:', error);
        return null;
    }
};

// Fonction pour obtenir l'estimation actuelle pour une file
const getEstimate = async (queueName) => {
    try {
        const estimate = await getCombinedEMA(queueName);
        const arrivalTime = await promisify(redisClient.get).bind(redisClient)(`arrival_time:${queueName}`);

        if (!estimate) {
            return null;
        }

        if (!arrivalTime) {
            return parseInt(estimate, 10);
        }

        const currentTime = Date.now();
        const elapsedTime = Math.floor((currentTime - arrivalTime) / 60000);
        const adjustedEstimate = Math.max(parseInt(estimate, 10) - elapsedTime, 0);

        return adjustedEstimate;
    } catch (error) {
        console.error('Error retrieving or adjusting estimate from Redis:', error);
        return null;
    }
};

// Fonction pour obtenir une estimation personnalisée pour un utilisateur
const getPersonalizedEstimate = async (queueName, userId) => {
    if (!config.enablePersonalizedEstimates) {
        return null;
    }

    try {
        const personalizedEstimate = await promisify(redisClient.get).bind(redisClient)(`estimate:${queueName}:${userId}`);
        return personalizedEstimate !== null ? parseInt(personalizedEstimate, 10) : null;
    } catch (error) {
        console.error('Error retrieving personalized estimate from Redis:', error);
        return null;
    }
};

module.exports = {
    getEMA,
    getCombinedEMA,
    getEstimate,
    getPersonalizedEstimate,
    simulateClientArrival: simulationService.simulateClientArrival,
};

