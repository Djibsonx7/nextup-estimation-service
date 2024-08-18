// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const { getUserById, getAllUsers } = require('../services/userService');

// Route pour obtenir un utilisateur par ID
router.get('/user/:userId', async (req, res) => {
    const user = await getUserById(req.params.userId);
    if (user) {
        res.status(200).json(user);
    } else {
        res.status(404).send('User not found');
    }
});

// Route pour obtenir tous les utilisateurs
router.get('/users', async (req, res) => {
    const users = await getAllUsers();
    if (users.length > 0) {
        res.status(200).json(users);
    } else {
        res.status(404).send('No users found');
    }
});

// Route pour insérer un utilisateur
router.post('/user', async (req, res) => {
    try {
        console.log('Request body:', req.body); // Log pour voir le contenu de la requête
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error); // Log d'erreur détaillé
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});

// Route pour mettre à jour un utilisateur par ID
router.put('/user/:userId', async (req, res) => {
    try {
        const updatedUser = await User.findOneAndUpdate(
            { userId: req.params.userId },
            req.body,
            { new: true } // Retourne le document mis à jour
        );

        if (updatedUser) {
            res.status(200).json(updatedUser);
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
});

// **NOUVELLE ROUTE POUR SUPPRIMER UN UTILISATEUR**
router.delete('/user/:userId', async (req, res) => {
    try {
        const deletedUser = await User.findOneAndDelete({ userId: req.params.userId });
        if (deletedUser) {
            res.status(200).json({ message: 'User deleted successfully' });
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
});

module.exports = router;
