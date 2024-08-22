// src/services/monitoringService.js
// Mise à jour : Ajout du log pour le temps passé dans la file d'attente avant le début du service.

const redisClient = require('../config/redisConfig');
const QueueHistory = require('../models/queueHistoryModel');
const { promisify } = require('util');

// Promisify Redis methods
const getAsync = promisify(redisClient.get).bind(redisClient);
const lrangeAsync = promisify(redisClient.lrange).bind(redisClient);

const collectAndStoreData = async (serviceType, clientId, status, waitTime) => {
    try {
        const queueHistory = new QueueHistory({
            queueName: serviceType,
            userId: clientId,
            waitTime: waitTime,
            status: status
        });
        await queueHistory.save();
        console.log(`Client ${clientId} data for ${serviceType} stored in MongoDB with status: ${status}`);
    } catch (error) {
        console.error('Error in collectAndStoreData:', error);
    }
};

const generateReports = async (serviceType) => {
    try {
        const history = await QueueHistory.find({ queueName: serviceType }).sort({ timestamp: -1 });
        if (history.length > 0) {
            const report = {
                totalClients: history.length,
                averageWaitTime: history.reduce((acc, record) => acc + record.waitTime, 0) / history.length,
                completedClients: history.filter(record => record.status === 'completed').length,
                abandonedClients: history.filter(record => record.status === 'abandoned').length,
            };
            console.log(`Generated report for ${serviceType}:`, report);
            return report;
        } else {
            console.log(`No data available to generate report for ${serviceType}`);
            return null;
        }
    } catch (error) {
        console.error('Error in generateReports:', error);
        return null;
    }
};

const detectAnomalies = async (serviceType) => {
    try {
        const values = await lrangeAsync(`wait_times:${serviceType}`, 0, -1);
        if (values.length > 0) {
            const numericValues = values.map(value => parseInt(value, 10));
            const average = numericValues.reduce((acc, value) => acc + value, 0) / numericValues.length;
            const threshold = average * 1.5;
            const anomalies = numericValues.filter(value => value > threshold);
            if (anomalies.length > 0) {
                console.log(`Anomalies detected in ${serviceType}:`, anomalies);
                return anomalies;
            } else {
                console.log(`No anomalies detected in ${serviceType}`);
                return null;
            }
        } else {
            console.log(`No data available to detect anomalies for ${serviceType}`);
            return null;
        }
    } catch (error) {
        console.error('Error in detectAnomalies:', error);
        return null;
    }
};

const optimizeRealTime = async (serviceType) => {
    try {
        const report = await generateReports(serviceType);
        if (report) {
            if (report.abandonedClients > report.completedClients * 0.1) {
                await redisClient.decrby(`queue_length:${serviceType}`, 1);
                console.log(`Optimized queue length for ${serviceType} based on real-time data.`);
            }
        }
    } catch (error) {
        console.error('Error in optimizeRealTime:', error);
    }
};

const logClientCompletion = async (clientId, serviceType, timeSpent) => {
    console.log(`Client ${clientId} completed ${serviceType} in ${timeSpent} minutes.`);
    await collectAndStoreData(serviceType, clientId, 'completed', timeSpent);
};

const logWaitTimeAdjustment = (clientId, serviceType, originalWaitTime, adjustedWaitTime) => {
    console.log(`Adjusted wait time for client ${clientId} in ${serviceType}: original ${originalWaitTime} minutes, adjusted ${adjustedWaitTime} minutes.`);
};

const logClientStateUpdate = (clientId, serviceType, status) => {
    console.log(`Client ${clientId} in ${serviceType} status updated to: ${status}.`);
};

const logClientArrival = (clientId, serviceType, arrivalTime, waitTime) => {
    console.log(`Client ${clientId} arrived for ${serviceType} at ${new Date(arrivalTime).toLocaleTimeString()}. Estimated wait time: ${waitTime} minutes.`);
};

const logTimeSpentInQueue = (clientId, serviceType, arrivalTime, startTime) => {
    const waitTimeInQueue = ((startTime - arrivalTime) / 60000).toFixed(2); // Convert milliseconds to minutes
    console.log(`Client ${clientId} a passé ${waitTimeInQueue} minutes dans la file d'attente avant de commencer ${serviceType}.`);
};

module.exports = {
    collectAndStoreData,
    generateReports,
    detectAnomalies,
    optimizeRealTime,
    logClientCompletion,
    logWaitTimeAdjustment,
    logClientStateUpdate,
    logClientArrival,
    logTimeSpentInQueue // Export de la nouvelle fonction
};
