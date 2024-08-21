// src/services/estimationService.js

const redisClient = require('../config/redisConfig');
const config = require('../config/config');
const { promisify } = require('util');
const { execFile } = require('child_process');
const path = require('path');
const simulationService = require('./simulationService');

const lrangeAsync = promisify(redisClient.lrange).bind(redisClient);

const getPrediction = async (features) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../model/predict.py');
        const featuresStr = JSON.stringify(features);

        execFile('python', [scriptPath, featuresStr], (error, stdout, stderr) => {
            if (error) {
                return reject(`Error executing script: ${error.message}`);
            }
            if (stderr) {
                console.error('Python script stderr:', stderr);
            }

            const prediction = parseFloat(stdout.trim());
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
        const values = await lrangeAsync(key, 0, 9);

        if (!Array.isArray(values) || values.length === 0) {
            return null;
        }

        const numericValues = values.map(value => parseInt(value, 10));
        const sum = numericValues.reduce((acc, value) => acc + value, 0);
        return Math.round(sum / numericValues.length);
    } catch (error) {
        console.error('Error in getMovingAverage:', error);
        return null;
    }
};

const getEstimate = async (queueName) => {
    try {
        const estimate = await promisify(redisClient.get).bind(redisClient)(`estimate:${queueName}`);
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

// Export des fonctions de estimationService.js
module.exports = {
    getMovingAverage,
    getEstimate,
    getPersonalizedEstimate,
    getPrediction,
    simulateClientArrival: simulationService.simulateClientArrival,
};
