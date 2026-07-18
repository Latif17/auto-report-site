const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
    let usersUpsertSpy;
    let deleteEqSpy;
    let incidentsInsertSpy;
    let mockExistingIncidents;

    beforeEach(() => {
        jest.clearAllMocks();
        mockExistingIncidents = [{ id: 9999, smell_type: 'Industrial Stench' }];
        jest.spyOn(console, 'error').mockImplementation(() => {});
        usersUpsertSpy = jest.fn().mockReturnValue({
            throwOnError: jest.fn().mockReturnThis(),
            then: jest.fn((cb) => cb({}))
        });

        deleteEqSpy = jest.fn();

        incidentsInsertSpy = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            throwOnError: jest.fn().mockReturnValue({ data: { id: 1 }, error: null }),
            then: jest.fn((cb) => cb({ data: { id: 1 }, error: null }))
        });

        const originalFrom = app.supabase.from.bind(app.supabase);
        jest.spyOn(app.supabase, 'from').mockImplementation((table) => {
            const chain = originalFrom(table);
            if (table === 'users') {
                chain.upsert = usersUpsertSpy;
            }
            if (table === 'incidents') {
                const originalSelect = chain.select.bind(chain);
                chain.select = (...args) => {
                    const selectChain = originalSelect(...args);
                    selectChain.then = (resolve) => resolve({ count: mockExistingIncidents.length, data: mockExistingIncidents });
                    return selectChain;
                };
                const originalInsert = chain.insert.bind(chain);
                chain.insert = (data) => {
                    incidentsInsertSpy(data);
                    return originalInsert(data);
                };
            }
            const originalDelete = chain.delete.bind(chain);
            chain.delete = () => {
                const deleteChain = originalDelete();
                const originalEq = deleteChain.eq.bind(deleteChain);
                deleteChain.eq = (col, val) => {
                    deleteEqSpy(table, col, val);
                    return originalEq(col, val);
                };
                return deleteChain;
            };
            return chain;
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /api/stats returns counts', async () => {
        const res = await request(app).get('/api/stats');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('count');
    });

    it('GET /api/dashboard-stats returns total counts', async () => {
        const res = await request(app).get('/api/dashboard-stats');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('users');
        expect(res.body).toHaveProperty('incidents');
        expect(res.body).toHaveProperty('formsSubmitted');
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
        mockExistingIncidents = [];
        const res = await request(app)
            .post('/api/submit')
            .set('X-Forwarded-For', '10.0.0.3')
            .send({ 
                email: 'testfalse@example.com',
                fullName: 'Test False',
                timeOfSmell: '00:00',
                smellType: 'Waste',
                businessLocation: 'ReFoods'
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject({ success: true, message: "Report triggered" });
        expect(usersUpsertSpy).toHaveBeenCalledWith(expect.objectContaining({ pool_data: false }));
        expect(incidentsInsertSpy).toHaveBeenCalledWith(expect.objectContaining({ reported_by: 'testfalse@example.com' }));
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
        expect(usersUpsertSpy).toHaveBeenCalledWith(expect.objectContaining({ pool_data: true }));
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

    it('POST /api/join defaults pool_data to false when shareData is not provided', async () => {
        const res = await request(app)
            .post('/api/join')
            .set('X-Forwarded-For', '10.0.0.10')
            .send({
                email: 'join@example.com',
                fullName: 'Join User',
                incidentId: 9999
            });
        expect(res.statusCode).toEqual(200);
        expect(usersUpsertSpy).toHaveBeenCalledWith(expect.objectContaining({ pool_data: false }));
    });

    it('POST /api/join sets pool_data: true when shareData is explicitly true', async () => {
        const res = await request(app)
            .post('/api/join')
            .set('X-Forwarded-For', '10.0.0.11')
            .send({
                email: 'joinshare@example.com',
                fullName: 'Join Share User',
                incidentId: 9999,
                shareData: true
            });
        expect(res.statusCode).toEqual(200);
        expect(usersUpsertSpy).toHaveBeenCalledWith(expect.objectContaining({ pool_data: true }));
    });

    describe('DELETE /api/delete-data', () => {
        it('deletes user and returns success', async () => {
            const res = await request(app)
                .delete('/api/delete-data')
                .send({ email: 'delete@example.com' });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual({ success: true, message: 'Data deleted successfully' });
            expect(deleteEqSpy).toHaveBeenCalledWith('opted_in_user_reports', 'user_email', 'delete@example.com');
            expect(deleteEqSpy).toHaveBeenCalledWith('users', 'email', 'delete@example.com');
        });

        it('fails without email', async () => {
            const res = await request(app)
                .delete('/api/delete-data')
                .send({});
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Email is required');
        });
    });
    describe('POST /api/feedback', () => {
        let originalFetch;

        beforeAll(() => {
            originalFetch = global.fetch;
        });

        afterAll(() => {
            global.fetch = originalFetch;
        });

        beforeEach(() => {
            jest.resetModules();
            process.env.GITHUB_TOKEN = 'mock_token';
            global.fetch = jest.fn();
            jest.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            delete process.env.GITHUB_TOKEN;
        });

        it('fails with missing parameters', async () => {
            const res = await request(app)
                .post('/api/feedback')
                .set('X-Forwarded-For', '10.0.0.20')
                .send({ feedbackType: 'Bug Report' });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Feedback type and message are required');
        });

        it('fails when parameters are not strings', async () => {
            const res = await request(app)
                .post('/api/feedback')
                .set('X-Forwarded-For', '10.0.0.20')
                .send({ feedbackType: 'Bug Report', message: { object: 'invalid' } });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Feedback type and message must be strings');
        });

        it('fails when GITHUB_TOKEN is missing', async () => {
            delete process.env.GITHUB_TOKEN;
            const res = await request(app)
                .post('/api/feedback')
                .set('X-Forwarded-For', '10.0.0.21')
                .send({ feedbackType: 'Bug Report', message: 'Test message' });
            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty('error', 'Server configuration error');
        });

        it('handles upstream API errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                text: jest.fn().mockResolvedValueOnce('Bad Request')
            });
            const res = await request(app)
                .post('/api/feedback')
                .set('X-Forwarded-For', '10.0.0.22')
                .send({ feedbackType: 'Bug Report', message: 'Test message' });
            expect(res.statusCode).toEqual(502);
            expect(res.body).toHaveProperty('error', 'Failed to create issue with third-party service');
        });

        it('succeeds with valid data and properly formats the issue body', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({ html_url: 'https://github.com/issue/1' })
            });
            const res = await request(app)
                .post('/api/feedback')
                .set('X-Forwarded-For', '10.0.0.23')
                .send({ feedbackType: 'Bug Report', message: 'Test message @someone' });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('issueUrl', 'https://github.com/issue/1');
            
            const fetchArgs = global.fetch.mock.calls[0];
            const requestBody = JSON.parse(fetchArgs[1].body);
            expect(requestBody.body).toContain('```text\nTest message @someone\n```');
        });

        it('handles network timeout errors', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network timeout'));
            const res = await request(app)
                .post('/api/feedback')
                .set('X-Forwarded-For', '10.0.0.24')
                .send({ feedbackType: 'Bug Report', message: 'Test message' });
            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty('error', 'Internal server error');
        });
    });
});

describe('GET /api/smell-stats-weekly', () => {
    it('should return 200 and structured chart data', async () => {
        const response = await request(app).get('/api/smell-stats-weekly');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('labels');
        expect(response.body).toHaveProperty('datasets');
        expect(Array.isArray(response.body.labels)).toBe(true);
        expect(Array.isArray(response.body.datasets)).toBe(true);
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
        for (let i = 0; i < 100; i++) {
            await request(app).get('/api/stats').set('X-Forwarded-For', '10.0.0.6');
        }
        
        // The 101st request should be rate-limited
        const res = await request(app).get('/api/stats').set('X-Forwarded-For', '10.0.0.6');
        expect(res.statusCode).toEqual(429);
        expect(res.body).toHaveProperty('error', 'Too many requests from this IP, please try again after 15 minutes');
    }, 15000);
});
