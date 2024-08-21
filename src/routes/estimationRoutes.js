// src/routes/estimationRoutes.js

const express = require('express');
const router = express.Router();
const estimationController = require('../controllers/estimationController');
const { getPrediction, simulateClientArrival } = require('../services/estimationService');
const redisClient = require('../config/redisConfig');
const { promisify } = require('util');  // Ajout de promisify pour Redis

// Promisify Redis GET method
const getAsync = promisify(redisClient.get).bind(redisClient);

// Route pour obtenir une estimation de la file d'attente
router.get('/estimate/:queueName', estimationController.getEstimate);

// Route pour obtenir une estimation personnalisée (par exemple, en fonction de l'utilisateur)
router.get('/estimate/:queueName/:userId', estimationController.getPersonalizedEstimate);

// Route pour obtenir la moyenne glissante des temps d'attente
router.get('/moving-average/:queueName', estimationController.getMovingAverage);

// Route POST pour obtenir une prédiction basée sur le modèle de régression linéaire
router.post('/prediction', async (req, res) => {
    try {
        const features = req.body.features;  // Assurez-vous que les caractéristiques sont envoyées dans le corps de la requête
        const prediction = await getPrediction(features);
        res.json({ prediction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route GET pour lancer la simulation de l'arrivée des clients
router.get('/simulate', async (req, res) => {
    try {
        await simulateClientArrival();
        res.status(200).send('Client arrival simulated.');
    } catch (error) {
        console.error('Error simulating client arrival:', error);
        res.status(500).send('Error simulating client arrival.');
    }
});

// Route GET pour récupérer la longueur de la file d'attente
router.get('/queue-length/:queueName', async (req, res) => {
    const { queueName } = req.params;
    try {
        const queueLength = await getAsync(`queue_length:${queueName}`);
        res.json({ queueLength: parseInt(queueLength, 10) });
    } catch (error) {
        console.error('Error fetching queue length:', error);
        res.status(500).json({ error: 'Error fetching queue length' });
    }
});

module.exports = router;
