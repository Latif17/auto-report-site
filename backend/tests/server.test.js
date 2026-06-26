const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
    it('GET /api/stats returns counts', async () => {
        const res = await request(app).get('/api/stats');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('count');
    });
});
