// src/routes/queueHistoryRoutes.js
const express = require('express');
const router = express.Router();
const QueueHistory = require('../models/queueHistoryModel');
const { getQueueHistory, getAllQueueHistories } = require('../services/queueHistoryService');

// Route pour obtenir l'historique d'une file d'attente par nom de file
router.get('/queue-history/:queueName', async (req, res) => {
    const history = await getQueueHistory(req.params.queueName);
    if (history) {
        res.status(200).json(history);
    } else {
        res.status(404).send('Queue history not found');
    }
});

// Route pour obtenir l'historique de toutes les files d'attente
router.get('/queue-histories', async (req, res) => {
    const histories = await getAllQueueHistories();
    if (histories.length > 0) {
        res.status(200).json(histories);
    } else {
        res.status(404).send('No queue histories found');
    }
});

// Route pour insérer l'historique d'une file d'attente
router.post('/queue-history', async (req, res) => {
    try {
        console.log('Request body:', req.body); // Log pour voir le contenu de la requête
        const newQueueHistory = new QueueHistory(req.body);
        await newQueueHistory.save();
        res.status(201).json(newQueueHistory);
    } catch (error) {
        console.error('Error creating queue history:', error); // Log d'erreur détaillé
        res.status(500).json({ message: 'Error creating queue history', error: error.message });
    }
});

// Route pour mettre à jour l'historique d'une file d'attente par nom de file
router.put('/queue-history/:queueName', async (req, res) => {
    try {
        const updatedQueueHistory = await QueueHistory.findOneAndUpdate(
            { queueName: req.params.queueName },
            req.body,
            { new: true } // Retourne le document mis à jour
        );

        if (updatedQueueHistory) {
            res.status(200).json(updatedQueueHistory);
        } else {
            res.status(404).send('Queue history not found');
        }
    } catch (error) {
        console.error('Error updating queue history:', error);
        res.status(500).json({ message: 'Error updating queue history', error: error.message });
    }
});

// **NOUVELLE ROUTE POUR SUPPRIMER UN HISTORIQUE DE FILE D'ATTENTE**
router.delete('/queue-history/:queueName', async (req, res) => {
    try {
        const deletedQueueHistory = await QueueHistory.findOneAndDelete({ queueName: req.params.queueName });
        if (deletedQueueHistory) {
            res.status(200).json({ message: 'Queue history deleted successfully' });
        } else {
            res.status(404).send('Queue history not found');
        }
    } catch (error) {
        console.error('Error deleting queue history:', error);
        res.status(500).json({ message: 'Error deleting queue history', error: error.message });
    }
});

module.exports = router;
