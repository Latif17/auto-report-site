const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { randomDelay } = require('./utils');
puppeteer.use(StealthPlugin());

function getConfig(userData) {
    const isTestMode = Boolean(process.env.TEST_MODE === 'true' || 
                      (userData && typeof userData.email === 'string' && userData.email.toLowerCase().endsWith('@example.com')));
    
    const showBrowser = process.env.SHOW_BROWSER === 'true';

    const launchArgs = { 
        headless: showBrowser ? false : "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    };
    
    if (showBrowser) {
        launchArgs.slowMo = 50;
    }

    return { isTestMode, launchArgs };
}

function formatTime(timeStr) {
    if (!timeStr) return '11:00am';
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) return timeStr;
    const [h, m] = timeStr.split(':');
    let hour = parseInt(h, 10);
    const suffix = hour >= 12 ? 'pm' : 'am';
    hour = hour % 12 || 12;
    return `${hour}:${m || '00'}${suffix}`;
}

function getGovUkDateCategory(dateStr) {
    const [y, m, d] = dateStr.split('-');
    const target = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    target.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = Math.abs(today - target);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Earlier today';
    if (diffDays === 1) return 'Yesterday';
    return 'Before yesterday';
}

async function clickLabel(page, text) {
    await page.evaluate((textToFind) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const target = labels.find(l => l.textContent.toLowerCase().includes(textToFind.toLowerCase()));
        if (target) {
            const inputId = target.getAttribute('for');
            if (inputId) {
                const el = document.getElementById(inputId);
                if (el) el.click();
            } else {
                target.click();
            }
        }
    }, text);
}

async function goNext(page) {
    await randomDelay(1000, 3000);
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button.govuk-button, a.govuk-button--start, button[type="submit"]'));
            // Ignore buttons inside the cookie banner
            const formBtns = btns.filter(b => !b.closest('.govuk-cookie-banner'));
            const targetBtn = formBtns.find(b => {
                const text = b.textContent.trim().toLowerCase();
                return text.includes('continue') || text.includes('start now') || text.includes('send report');
            });
            if (targetBtn) {
                targetBtn.click();
            } else if (formBtns.length > 0) {
                formBtns[formBtns.length - 1].click();
            }
        })
    ]);
}

async function submitGovForm(userData, incidentData) {
    let browser;
    try {
        console.log(`Starting GOV.UK submission for ${userData.email || 'Anonymous'}`);
        const { isTestMode, launchArgs } = getConfig(userData);
        
        const debugLog = (msg) => {
            if (isTestMode) console.log(`[TEST_DEBUG] ${msg}`);
        };

        debugLog('Launching browser with args: ' + JSON.stringify(launchArgs));
        
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchArgs.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        browser = await puppeteer.launch(launchArgs);
        const page = await browser.newPage();

        // Page 1: Where is smell coming from?
        debugLog('Navigating to Page 1: Where is smell coming from?');
        await page.goto('https://report-an-environmental-problem.service.gov.uk/smell/source', { waitUntil: 'networkidle0' });
        await clickLabel(page, 'industrial site');
        await goNext(page);

        // Page 2: Can you give details?
        debugLog('Navigating to Page 2: Can you give details?');
        await clickLabel(page, 'Yes');
        await page.evaluate((location) => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            if(inputs[0]) inputs[0].value = location || 'ReFoods UK (Dagenham), East London BioGas, Veolia Dagenham';
            if(inputs[1]) inputs[1].value = 'Choats Rd Dagenham';
            if(inputs[2]) inputs[2].value = 'RM9 6LF';
        }, incidentData.businessLocation || incidentData.business_location);
        await goNext(page);

        // Page 3: Affecting you at home?
        debugLog('Navigating to Page 3: Affecting you at home?');
        await clickLabel(page, 'Yes');
        await goNext(page);

        // Page 4 & 5: Find your address (skip lookup, enter manually)
        debugLog('Navigating to Page 4 & 5: Find your address');
        await page.evaluate(() => {
            const manualLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Enter address manually'));
            if (manualLink) manualLink.click();
        });
        // Wait a tiny bit for the DOM to update (unhide fields)
        await new Promise(r => setTimeout(r, 1000));

        // Try to fill standard address fields
        const addrFields = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            const a = document.querySelector('input[name*="line_1"], input[name*="address1"]') || inputs[0];
            const t = document.querySelector('input[name*="town"], input[name*="city"]') || inputs[1];
            const p = document.querySelector('input[name*="postcode"]') || inputs[inputs.length-1];
            return { aId: a ? a.id : null, tId: t ? t.id : null, pId: p ? p.id : null };
        });
        if (addrFields.aId) await page.type('#' + addrFields.aId, userData.address || '11 Kentfield Street');
        if (addrFields.tId) await page.type('#' + addrFields.tId, 'Barking Riverside');
        if (addrFields.pId) await page.type('#' + addrFields.pId, userData.postcode || 'IG11 0ZA');
        
        await goNext(page);

        // Page 6: Describe smell
        debugLog('Navigating to Page 6: Describe smell');
        if (incidentData.smellType && incidentData.smellType !== 'Other') {
            await clickLabel(page, incidentData.smellType);
        } else {
            await clickLabel(page, 'You cannot describe it');
        }
        await goNext(page);

        // Page 7: Problems before?
        debugLog('Navigating to Page 7: Problems before?');
        await clickLabel(page, 'happens often');
        await goNext(page);

        // Page 8: What date?
        debugLog('Navigating to Page 8: What date?');
        const dateCategory = incidentData.dateOfSmell ? getGovUkDateCategory(incidentData.dateOfSmell) : 'Earlier today';
        await clickLabel(page, dateCategory);
        await goNext(page);

        // Conditional branch for Before yesterday
        if (dateCategory === 'Before yesterday') {
            debugLog('Navigating to Extra Page: What date did the smell start?');
            const [y, m, d] = incidentData.dateOfSmell.split('-');
            await page.evaluate((day, month, year) => {
                const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"]'));
                if (inputs[0]) inputs[0].value = parseInt(day, 10).toString();
                if (inputs[1]) inputs[1].value = parseInt(month, 10).toString();
                if (inputs[2]) inputs[2].value = year;
            }, d, m, y);
            await goNext(page);
        }

        // Page 9: What time?
        debugLog('Navigating to Page 9: What time?');
        const timeId = await page.evaluate(() => {
            const input = document.querySelector('input[type="text"], input[type="time"]');
            return input ? input.id : null;
        });
        const timeFormatted = formatTime(incidentData.timeOfSmell);
        if (timeId) {
            // clear the input just in case
            await page.evaluate((id) => document.getElementById(id).value = '', timeId);
            await page.type('#' + timeId, timeFormatted);
        }
        await goNext(page);

        // Page 10: Still there?
        debugLog('Navigating to Page 10: Still there?');
        await clickLabel(page, 'Yes');
        await goNext(page);

        // Page 11: How strong?
        debugLog('Navigating to Page 11: How strong?');
        await clickLabel(page, 'Extremely strong'); // or map severity
        await goNext(page);

        // Page 12: Noticeable indoors?
        debugLog('Navigating to Page 12: Noticeable indoors?');
        await clickLabel(page, 'Yes');
        await goNext(page);

        // Page 13: Sticks to clothing?
        debugLog('Navigating to Page 13: Sticks to clothing?');
        await clickLabel(page, 'Yes');
        await goNext(page);

        // Page 14: Because of the smell...
        debugLog('Navigating to Page 14: Because of the smell...');
        await clickLabel(page, 'Leave the area');
        await clickLabel(page, 'Keep windows');
        await clickLabel(page, 'Avoid using parts');
        await goNext(page);

        // Page 15: Health problems
        debugLog('Navigating to Page 15: Health problems');
        await clickLabel(page, 'Headache');
        await clickLabel(page, 'Watering eyes');
        await clickLabel(page, 'Sickness or nausea');
        await goNext(page);

        // Page 16: Medical help
        debugLog('Navigating to Page 16: Medical help');
        await clickLabel(page, 'No');
        await goNext(page);

        // Page 17: Contact details
        debugLog('Navigating to Page 17: Contact details');
        await page.evaluate((userData) => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]'));
            if(inputs[0] && userData.fullName) inputs[0].value = userData.fullName;
            if(inputs[1] && userData.email) inputs[1].value = userData.email;
            if(inputs[2] && userData.phone) inputs[2].value = userData.phone;
        }, userData);
        await goNext(page);

        // Page 18: Images/videos?
        debugLog('Navigating to Page 18: Images/videos?');
        await clickLabel(page, 'No');
        await goNext(page);

        // Page 19: Anything else
        debugLog('Navigating to Page 19: Anything else');
        await page.evaluate((desc) => {
            const ta = document.querySelector('textarea');
            if (ta) ta.value = desc || '';
        }, incidentData.description);
        
        // Proceed to final review page
        await goNext(page);
        debugLog('Navigating to Final Review Page');
        
        // Final submit
        if (isTestMode) {
            debugLog('TEST MODE ACTIVE: Skipping final form submission. Browser will close in 5 minutes to allow reading logs/answers (skipped in CI)...');
            if (!process.env.JEST_WORKER_ID && !process.env.GITHUB_ACTIONS && !process.env.CI) {
                await new Promise(r => setTimeout(r, 300000));
            }
        } else {
            await goNext(page);
            
            // Verify submission success
            try {
                // Wait up to 5 seconds for the confirmation panel to appear
                await page.waitForSelector('.govuk-panel.govuk-panel--confirmation', { timeout: 5000 });
                
                const successTextExists = await page.evaluate(() => {
                    const panel = document.querySelector('.govuk-panel.govuk-panel--confirmation');
                    return panel && panel.textContent.includes('We have received your report');
                });

                if (successTextExists) {
                    console.log(`Successfully submitted form for ${userData.email}`);
                } else {
                    console.error(`Failed to verify submission for ${userData.email}. Success text incorrect.`);
                    return false;
                }
            } catch (error) {
                console.error(`Failed to verify submission for ${userData.email}. Success panel missing.`);
                return false;
            }
        }
        
        return true;
    } catch (e) {
        console.error("Puppeteer automation error:", e.message);
        return false;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { submitGovForm, getConfig };
