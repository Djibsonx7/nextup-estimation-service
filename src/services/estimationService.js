const redisClient = require('../config/redisConfig');
const { promisify } = require('util');

const lrangeAsync = promisify(redisClient.lrange).bind(redisClient);

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
};
