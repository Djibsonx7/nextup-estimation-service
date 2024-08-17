// estimationService.test.js
// Mise à jour : Ajout de logs supplémentaires pour diagnostiquer les problèmes d'insertion et de récupération dans Redis

const estimationService = require('../src/services/estimationService');
const redisClient = require('../src/config/redisConfig');

describe('Estimation Service', () => {
    beforeAll(async () => {
        // Nettoyage des anciennes données
        await redisClient.del('wait_times:queue1');  // Assurez-vous que la clé est vide
        
        // Ajout des valeurs de test dans Redis
        const lpushResult = await redisClient.lpush('wait_times:queue1', 50, 40, 30, 20, 10);  
        console.log('Result of lpush:', lpushResult);  // Affiche le résultat de l'insertion
        
        // Vérification des données insérées
        const values = await redisClient.lrange('wait_times:queue1', 0, -1);
        console.log('Values in wait_times:queue1 after setup:', values);  // Affiche les valeurs après insertion

        await redisClient.set('estimate:queue1', '15');
        await redisClient.set('estimate:queue1:user1', '10');
    });

    afterAll(async () => {
        // Nettoyage des données après les tests
        await redisClient.del('wait_times:queue1');
        await redisClient.del('estimate:queue1');
        await redisClient.del('estimate:queue1:user1');
        redisClient.quit();
    });

    test('getMovingAverage should return correct average for queue1', async () => {
        const estimate = await estimationService.getMovingAverage('queue1');
        expect(estimate).toBe(30);  // La moyenne de 10, 20, 30, 40, 50
    });

    test('getEstimate should return correct estimate for queue1', async () => {
        const estimate = await estimationService.getEstimate('queue1');
        expect(estimate).toBe(15);
    });

    test('getPersonalizedEstimate should return correct personalized estimate for queue1 and user1', async () => {
        const personalizedEstimate = await estimationService.getPersonalizedEstimate('queue1', 'user1');
        expect(personalizedEstimate).toBe(10);
    });

    test('getEstimate should return null for nonexistent queue', async () => {
        const estimate = await estimationService.getEstimate('nonexistentQueue');
        expect(estimate).toBeNull();
    });

    test('getPersonalizedEstimate should return null for nonexistent user in queue', async () => {
        const personalizedEstimate = await estimationService.getPersonalizedEstimate('queue1', 'nonexistentUser');
        expect(personalizedEstimate).toBeNull();
    });
});
