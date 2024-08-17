// src/routes/estimationRoutes.js
const express = require('express');
const router = express.Router();
const estimationController = require('../controllers/estimationController');

// Route pour obtenir une estimation de la file d'attente
router.get('/estimate/:queueName', estimationController.getEstimate);

// Route pour obtenir une estimation personnalisée (par exemple, en fonction de l'utilisateur)
router.get('/estimate/:queueName/:userId', estimationController.getPersonalizedEstimate);

// Route pour obtenir la moyenne glissante des temps d'attente
router.get('/moving-average/:queueName', estimationController.getMovingAverage);

module.exports = router;
