// src/models/queueHistoryModel.js

const mongoose = require('mongoose');

const queueHistorySchema = new mongoose.Schema({
    queueName: { type: String, required: true }, // Nom de la file d'attente
    timestamp: { type: Date, default: Date.now }, // Horodatage de l'événement
    waitTime: { type: Number, required: true }, // Temps d'attente pour le client
    userId: { type: String }, // Identifiant du client
    status: { 
        type: String, 
        enum: ['en_cours', 'termine', 'annule', 'in_progress', 'completed', 'abandoned'], // Ajout des valeurs anglaises
        required: true 
    }, // Statut du client (en cours, terminé, annulé, in progress, completed, abandoned)
    timeSpent: { type: Number, required: false } // Temps passé pour le service (optionnel, ajouté lorsque le service est terminé)
});

const QueueHistory = mongoose.model('QueueHistory', queueHistorySchema);

module.exports = QueueHistory;
