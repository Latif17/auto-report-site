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
            .set('X-Forwarded-For', '10.0.0.1')
            .send({ email: 'test@example.com', fullName: 'Test User' });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ success: true });
    });

    it('POST /api/opt-in fails without email', async () => {
        const res = await request(app)
            .post('/api/opt-in')
            .set('X-Forwarded-For', '10.0.0.2')
            .send({ fullName: 'Test User' });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Email is required');
    });

    it('POST /api/submit when shareData is false returns success', async () => {
        const res = await request(app)
            .post('/api/submit')
            .set('X-Forwarded-For', '10.0.0.3')
            .send({ 
                timeOfSmell: '00:00',
                smellType: 'Waste',
                businessLocation: 'ReFoods'
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject({ success: true, message: "Report triggered" });
    });

    it('POST /api/submit handles shareData correctly and returns success', async () => {
        const res = await request(app)
            .post('/api/submit')
            .set('X-Forwarded-For', '10.0.0.4')
            .send({ 
                email: 'test@example.com', 
                fullName: 'Test User', 
                shareData: true,
                timeOfSmell: '00:00',
                smellType: 'Waste',
                businessLocation: 'ReFoods'
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject({ success: true, message: "Report triggered" });
    });

    it('POST /api/submit prevents duplicate submissions', async () => {
        const res = await request(app)
            .post('/api/submit')
            .set('X-Forwarded-For', '10.0.0.9')
            .send({ 
                email: 'duplicate@example.com', 
                fullName: 'Duplicate User', 
                timeOfSmell: '00:00',
                smellType: 'Waste',
                businessLocation: 'ReFoods'
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'You have already submitted a report for this exact event.');
    });
});

describe('Security Middlewares', () => {
    it('should have helmet security headers', async () => {
        const res = await request(app).get('/api/stats');
        // Helmet sets many headers, checking a few common ones to verify it's active
        expect(res.headers['x-dns-prefetch-control']).toEqual('off');
        expect(res.headers['x-frame-options']).toEqual('SAMEORIGIN');
        expect(res.headers['strict-transport-security']).toBeDefined();
    });

    it('should strict rate limit mutation endpoints to 3 per 15 minutes', async () => {
        // We make 3 requests to /api/submit
        for (let i = 0; i < 3; i++) {
            const res = await request(app)
                .post('/api/submit')
                .set('X-Forwarded-For', '10.0.0.5')
                .send({
                    email: `test${i}@example.com`,
                    fullName: 'Test User',
                    timeOfSmell: '00:00',
                    smellType: 'Waste',
                    businessLocation: 'ReFoods'
                });
            expect(res.statusCode).toEqual(200);
        }

        // The 4th request should be blocked by strict limiter
        const res = await request(app)
            .post('/api/submit')
            .set('X-Forwarded-For', '10.0.0.5')
            .send({
                email: 'test4@example.com',
                fullName: 'Test User',
                timeOfSmell: '00:00',
                smellType: 'Waste',
                businessLocation: 'ReFoods'
            });

        expect(res.statusCode).toEqual(429);
        expect(res.body).toHaveProperty('error', 'Too many submissions. Please try again later.');
    });

    it('should rate limit /api/opt-in', async () => {
        for (let i = 0; i < 3; i++) {
            const res = await request(app)
                .post('/api/opt-in')
                .set('X-Forwarded-For', '10.0.0.7')
                .send({ email: `test${i}@example.com`, fullName: 'Test User' });
            expect(res.statusCode).toEqual(200);
        }
        const res = await request(app)
            .post('/api/opt-in')
            .set('X-Forwarded-For', '10.0.0.7')
            .send({ email: 'test4@example.com', fullName: 'Test User' });
        expect(res.statusCode).toEqual(429);
    });

    it('should rate limit /api/join', async () => {
        for (let i = 0; i < 3; i++) {
            const res = await request(app)
                .post('/api/join')
                .set('X-Forwarded-For', '10.0.0.8')
                .send({ email: `test${i}@example.com`, incidentId: 9999 });
            expect(res.statusCode).toEqual(200);
        }
        const res = await request(app)
            .post('/api/join')
            .set('X-Forwarded-For', '10.0.0.8')
            .send({ email: 'test4@example.com', incidentId: 9999 });
        expect(res.statusCode).toEqual(429);
    });

    it('should limit requests to 100 per 15 minutes', async () => {
        // We will make 100 requests first.
        // It's a mock endpoint so it's fast.
        for (let i = 0; i < 100; i++) {
            await request(app).get('/api/stats').set('X-Forwarded-For', '10.0.0.6');
        }
        
        // The 101st request should be rate-limited
        const res = await request(app).get('/api/stats').set('X-Forwarded-For', '10.0.0.6');
        expect(res.statusCode).toEqual(429);
        expect(res.body).toHaveProperty('error', 'Too many requests from this IP, please try again after 15 minutes');
    });
});
