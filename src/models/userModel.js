// src/models/userModel.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String },
    preferences: { type: Object }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
