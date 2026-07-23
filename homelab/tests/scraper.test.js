const { getConfig, submitGovForm } = require('../scraper');
const puppeteer = require('puppeteer');

jest.mock('puppeteer', () => {
    const mockPage = {
        goto: jest.fn().mockResolvedValue(),
        evaluate: jest.fn().mockImplementation((fn) => {
            const str = fn.toString();
            if (str.includes('aId: a')) return Promise.resolve({ aId: 'addr1', tId: 'town1', pId: 'post1' });
            if (str.includes('input[type="time"]')) return Promise.resolve('time1');
            return Promise.resolve({});
        }),
        type: jest.fn().mockResolvedValue(),
        waitForNavigation: jest.fn().mockResolvedValue(),
        emulateTimezone: jest.fn().mockResolvedValue(),
        waitForSelector: jest.fn().mockResolvedValue(),
        $eval: jest.fn().mockResolvedValue('Mock H1'),
        content: jest.fn().mockResolvedValue('<html></html>'),
    };
    return {
        launch: jest.fn().mockResolvedValue({
            newPage: jest.fn().mockResolvedValue(mockPage),
            close: jest.fn(),
            on: jest.fn()
        })
    };
});

jest.mock('../utils', () => ({
    randomDelay: jest.fn().mockResolvedValue()
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
        const result = await submitGovForm({ email: 'test@example.com' }, {});
        expect(result).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[TEST_DEBUG]'));
        
        // Retrieve the mocked instances that were created during submitGovForm
        const browser = await puppeteer.launch.mock.results[0].value;
        const mockPage = await browser.newPage.mock.results[0].value;

        expect(mockPage.goto).toHaveBeenCalledTimes(1);
        expect(mockPage.goto).toHaveBeenCalledWith('https://report-an-environmental-problem.service.gov.uk/smell/source', expect.any(Object));
        expect(mockPage.emulateTimezone).toHaveBeenCalledWith('Europe/London');
        expect(mockPage.evaluate.mock.calls.length).toBeGreaterThan(10);
    }, 10000);

    it('handles Plastic smellType with "Something else" smell category and description', async () => {
        const result = await submitGovForm(
            { email: 'test@example.com' }, 
            { smellType: 'Plastic' }
        );
        expect(result).toBe(true);
        
        const browser = await puppeteer.launch.mock.results[0].value;
        const mockPage = await browser.newPage.mock.results[0].value;
        
        // Find if evaluate was called with 'chemical/plastic odour'
        const evaluateCalls = mockPage.evaluate.mock.calls;
        const descCall = evaluateCalls.find(call => call[1] === 'chemical/plastic odour');
        expect(descCall).toBeDefined();
        
        expect(mockPage.waitForSelector).toHaveBeenCalledWith(
            'input[type="text"]:not([hidden]), textarea:not([hidden])', 
            { timeout: 3000 }
        );
    }, 10000);

    it('handles Sewage smellType with Sewage category and water treatment site type', async () => {
        const result = await submitGovForm(
            { email: 'test@example.com' }, 
            { smellType: 'Sewage' }
        );
        expect(result).toBe(true);
        
        const browser = await puppeteer.launch.mock.results[0].value;
        const mockPage = await browser.newPage.mock.results[0].value;
        
        const evaluateCalls = mockPage.evaluate.mock.calls;
        const siteTypeCall = evaluateCalls.find(call => typeof call[0] === 'function' && call[1] === 'sewage or water treatment works');
        expect(siteTypeCall).toBeDefined();
    }, 10000);

    it('handles Rubbish or refuse smellType with Rubbish or refuse category', async () => {
        const result = await submitGovForm(
            { email: 'test@example.com' }, 
            { smellType: 'Rubbish or refuse' }
        );
        expect(result).toBe(true);
        
        const browser = await puppeteer.launch.mock.results[0].value;
        const mockPage = await browser.newPage.mock.results[0].value;
        
        const evaluateCalls = mockPage.evaluate.mock.calls;
        const rubbishCall = evaluateCalls.find(call => typeof call[0] === 'function' && call[1] === 'Rubbish or refuse');
        expect(rubbishCall).toBeDefined();
    }, 10000);
});

