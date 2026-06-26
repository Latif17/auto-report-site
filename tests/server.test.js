const request = require('supertest');
const app = require('../server');

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

    it('POST /api/submit when shareData is false returns success', async () => {
        const res = await request(app)
            .post('/api/submit')
            .send({ 
                email: 'test@example.com', 
                fullName: 'Test User', 
                shareData: false,
                timeOfSmell: '12:00',
                smellType: 'Waste',
                businessLocation: 'ReFoods'
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject({ success: true, message: "Report triggered" });
    });

    it('POST /api/submit handles shareData correctly and returns success', async () => {
        const res = await request(app)
            .post('/api/submit')
            .send({ 
                email: 'test@example.com', 
                fullName: 'Test User', 
                shareData: true,
                timeOfSmell: '12:00',
                smellType: 'Waste',
                businessLocation: 'ReFoods'
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject({ success: true, message: "Report triggered" });
    });
});
