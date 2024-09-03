//*********src/services/PredictionService.js***********

const fs = require('fs');
const path = require('path');
const pickle = require('pickle');
const { execFile } = require('child_process');

// Charger le modèle de prédiction
const loadModel = () => {
    const modelPath = path.join(__dirname, 'linear_regression_model.pkl');
    const modelData = fs.readFileSync(modelPath);
    return pickle.loads(modelData);
};

// Prédictions de Temps d'Attente
const getPrediction = async (features) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'predict.py');
        const featuresStr = JSON.stringify(features);

        execFile('python', [scriptPath, featuresStr], (error, stdout, stderr) => {
            if (error) {
                return reject(`Error executing script: ${error.message}`);
            }

            const prediction = parseFloat(stdout.trim());
            if (isNaN(prediction)) {
                return reject('Invalid prediction value received from Python script');
            }

            resolve(prediction);
        });
    });
};

// Évaluation du Modèle (à ajouter si nécessaire)
const evaluateModel = (X_test, y_test) => {
    const model = loadModel();
    return model.score(X_test, y_test);
};

module.exports = {
    getPrediction,
    evaluateModel
};
