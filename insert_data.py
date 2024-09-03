from pymongo import MongoClient

# Connexion à MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['nextup_estimation_db']
collection = db['queuehistories']

# Exemple de nouvelles données à insérer
data = [
    {
        "queueName": "deposit",
        "userId": "client1",
        "waitTime": 10.5,
        "timeSpent": 5.0,
        "queueLength": 3,
        "hourOfDay": 14,
        "dayOfWeek": 2,
        "status": "completed"
    },
    {
        "queueName": "withdrawal",
        "userId": "client2",
        "waitTime": 8.0,
        "timeSpent": 4.0,
        "queueLength": 2,
        "hourOfDay": 10,
        "dayOfWeek": 3,
        "status": "completed"
    }
]

# Insérer les nouvelles données dans la collection
collection.insert_many(data)
print("Nouvelles données insérées avec succès dans la collection 'queuehistories'.")
