const request = require('supertest');
const { app, server } = require('../src/index'); // Importation de server
const { closeDB } = require('../src/config/mongoConfig'); // Importation de closeDB
const redisClient = require('../src/config/redisConfig');

describe('Estimation Routes', () => {
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
        await closeDB(); // Fermer la connexion MongoDB après les tests
        server.close(); // Fermer le serveur après les tests
    });

    test('GET /api/estimation/estimate/queue1 - should return estimate for queue1', async () => {
        const response = await request(app).get('/api/estimation/estimate/queue1');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            queueName: 'queue1',
            estimate: 15
        });
    });

    test('GET /api/estimation/estimate/queue1/user1 - should return personalized estimate for queue1', async () => {
        const response = await request(app).get('/api/estimation/estimate/queue1/user1');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            queueName: 'queue1',
            userId: 'user1',
            estimate: 10
        });
    });

    test('GET /api/estimation/estimate/nonexistentQueue - should return 404 for nonexistent queue', async () => {
        const response = await request(app).get('/api/estimation/estimate/nonexistentQueue');
        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({
            message: 'No estimate found for nonexistentQueue'
        });
    });
});
