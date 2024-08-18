// src/models/queueHistoryModel.js

const mongoose = require('mongoose');

const queueHistorySchema = new mongoose.Schema({
    queueName: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    waitTime: { type: Number, required: true },
    userId: { type: String }
});

const QueueHistory = mongoose.model('QueueHistory', queueHistorySchema);

module.exports = QueueHistory;
