import sys
import json
import pickle
import numpy as np

# Charger le modèle
with open('src/model/linear_regression_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Obtenir les données d'entrée depuis les arguments
input_features = json.loads(sys.argv[1])

# Convertir les données d'entrée en numpy array
features = np.array(input_features).reshape(1, -1)

# Faire une prédiction
prediction = model.predict(features)

# Retourner la prédiction
print(prediction[0])
