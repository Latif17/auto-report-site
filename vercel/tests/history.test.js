const request = require('supertest');
const app = require('../server');

describe('GET /api/history', () => {
    it('returns 400 if no email provided', async () => {
        const res = await request(app).get('/api/history');
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it('returns reports array for a valid email', async () => {
        const res = await request(app).get('/api/history?email=test%40example.com');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.reports)).toBe(true);
    });

    it('marks incidents with valid govUkStatus values', async () => {
        const res = await request(app).get('/api/history?email=test%40example.com');
        expect(res.status).toBe(200);
        res.body.reports.forEach(r => {
            expect(['submitted', 'not_submitted']).toContain(r.govUkStatus);
        });
    });

    it('returns 400 for invalid email', async () => {
        const res = await request(app).get('/api/history?email=notanemail');
        expect(res.status).toBe(400);
    });
});
