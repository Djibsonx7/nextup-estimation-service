import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
import pickle

# Générer des données simulées
np.random.seed(42)

# Caractéristiques
n_samples = 1000
n_clients = np.random.randint(1, 50, size=n_samples)
day_of_week = np.random.randint(0, 7, size=n_samples)  # 0 = Lundi, 6 = Dimanche
hour_of_day = np.random.randint(8, 18, size=n_samples)  # Heures d'ouverture

# Temps d'attente simulé (en minutes)
waiting_time = 5 * n_clients + 2 * day_of_week + 3 * hour_of_day + np.random.normal(0, 5, size=n_samples)

# Créer un DataFrame
data = pd.DataFrame({
    'n_clients': n_clients,
    'day_of_week': day_of_week,
    'hour_of_day': hour_of_day,
    'waiting_time': waiting_time
})

# Séparer les données en caractéristiques et label
X = data[['n_clients', 'day_of_week', 'hour_of_day']]
y = data['waiting_time']

# Diviser les données en ensemble d'entraînement et de test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Entraîner un modèle de régression linéaire
model = LinearRegression()
model.fit(X_train, y_train)

# Évaluer le modèle
score = model.score(X_test, y_test)
print(f'R^2 Score: {score}')

# Sauvegarder le modèle
with open('src/model/linear_regression_model.pkl', 'wb') as f:
    pickle.dump(model, f)

print("Modèle entraîné et sauvegardé sous 'src/model/linear_regression_model.pkl'.")
