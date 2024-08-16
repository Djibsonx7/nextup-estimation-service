require('dotenv').config();
const express = require('express');
const redisClient = require('./config/redisConfig');
const { connectDB } = require('./config/mongoConfig'); // Importation de connectDB

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

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = { app, redisClient, server }; // Exportation de server
