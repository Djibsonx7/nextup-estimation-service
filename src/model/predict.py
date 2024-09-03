import sys
import json
import pickle
import numpy as np
import pandas as pd

# Charger le modèle et les noms des caractéristiques
with open('src/model/linear_regression_model.pkl', 'rb') as f:
    model, feature_names = pickle.load(f)

# Obtenir les données d'entrée depuis les arguments
input_features = json.loads(sys.argv[1])

# Convertir les données d'entrée en DataFrame avec noms de caractéristiques
features = pd.DataFrame([input_features], columns=feature_names)

# Faire une prédiction
prediction = model.predict(features)

# Retourner la prédiction
print(prediction[0])
