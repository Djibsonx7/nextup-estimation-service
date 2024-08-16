// src/models/estimationModel.js
const mongoose = require('mongoose');

const estimationSchema = new mongoose.Schema({
    queueName: {
        type: String,
        required: true,
        unique: true
    },
    estimate: {
        type: Number,
        required: true
    }
}, {
    timestamps: true // Ajoute createdAt et updatedAt
});

const Estimation = mongoose.model('Estimation', estimationSchema);

module.exports = Estimation;
