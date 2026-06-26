const { getConfig } = require('../scraper');

describe('scraper configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
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
