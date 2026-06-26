const request = require('supertest');
const app = require('../server');
const scraper = require('../scraper');

jest.mock('../scraper', () => ({
    submitGovForm: jest.fn().mockResolvedValue(true)
}));

describe('API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

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

    it('POST /api/submit calls submitGovForm when shareData is false', async () => {
        const res = await request(app)
            .post('/api/submit')
            .send({ 
                email: 'test@example.com', 
                fullName: 'Test User', 
                shareData: false 
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject({ success: true, message: "Report triggered" });
        await new Promise(r => setTimeout(r, 10)); // Allow background IIFE to run
        expect(scraper.submitGovForm).toHaveBeenCalledTimes(1);
    });

    it('POST /api/submit handles shareData correctly and calls submitGovForm directly', async () => {
        const res = await request(app)
            .post('/api/submit')
            .send({ 
                email: 'test@example.com', 
                fullName: 'Test User', 
                shareData: true 
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject({ success: true, message: "Report triggered" });
        await new Promise(r => setTimeout(r, 10)); // Allow background IIFE to run
        // Expect submitGovForm to be called 1 time for the submitter
        // Since supabase users is mocked to [], triggerMassReporting will result in 0 additional calls.
        expect(scraper.submitGovForm).toHaveBeenCalledTimes(1);
    });
});
