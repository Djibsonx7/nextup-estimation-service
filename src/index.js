// src/index.js
// Mise à jour : Ajout des routes pour Queue History et User
// et ajout de la route pour la simulation de l'arrivée des clients.

require('dotenv').config();
const express = require('express');
const redisClient = require('./config/redisConfig');
const { connectDB } = require('./config/mongoConfig'); // Importation de connectDB
const { simulateClientArrival } = require('./services/estimationService'); // Importation de la simulation des arrivées clients

const app = express();
const port = process.env.PORT || 3000;

// Connexion à MongoDB
connectDB();

// Middleware pour JSON
app.use(express.json());

// Test route pour vérifier que le service fonctionne
app.get('/', (req, res) => {
    res.send('nextup-estimation-service is running!');
});

// Inclure les routes d'estimation
const estimationRoutes = require('./routes/estimationRoutes');
app.use('/api/estimation', estimationRoutes);

// Inclure les routes pour Queue History
const queueHistoryRoutes = require('./routes/queueHistoryRoutes');
app.use('/api', queueHistoryRoutes);

// Inclure les routes pour User
const userRoutes = require('./routes/userRoutes');
app.use('/api', userRoutes);

// Lancer la simulation des arrivées clients
simulateClientArrival();

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = { app, redisClient, server }; // Exportation de server
