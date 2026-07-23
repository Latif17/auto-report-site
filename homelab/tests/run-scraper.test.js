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
    let mockRpcResponses = [];

    beforeEach(() => {
        jest.clearAllMocks();

        jest.useFakeTimers();

        mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        mockInResponses = [];
        mockEqResponses = [];
        mockNeqResponses = [];
        mockRpcResponses = [];

        // Setup mock Supabase client chain
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockImplementation(() => {
                return Promise.resolve({ data: null, error: null });
            }),
            in: jest.fn().mockImplementation((column, values) => {
                if (column === 'user_email') {
                    return mockSupabase;
                }
                const nextVal = mockInResponses.shift();
                const p = Promise.resolve(nextVal || { data: [], error: null });
                p.eq = mockSupabase.eq;
                p.neq = mockSupabase.neq;
                return p;
            }),
            eq: jest.fn().mockImplementation((column, value) => {
                if (column === 'incidents.status' || column === 'incident_id') {
                    return mockSupabase;
                }
                const nextVal = mockEqResponses.shift();
                const p = Promise.resolve(nextVal || { data: [], error: null });
                p.eq = function(c, v) { return p; };
                p.neq = mockSupabase.neq;
                return p;
            }),
            neq: jest.fn().mockImplementation((column, value) => {
                const nextVal = mockNeqResponses.shift();
                return Promise.resolve(nextVal || { data: [], error: null });
            }),
            rpc: jest.fn().mockImplementation(() => {
                const nextVal = mockRpcResponses.shift();
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

    it('should run the stale unpooled report sweep before checking for pending incidents', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        // 1. Sweep RPC call
        mockRpcResponses.push({ data: [], error: null });
        // 2. Fetch pending incidents (eq) -> none
        mockEqResponses.push({ data: [], error: null });

        await runFunc();

        expect(mockSupabase.rpc).toHaveBeenCalledWith('sweep_stale_unpooled_reports', { p_cutoff_hours: 48 });
        expect(mockConsoleLog).toHaveBeenCalledWith("No pending incidents found. Exiting.");
    });

    it('should log the number of purged users when the stale sweep finds stale reports', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        // 1. Sweep RPC call -> purges two users
        mockRpcResponses.push({ data: [{ purged_email: 'stale1@example.com' }, { purged_email: 'stale2@example.com' }], error: null });
        // 2. Fetch pending incidents (eq) -> none
        mockEqResponses.push({ data: [], error: null });

        await runFunc();

        expect(mockConsoleLog).toHaveBeenCalledWith("Purged 2 stale unpooled user record(s) past the 48h retry cutoff.");
    });

    it('should log an error and continue if the stale sweep RPC fails', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        // 1. Sweep RPC call fails
        mockRpcResponses.push({ data: null, error: { message: 'sweep rpc failed' } });
        // 2. Fetch pending incidents (eq) -> none
        mockEqResponses.push({ data: [], error: null });

        await runFunc();

        expect(mockConsoleError).toHaveBeenCalledWith("Error sweeping stale unpooled reports:", { message: 'sweep rpc failed' });
        expect(mockConsoleLog).toHaveBeenCalledWith("No pending incidents found. Exiting.");
    });

    it('should use UNPOOLED_RETRY_CUTOFF_HOURS env var for the sweep cutoff', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            process.env.UNPOOLED_RETRY_CUTOFF_HOURS = '12';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        mockRpcResponses.push({ data: [], error: null });
        mockEqResponses.push({ data: [], error: null });

        await runFunc();

        expect(mockSupabase.rpc).toHaveBeenCalledWith('sweep_stale_unpooled_reports', { p_cutoff_hours: 12 });

        delete process.env.UNPOOLED_RETRY_CUTOFF_HOURS;
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
            { id: 1, smell_timestamp: '2026-06-27 10:00:00', smell_type: 'Sewage', business_location: 'factory' }
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

        // Mock completed reports (eq)
        mockEqResponses.push({ data: [], error: null });

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
            { dateOfSmell: '2026-06-27', timeOfSmell: '10:00', smellType: 'Sewage', businessLocation: 'factory', description: '' }
        );

        // Should log scraper error
        expect(mockConsoleError).toHaveBeenCalledWith(
            "Error submitting form for test@example.com:", 
            expect.any(Error)
        );

        // Should update status to pending on scraper error to allow retrying
        expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'pending' });
    });

    it('should process both opted_in and pooled users, and cleanup unpooled users via RPC', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        const pendingIncidents = [
            { id: 10, smell_timestamp: '2026-06-27 12:00:00', smell_type: 'Plastic', business_location: 'dump' }
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

        // Mock completed reports (eq)
        mockEqResponses.push({ data: [], error: null });

        // Mock scraper successful submissions
        submitGovForm.mockResolvedValue(true);

        // 6a. Stale sweep RPC call (runs at the very start of processQueue, before any of the above)
        mockRpcResponses.push({ data: [], error: null });
        // 6b. Cleanup RPC call for explicit@example.com
        mockRpcResponses.push({ data: [{ email: 'explicit@example.com' }], error: null });

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

        // Verify submitGovForm called for BOTH users
        expect(submitGovForm).toHaveBeenCalledTimes(2);
        expect(submitGovForm).toHaveBeenNthCalledWith(1,
            { email: 'explicit@example.com', fullName: 'Explicit User', postcode: 'E1', phone: '111', address: 'Addr 1' },
            { dateOfSmell: '2026-06-27', timeOfSmell: '12:00', smellType: 'Plastic', businessLocation: 'dump', description: '' }
        );
        expect(submitGovForm).toHaveBeenNthCalledWith(2,
            { email: 'pooled@example.com', fullName: 'Pooled User', postcode: 'P2', phone: '222', address: 'Addr 2' },
            { dateOfSmell: '2026-06-27', timeOfSmell: '12:00', smellType: 'Plastic', businessLocation: 'dump', description: '' }
        );

        // Verify the atomic cleanup RPC was called for the unpooled user, excluding the current incident
        expect(mockSupabase.rpc).toHaveBeenCalledWith('cleanup_unpooled_users', {
            p_emails: ['explicit@example.com'],
            p_exclude_incident_id: 10
        });
    });

    it('should query additional_notes from opted_in_user_reports and pass it as description to submitGovForm', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        const pendingIncidents = [
            { id: 20, smell_timestamp: '2026-06-27 15:00:00', smell_type: 'Sewage', business_location: 'factory' }
        ];

        const userReports = [{ incident_id: 20, user_email: 'noted@example.com', additional_notes: 'Strong chemical smell near window' }];
        const users = [
            { email: 'noted@example.com', full_name: 'Noted User', postcode: 'N1', phone: '333', address: 'Addr 3', pool_data: false }
        ];

        // 1. Fetch pending incidents
        mockEqResponses.push({ data: pendingIncidents, error: null });
        // 2. Fetch opted-in reports (select incident_id, user_email, additional_notes)
        mockInResponses.push({ data: userReports, error: null });
        // 3. Fetch pooled users
        mockEqResponses.push({ data: [], error: null });
        // 4. Fetch details of users
        mockInResponses.push({ data: users, error: null });
        // 5. Update status to processing
        mockEqResponses.push({ error: null });
        // Mock completed reports
        mockEqResponses.push({ data: [], error: null });

        // Mock scraper successful submission
        submitGovForm.mockResolvedValue(true);

        // Stale sweep RPC and cleanup RPC
        mockRpcResponses.push({ data: [], error: null });
        mockRpcResponses.push({ data: [{ email: 'noted@example.com' }], error: null });

        // Update status to completed
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

        expect(mockSupabase.from).toHaveBeenCalledWith('opted_in_user_reports');
        expect(mockSupabase.select).toHaveBeenCalledWith('incident_id, user_email, additional_notes');
        expect(submitGovForm).toHaveBeenCalledWith(
            { email: 'noted@example.com', fullName: 'Noted User', postcode: 'N1', phone: '333', address: 'Addr 3' },
            { dateOfSmell: '2026-06-27', timeOfSmell: '15:00', smellType: 'Sewage', businessLocation: 'factory', description: 'Strong chemical smell near window' }
        );
    });


    it('should exit if fetching opted-in user reports fails', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        // 1. Fetch pending incidents (eq)
        mockEqResponses.push({ data: [{ id: 1 }], error: null });
        // 2. Fetch opted-in reports (in) -> fail
        mockInResponses.push({ data: null, error: { message: 'opted-in reports query failed' } });

        await runFunc();

        expect(mockConsoleError).toHaveBeenCalledWith("Error fetching opted-in user reports:", { message: 'opted-in reports query failed' });
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should exit if fetching pooled users fails', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        // 1. Fetch pending incidents (eq)
        mockEqResponses.push({ data: [{ id: 1 }], error: null });
        // 2. Fetch opted-in reports (in)
        mockInResponses.push({ data: [], error: null });
        // 3. Fetch pooled users (eq) -> fail
        mockEqResponses.push({ data: null, error: { message: 'pooled users query failed' } });

        await runFunc();

        expect(mockConsoleError).toHaveBeenCalledWith("Error fetching pooled users:", { message: 'pooled users query failed' });
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should exit if fetching user details by emails fails', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        // 1. Fetch pending incidents (eq)
        mockEqResponses.push({ data: [{ id: 1 }], error: null });
        // 2. Fetch opted-in reports (in)
        mockInResponses.push({ data: [{ incident_id: 1, user_email: 'test@example.com' }], error: null });
        // 3. Fetch pooled users (eq)
        mockEqResponses.push({ data: [], error: null });
        // 4. Fetch details of all users (in) -> fail
        mockInResponses.push({ data: null, error: { message: 'user details query failed' } });

        await runFunc();

        expect(mockConsoleError).toHaveBeenCalledWith("Error fetching user details by emails:", { message: 'user details query failed' });
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should log an error if the cleanup RPC fails', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        const pendingIncidents = [
            { id: 10, smell_timestamp: '2026-06-27 12:00:00', smell_type: 'Plastic', business_location: 'dump' }
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
        // Mock completed reports (eq)
        mockEqResponses.push({ data: [], error: null });

        // Mock scraper successful submission
        submitGovForm.mockResolvedValue(true);

        // 6a. Stale sweep RPC call (runs at the very start of processQueue, before any of the above)
        mockRpcResponses.push({ data: [], error: null });
        // 6b. Cleanup RPC call fails.
        mockRpcResponses.push({ data: null, error: { message: 'cleanup rpc failed' } });

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

        expect(mockConsoleError).toHaveBeenCalledWith("Error cleaning up unpooled users:", { message: 'cleanup rpc failed' });
    });

    it('should run in daemon mode and poll periodically', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            process.env.DAEMON_MODE = 'true';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        // First iteration: no pending incidents, should just return
        mockEqResponses.push({ data: [], error: null });

        // Second iteration: fetch incidents fails with unhandled error to break the loop
        mockEqResponses.push({
            get data() {
                throw new Error('Break loop');
            }
        });

        const runPromise = runFunc();

        // Let the first iteration run
        await Promise.resolve();

        const expectation = expect(runPromise).rejects.toThrow('Break loop');

        // Advance timers by 2 minutes to trigger the second iteration
        if (jest.runAllTimersAsync) {
            await jest.advanceTimersByTimeAsync(120000);
        } else {
            jest.advanceTimersByTime(120000);
            await Promise.resolve();
        }

        // Wait for the runPromise to reject (which breaks the loop)
        await expectation;

        expect(mockConsoleLog).toHaveBeenCalledWith("Starting scraper worker...");
        expect(mockConsoleLog).toHaveBeenCalledWith("Daemon mode active. Polling every 2 minutes.");
        expect(mockConsoleLog).toHaveBeenCalledWith("No pending incidents found.");
        expect(mockExit).not.toHaveBeenCalled();
    });

    it('should log db error and not exit when in daemon mode', async () => {
        let runFunc;
        jest.isolateModules(() => {
            process.env.SUPABASE_URL = 'http://localhost';
            process.env.SUPABASE_KEY = 'test';
            process.env.DAEMON_MODE = 'true';
            const module = require('../run-scraper');
            runFunc = module.run;
        });

        // First iteration: fetch incidents fails with db error
        mockEqResponses.push({ data: null, error: { message: 'db connection error' } });

        // Second iteration: break the loop
        mockEqResponses.push({
            get data() {
                throw new Error('Break loop');
            }
        });

        const runPromise = runFunc();

        // Let the first iteration run
        await Promise.resolve();

        const expectation = expect(runPromise).rejects.toThrow('Break loop');

        // Advance timers by 2 minutes to trigger the second iteration
        if (jest.runAllTimersAsync) {
            await jest.advanceTimersByTimeAsync(120000);
        } else {
            jest.advanceTimersByTime(120000);
            await Promise.resolve();
        }

        await expectation;

        expect(mockConsoleError).toHaveBeenCalledWith("Error fetching incidents:", { message: 'db connection error' });
        expect(mockExit).not.toHaveBeenCalled();
    });
});
