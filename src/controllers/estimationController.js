// src/controllers/estimationController.js
const estimationService = require('../services/estimationService');

const getEstimate = async (req, res) => {
    const { queueName } = req.params;

    try {
        const estimate = await estimationService.getEstimate(queueName);
        if (estimate !== null) {
            res.status(200).json({ queueName, estimate });
        } else {
            res.status(404).json({ message: `No estimate found for ${queueName}` });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving estimate', error });
    }
};

const getPersonalizedEstimate = async (req, res) => {
    const { queueName, userId } = req.params;

    try {
        const personalizedEstimate = await estimationService.getPersonalizedEstimate(queueName, userId);
        if (personalizedEstimate !== null) {
            res.status(200).json({ queueName, userId, estimate: personalizedEstimate });
        } else {
            res.status(404).json({ message: `No personalized estimate found for ${userId} in ${queueName}` });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving personalized estimate', error });
    }
};

// Nouvelle fonction pour la moyenne glissante
const getMovingAverage = async (req, res) => {
    const { queueName } = req.params;

    try {
        const movingAverage = await estimationService.getMovingAverage(queueName);
        if (movingAverage !== null) {
            res.status(200).json({ queueName, movingAverage });
        } else {
            res.status(404).json({ message: `No data found for ${queueName}` });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving moving average', error });
    }
};

module.exports = {
    getEstimate,
    getPersonalizedEstimate,
    getMovingAverage,  // Assurez-vous d'exporter cette fonction
};
