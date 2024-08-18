// src/routes/estimationRoutes.js
// Mise à jour : Ajout de la route POST pour la prédiction utilisant le modèle de régression linéaire

const express = require('express');
const router = express.Router();
const estimationController = require('../controllers/estimationController');
const { getPrediction } = require('../services/estimationService'); // Import de la méthode getPrediction

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

module.exports = router;
