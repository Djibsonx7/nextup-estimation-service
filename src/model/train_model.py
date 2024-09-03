import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
import pickle
from pymongo import MongoClient

# Connexion à MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['nextup_estimation_db']
collection = db['queuehistories']

# Vérifier la connexion et afficher quelques documents
print("Vérification de la connexion à MongoDB...")
print("Nombre de documents dans la collection :", collection.count_documents({}))
print("Exemple de documents :", list(collection.find().limit(5)))

# Charger les données depuis MongoDB
data = pd.DataFrame(list(collection.find()))

# Afficher les colonnes du DataFrame
print("Colonnes du DataFrame :", data.columns.tolist())

# Supprimer les lignes contenant des NaN
data = data.dropna()

# Convertir le type de service en variables indicatrices (one-hot encoding)
data = pd.get_dummies(data, columns=['queueName'])

# Sélectionner les caractéristiques et la variable cible
X = data[['queueLength', 'dayOfWeek', 'hourOfDay', 'minuteOfDay'] + [col for col in data.columns if col.startswith('queueName_')]]
y = data['waitTime']

# Diviser les données en ensemble d'entraînement et de test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Entraîner un modèle de régression linéaire
model = LinearRegression()
model.fit(X_train, y_train)

# Évaluer le modèle
score = model.score(X_test, y_test)
print(f'R^2 Score: {score}')

# Sauvegarder le modèle et les noms des caractéristiques
with open('src/model/linear_regression_model.pkl', 'wb') as f:
    pickle.dump((model, X.columns.tolist()), f)

print("Modèle entraîné et sauvegardé sous 'src/model/linear_regression_model.pkl'.")
