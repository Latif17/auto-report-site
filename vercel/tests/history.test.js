const request = require('supertest');
const app = require('../server');

describe('GET /api/history', () => {
    it('returns reports array', async () => {
        const res = await request(app).get('/api/history');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.reports)).toBe(true);
    });

    it('marks incidents with valid govUkStatus values', async () => {
        const res = await request(app).get('/api/history');
        expect(res.status).toBe(200);
        res.body.reports.forEach(r => {
            expect(['submitted', 'not_submitted']).toContain(r.govUkStatus);
        });
    });

    it('returns reports from multiple submitters without filtering by identity', async () => {
        const res = await request(app).get('/api/history');
        expect(res.status).toBe(200);
        expect(res.body.reports.length).toBeGreaterThan(1);
    });

    it('never includes user_email or other PII fields in report objects', async () => {
        const res = await request(app).get('/api/history');
        expect(res.status).toBe(200);
        res.body.reports.forEach(r => {
            expect(r).not.toHaveProperty('user_email');
            expect(r).not.toHaveProperty('email');
            expect(r).not.toHaveProperty('additional_notes');
        });
    });

    it('never includes reported_by column in report objects', async () => {
        const res = await request(app).get('/api/history');
        expect(res.status).toBe(200);
        res.body.reports.forEach(r => {
            expect(r).not.toHaveProperty('reported_by');
        });
    });
});
