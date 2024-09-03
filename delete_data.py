from pymongo import MongoClient

# Connexion à MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['nextup_estimation_db']
collection = db['queuehistories']

# Supprimer toutes les données de la collection
result = collection.delete_many({})
print(f"Nombre de documents supprimés : {result.deleted_count}")
