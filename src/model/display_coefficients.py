import pickle

# Charger le modèle depuis le fichier .pkl
with open('src/model/linear_regression_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Afficher les coefficients et l'ordonnée à l'origine
print("Intercept:", model.intercept_)
print("Coefficients:", model.coef_)
