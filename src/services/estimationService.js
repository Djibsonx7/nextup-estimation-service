const redisClient = require('../config/redisConfig');
const { promisify } = require('util');

const getAsync = promisify(redisClient.get).bind(redisClient);

const getEstimate = async (queueName) => {
    try {
        const estimate = await getAsync(`estimate:${queueName}`);
        console.log(`Estimate retrieved for ${queueName}:`, estimate);  // Ajout du log ici
        return estimate !== null ? parseInt(estimate, 10) : null;
    } catch (error) {
        console.error('Error retrieving estimate from Redis:', error);
        return null;
    }
};

const getPersonalizedEstimate = async (queueName, userId) => {
    try {
        const personalizedEstimate = await getAsync(`estimate:${queueName}:${userId}`);
        console.log(`Personalized estimate retrieved for ${queueName}:${userId}:`, personalizedEstimate);  // Ajout du log ici
        return personalizedEstimate !== null ? parseInt(personalizedEstimate, 10) : null;
    } catch (error) {
        console.error('Error retrieving personalized estimate from Redis:', error);
        return null;
    }
};

module.exports = {
    getEstimate,
    getPersonalizedEstimate
};
