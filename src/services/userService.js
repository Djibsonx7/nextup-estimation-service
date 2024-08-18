// src/services/userService.js

const User = require('../models/userModel');

// Fonction pour récupérer un utilisateur par son ID
const getUserById = async (userId) => {
    try {
        const user = await User.findOne({ userId });
        if (user) {
            console.log(`User ${userId} retrieved from MongoDB.`);
        } else {
            console.log(`User ${userId} not found in MongoDB.`);
        }
        return user;
    } catch (error) {
        console.error('Error retrieving user from MongoDB:', error);
        return null;
    }
};

// Fonction pour récupérer tous les utilisateurs
const getAllUsers = async () => {
    try {
        const users = await User.find();
        console.log('All users retrieved from MongoDB.');
        return users;
    } catch (error) {
        console.error('Error retrieving all users from MongoDB:', error);
        return [];
    }
};

module.exports = { getUserById, getAllUsers };
