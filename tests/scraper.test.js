const { getConfig, submitGovForm } = require('../scraper');
const puppeteer = require('puppeteer');

jest.mock('puppeteer', () => ({
    launch: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
            goto: jest.fn().mockResolvedValue(),
            evaluate: jest.fn().mockResolvedValue({}),
            type: jest.fn().mockResolvedValue(),
            waitForNavigation: jest.fn().mockResolvedValue(),
        }),
        close: jest.fn()
    })
}));

describe('scraper configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        delete process.env.TEST_MODE;
        delete process.env.SHOW_BROWSER;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('does not trigger test mode for normal emails', () => {
        const config = getConfig({ email: 'normal@user.com' });
        expect(config.isTestMode).toBe(false);
    });

    it('triggers test mode for @example.com emails', () => {
        const config = getConfig({ email: 'user@example.com' });
        expect(config.isTestMode).toBe(true);
        expect(config.launchArgs.headless).toBe('new');
    });

    it('triggers test mode when TEST_MODE is true', () => {
        process.env.TEST_MODE = 'true';
        const config = getConfig({ email: 'real@user.com' });
        expect(config.isTestMode).toBe(true);
        expect(config.launchArgs.headless).toBe('new');
    });

    it('shows browser only when SHOW_BROWSER is true', () => {
        process.env.TEST_MODE = 'true';
        process.env.SHOW_BROWSER = 'true';
        const config = getConfig({ email: 'real@user.com' });
        expect(config.isTestMode).toBe(true);
        expect(config.launchArgs.headless).toBe(false);
        expect(config.launchArgs.slowMo).toBe(50);
    });
});

describe('submitGovForm', () => {
    let consoleSpy;
    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
        consoleSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('logs verbose test debug messages when in test mode', async () => {
        await submitGovForm({ email: 'test@example.com' }, {});
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[TEST_DEBUG]'));
    }, 10000);
});
