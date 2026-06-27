const { run } = require('../run-scraper');
const { createClient } = require('@supabase/supabase-js');
const { submitGovForm } = require('../scraper');

jest.mock('@supabase/supabase-js');
jest.mock('../scraper');

describe('run-scraper', () => {
    let mockSupabase;
    let mockExit;
    let mockConsoleError;
    let mockConsoleLog;

    let mockInResponses = [];
    let mockEqResponses = [];
    let mockNeqResponses = [];

    beforeEach(() => {
        jest.clearAllMocks();

        jest.useFakeTimers();

        mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        mockInResponses = [];
        mockEqResponses = [];
        mockNeqResponses = [];

        // Setup mock Supabase client chain
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            in: jest.fn().mockImplementation((column, values) => {
                if (column === 'user_email') {
                    return mockSupabase;
                }
                const nextVal = mockInResponses.shift();
                return Promise.resolve(nextVal || { data: [], error: null });
            }),
            eq: jest.fn().mockImplementation((column, value) => {
                if (column === 'incidents.status') {
                    return mockSupabase;
                }
                const nextVal = mockEqResponses.shift();
                return Promise.resolve(nextVal || { data: [], error: null });
            }),
            neq: jest.fn().mockImplementation((column, value) => {
                const nextVal = mockNeqResponses.shift();
                return Promise.resolve(nextVal || { data: [], error: null });
            }),
        };

        createClient.mockReturnValue(mockSupabase);
        
        // Ensure supabase client is initialized
        process.env.SUPABASE_URL = 'http://localhost';
        process.env.SUPABASE_KEY = 'test-key';
    });

    afterEach(() => {
        jest.useRealTimers();
        mockExit.mockRestore();
        mockConsoleError.mockRestore();
        mockConsoleLog.mockRestore();
    });

    it('should exit if supabase is not initialized', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = '';
            process.env.SUPABASE_KEY = '';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        await runFunc();
        expect(mockConsoleError).toHaveBeenCalledWith("Missing Supabase credentials.");
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should exit if fetching pending incidents fails', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        mockEqResponses.push({ data: null, error: { message: 'db error' } });

        await runFunc();

        expect(mockConsoleError).toHaveBeenCalledWith("Error fetching incidents:", { message: 'db error' });
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should exit if no pending incidents', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        mockEqResponses.push({ data: [], error: null });

        await runFunc();

        expect(mockConsoleLog).toHaveBeenCalledWith("No pending incidents found. Exiting.");
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should process pending incidents, handling scraper errors gracefully', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        const pendingIncidents = [
            { id: 1, smell_timestamp: '2026-06-27 10:00:00', smell_type: 'sulfur', business_location: 'factory' }
        ];

        const userReports = [{ incident_id: 1, user_email: 'test@example.com' }];
        const users = [{ email: 'test@example.com', full_name: 'Test', postcode: '123', phone: '12345', address: '123 St', pool_data: true }];

        // 1. Mock fetch pending incidents (eq)
        mockEqResponses.push({ data: pendingIncidents, error: null });
        
        // 2. Mock fetch opted-in user reports (in)
        mockInResponses.push({ data: userReports, error: null });

        // 3. Mock fetch pooled users (eq)
        mockEqResponses.push({ data: [], error: null });

        // 4. Mock fetch users (in)
        mockInResponses.push({ data: users, error: null });

        // 5. Mock update to processing (eq)
        mockEqResponses.push({ error: null });

        // Mock scraper throwing error
        submitGovForm.mockRejectedValueOnce(new Error('Scraper failed'));

        // 6. Mock update to completed (eq)
        mockEqResponses.push({ error: null });

        const runPromise = runFunc();
        if (jest.runAllTimersAsync) {
            await jest.runAllTimersAsync();
        } else {
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
                jest.runAllTimers();
            }
        }
        await runPromise;

        // Should try to update to processing
        expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'processing' });
        
        // Should have called scraper
        expect(submitGovForm).toHaveBeenCalledWith(
            { email: 'test@example.com', fullName: 'Test', postcode: '123', phone: '12345', address: '123 St' },
            { dateOfSmell: '2026-06-27', timeOfSmell: '10:00', smellType: 'sulfur', businessLocation: 'factory' }
        );

        // Should log scraper error
        expect(mockConsoleError).toHaveBeenCalledWith(
            "Error submitting form for test@example.com:", 
            expect.any(Error)
        );

        // Should still update to completed despite scraper error
        expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'completed' });
    });

    it('should process both opted_in and pooled users, and cleanup unpooled users', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        const pendingIncidents = [
            { id: 10, smell_timestamp: '2026-06-27 12:00:00', smell_type: 'chemical', business_location: 'dump' }
        ];

        const userReports = [{ incident_id: 10, user_email: 'explicit@example.com' }];
        const pooledUsers = [{ email: 'pooled@example.com' }];
        const users = [
            { email: 'explicit@example.com', full_name: 'Explicit User', postcode: 'E1', phone: '111', address: 'Addr 1', pool_data: false },
            { email: 'pooled@example.com', full_name: 'Pooled User', postcode: 'P2', phone: '222', address: 'Addr 2', pool_data: true }
        ];

        // 1. Fetch pending incidents (eq)
        mockEqResponses.push({ data: pendingIncidents, error: null });
        
        // 2. Fetch opted-in reports (in)
        mockInResponses.push({ data: userReports, error: null });

        // 3. Fetch pooled users record (eq)
        mockEqResponses.push({ data: pooledUsers, error: null });

        // 4. Fetch details of all users (in)
        mockInResponses.push({ data: users, error: null });

        // 5. Update status to processing (eq)
        mockEqResponses.push({ error: null });

        // Mock scraper successful submissions
        submitGovForm.mockResolvedValue(true);

        // 6. Check other pending reports for explicit@example.com (neq)
        mockNeqResponses.push({ data: [], error: null });

        // 7. Delete explicit@example.com (in)
        mockInResponses.push({ error: null });

        // 8. Update status to completed (eq)
        mockEqResponses.push({ error: null });

        const runPromise = runFunc();
        if (jest.runAllTimersAsync) {
            await jest.runAllTimersAsync();
        } else {
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
                jest.runAllTimers();
            }
        }
        await runPromise;

        // Verify submitGovForm called for BOTH users
        expect(submitGovForm).toHaveBeenCalledTimes(2);
        expect(submitGovForm).toHaveBeenNthCalledWith(1,
            { email: 'explicit@example.com', fullName: 'Explicit User', postcode: 'E1', phone: '111', address: 'Addr 1' },
            { dateOfSmell: '2026-06-27', timeOfSmell: '12:00', smellType: 'chemical', businessLocation: 'dump' }
        );
        expect(submitGovForm).toHaveBeenNthCalledWith(2,
            { email: 'pooled@example.com', fullName: 'Pooled User', postcode: 'P2', phone: '222', address: 'Addr 2' },
            { dateOfSmell: '2026-06-27', timeOfSmell: '12:00', smellType: 'chemical', businessLocation: 'dump' }
        );

        // Verify delete query was constructed for explicit@example.com (since pool_data is false)
        expect(mockSupabase.delete).toHaveBeenCalled();
        expect(mockSupabase.in).toHaveBeenCalledWith('email', ['explicit@example.com']);
    });

    it('should skip deleting unpooled users if querying other pending reports fails', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        const pendingIncidents = [
            { id: 10, smell_timestamp: '2026-06-27 12:00:00', smell_type: 'chemical', business_location: 'dump' }
        ];

        const userReports = [{ incident_id: 10, user_email: 'explicit@example.com' }];
        const pooledUsers = [];
        const users = [
            { email: 'explicit@example.com', full_name: 'Explicit User', postcode: 'E1', phone: '111', address: 'Addr 1', pool_data: false }
        ];

        // 1. Fetch pending incidents (eq)
        mockEqResponses.push({ data: pendingIncidents, error: null });
        
        // 2. Fetch opted-in reports (in)
        mockInResponses.push({ data: userReports, error: null });

        // 3. Fetch pooled users record (eq)
        mockEqResponses.push({ data: pooledUsers, error: null });

        // 4. Fetch details of all users (in)
        mockInResponses.push({ data: users, error: null });

        // 5. Update status to processing (eq)
        mockEqResponses.push({ error: null });

        // Mock scraper successful submissions
        submitGovForm.mockResolvedValue(true);

        // 6. Check other pending reports for explicit@example.com (neq) -> simulate error
        mockNeqResponses.push({ data: null, error: { message: 'db failure' } });

        // 7. Update status to completed (eq)
        mockEqResponses.push({ error: null });

        const runPromise = runFunc();
        if (jest.runAllTimersAsync) {
            await jest.runAllTimersAsync();
        } else {
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
                jest.runAllTimers();
            }
        }
        await runPromise;

        // Verify submitGovForm called for explicit user
        expect(submitGovForm).toHaveBeenCalledTimes(1);

        // Verify delete query was NOT constructed/called
        expect(mockSupabase.delete).not.toHaveBeenCalled();

        // Verify console.error logged the query failure
        expect(mockConsoleError).toHaveBeenCalledWith(
            "Error querying other pending reports during cleanup:",
            { message: 'db failure' }
        );
    });
});
