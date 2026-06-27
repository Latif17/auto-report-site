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

    beforeEach(() => {
        jest.clearAllMocks();

        jest.useFakeTimers();

        mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        // Setup mock Supabase client chain
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
        };

        createClient.mockReturnValue(mockSupabase);
        
        // Ensure supabase client is initialized
        process.env.SUPABASE_URL = 'http://localhost';
        process.env.SUPABASE_KEY = 'test-key';
        
        // Re-require to pick up env vars if necessary (though it's cached, so we might need to reset modules if we were testing the init, but we're testing `run`)
    });

    afterEach(() => {
        jest.useRealTimers();
        mockExit.mockRestore();
        mockConsoleError.mockRestore();
        mockConsoleLog.mockRestore();
    });

    it('should exit if supabase is not initialized', async () => {
        // We'll simulate this by mocking the internal check. Since supabase is a module-level variable,
        // we can't easily reset it without jest.resetModules(). Let's use jest.isolateModules.
        
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

        mockSupabase.eq.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });

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

        mockSupabase.eq.mockResolvedValueOnce({ data: [], error: null });

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
        const users = [{ email: 'test@example.com', full_name: 'Test', postcode: '123', phone: '12345', address: '123 St' }];

        // 1. Mock fetch pending incidents (eq)
        mockSupabase.eq.mockResolvedValueOnce({ data: pendingIncidents, error: null });
        
        // 2. Mock fetch opted-in user reports (in)
        mockSupabase.in.mockResolvedValueOnce({ data: userReports, error: null });

        // 3. Mock fetch users (in)
        mockSupabase.in.mockResolvedValueOnce({ data: users, error: null });

        // 4. Mock update to processing (eq)
        mockSupabase.eq.mockResolvedValueOnce({ error: null });

        // Mock scraper throwing error
        submitGovForm.mockRejectedValueOnce(new Error('Scraper failed'));

        // 5. Mock update to completed (eq)
        mockSupabase.eq.mockResolvedValueOnce({ error: null });

        const runPromise = runFunc();
        // Since we have async operations before the timer, we need to let the event loop process them
        // before advancing the timers. We can use runAllTimersAsync if available, or a simple loop.
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
});
