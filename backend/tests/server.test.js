const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
    it('GET /api/stats returns counts', async () => {
        const res = await request(app).get('/api/stats');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('count');
    });

    it('POST /api/opt-in succeeds with valid data', async () => {
        const res = await request(app)
            .post('/api/opt-in')
            .send({ email: 'test@example.com', fullName: 'Test User' });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ success: true });
    });

    it('POST /api/opt-in fails without email', async () => {
        const res = await request(app)
            .post('/api/opt-in')
            .send({ fullName: 'Test User' });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Email is required');
    });
});
