const estimationService = require('../src/services/estimationService');
const redisClient = require('../src/config/redisConfig');

describe('Estimation Service', () => {
    beforeAll(async () => {
        // Ajout de données de test dans Redis avant de commencer les tests
        await redisClient.set('estimate:queue1', '15');
        await redisClient.set('estimate:queue1:user1', '10');
    });

    afterAll(async () => {
        // Nettoyage des données après les tests
        await redisClient.del('estimate:queue1');
        await redisClient.del('estimate:queue1:user1');
        redisClient.quit();
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
