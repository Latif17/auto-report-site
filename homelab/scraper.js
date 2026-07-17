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
    const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });
    const todayStr = dateFormatter.format(new Date());

    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const [dY, dM, dD] = dateStr.split('-').map(Number);

    const todayDate = new Date(Date.UTC(tY, tM - 1, tD));
    const targetDate = new Date(Date.UTC(dY, dM - 1, dD));

    const diffTime = Math.abs(todayDate - targetDate);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Earlier today';
    if (diffDays === 1) return 'Yesterday';
    return 'Before yesterday';
}

async function clickLabel(page, text) {
    const result = await page.evaluate((textToFind) => {
        const labels = Array.from(document.querySelectorAll('label'));
        let target = labels.find(l => l.textContent.toLowerCase().includes(textToFind.toLowerCase()));
        
        if (!target && labels.length > 0) {
            target = labels.find(l => l.textContent.toLowerCase().includes('cannot describe')) ||
                     labels.find(l => l.textContent.toLowerCase().includes('other')) ||
                     labels.find(l => l.textContent.toLowerCase().includes('not sure')) ||
                     labels[0];
        }

        if (target) {
            const inputId = target.getAttribute('for');
            if (inputId) {
                const el = document.getElementById(inputId);
                if (el) {
                    el.click();
                    return `Clicked input ${inputId}`;
                } else {
                    target.click();
                    return `Clicked label ${inputId} directly`;
                }
            } else {
                target.click();
                return `Clicked target directly no inputId`;
            }
        }
        return `Target not found for ${textToFind}`;
    }, text);
    console.log(`[clickLabel debug] text: ${text}, result: ${result}`);
}

async function goNext(page) {
    console.log(`[goNext] Preparing to click next button...`);
    await randomDelay(1000, 3000);
    try {
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => {
                console.log(`[goNext] waitForNavigation error: ${e.message}`);
            }),
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
            }).catch(e => {
                if (!e.message.includes('detached Frame') && !e.message.includes('Execution context was destroyed')) {
                    console.log(`[goNext] evaluate click error: ${e.message}`);
                } else {
                    console.log(`[goNext] evaluate context destroyed (expected navigation)`);
                }
            })
        ]);
        await randomDelay(500, 1000); // Give React/DOM a moment to settle
        const h1 = await page.$eval('h1', el => el.textContent.trim()).catch(e => {
            console.log(`[goNext] Failed to find H1: ${e.message}`);
            return 'No H1';
        });
        console.log(`[goNext] Successfully arrived at page with H1: ${h1}`);
    } catch (e) {
        console.error(`[goNext] Fatal error:`, e);
        throw e; // rethrow to abort the form submission
    }
}

async function submitGovForm(userData, incidentData) {
    let browser;
    try {
        console.log(`Starting GOV.UK submission for ${userData.email || 'Anonymous'}`);
        const { isTestMode, launchArgs } = getConfig(userData);
        
        const debugLog = (msg) => {
            if (isTestMode) console.log(`[TEST_DEBUG] ${msg}`);
        };

        const bLoc = incidentData.businessLocation || incidentData.business_location;
        const sType = incidentData.smellType || incidentData.smell_type;

        let siteType = 'industrial site';
        let smellCategory = sType || 'You cannot describe it';
        let smellDescription = '';
        let addressStreet = 'Choats Rd Dagenham';
        let addressPostcode = 'RM9 6LF';
        let addressTown = 'Barking Riverside';
        
        if (sType === 'Sewage') {
            siteType = 'sewage or water treatment works';
            addressStreet = '';
            addressPostcode = '';
        } else if (bLoc && bLoc.includes('Veolia')) {
            smellCategory = 'Something else';
            smellDescription = 'chemical/plastic odour';
        } else {
            smellCategory = 'Rubbish or refuse';
        }

        debugLog('Launching browser with args: ' + JSON.stringify(launchArgs));
        
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchArgs.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        browser = await puppeteer.launch(launchArgs);
        const page = await browser.newPage();
        await page.emulateTimezone('Europe/London');

        // Page 1: Where is smell coming from?
        debugLog('Navigating to Page 1: Where is smell coming from?');
        await page.goto('https://report-an-environmental-problem.service.gov.uk/smell/source', { waitUntil: 'networkidle0' });
        await clickLabel(page, siteType);
        await goNext(page);

        // Page 2: Can you give details?
        debugLog('Navigating to Page 2: Can you give details?');
        await clickLabel(page, 'Yes');
        await page.evaluate((locData) => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            if(inputs[0] && locData.name) { inputs[0].value = locData.name; inputs[0].dispatchEvent(new Event('input', { bubbles: true })); }
            
            // Try to find specific address fields, otherwise use standard offsets
            const streetInput = document.querySelector('input[name*="address" i], input[name*="line" i]') || inputs[1];
            const townInput = document.querySelector('input[name*="town" i], input[name*="city" i]') || inputs[2];
            const postcodeInput = document.querySelector('input[name*="postcode" i]') || inputs[3];

            if(streetInput && locData.street !== undefined) { streetInput.value = locData.street; streetInput.dispatchEvent(new Event('input', { bubbles: true })); }
            if(townInput && locData.town !== undefined) { townInput.value = locData.town; townInput.dispatchEvent(new Event('input', { bubbles: true })); }
            if(postcodeInput && locData.postcode !== undefined) { postcodeInput.value = locData.postcode; postcodeInput.dispatchEvent(new Event('input', { bubbles: true })); }
            
        }, { name: bLoc, street: addressStreet, town: addressTown, postcode: addressPostcode });
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
        if (addrFields.aId) await page.type('#' + addrFields.aId, userData.address || '');
        if (addrFields.tId) await page.type('#' + addrFields.tId, 'Barking Riverside');
        if (addrFields.pId) await page.type('#' + addrFields.pId, userData.postcode || '');
        
        await goNext(page);

        // Page 6: Describe smell
        debugLog('Navigating to Page 6: Describe smell');
        await clickLabel(page, smellCategory);
        
        if (smellCategory === 'Something else' && smellDescription) {
            // Wait for the input box to appear
            await page.waitForSelector('input[type="text"]:not([hidden]), textarea:not([hidden])', { timeout: 3000 }).catch(() => {});
            await page.evaluate((desc) => {
                const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                });
                if (inputs.length > 0) {
                    inputs[0].value = desc;
                    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, smellDescription);
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

        // Conditional branch for Before yesterday (Extra Page)
        if (dateCategory === 'Before yesterday') {
            debugLog('Navigating to Extra Page: What date did the smell start?');
            const [y, m, d] = incidentData.dateOfSmell.split('-');
            try {
                await page.waitForSelector('#date-day', { visible: true, timeout: 5000 });
                await page.evaluate(() => {
                    if (document.getElementById('date-day')) document.getElementById('date-day').value = '';
                    if (document.getElementById('date-month')) document.getElementById('date-month').value = '';
                    if (document.getElementById('date-year')) document.getElementById('date-year').value = '';
                });
                await page.focus('#date-day');
                await page.keyboard.type(parseInt(d, 10).toString(), { delay: 50 });
                
                await page.focus('#date-month');
                await page.keyboard.type(parseInt(m, 10).toString(), { delay: 50 });
                
                await page.focus('#date-year');
                await page.keyboard.type(y, { delay: 50 });
            } catch (e) {
                console.error('[Extra Page] Failed to type date:', e);
            }
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
            if(inputs[0] && userData.fullName) { inputs[0].value = userData.fullName; inputs[0].dispatchEvent(new Event('input', { bubbles: true })); }
            if(inputs[1] && userData.email) { inputs[1].value = userData.email; inputs[1].dispatchEvent(new Event('input', { bubbles: true })); }
            if(inputs[2] && userData.phone) { inputs[2].value = userData.phone; inputs[2].dispatchEvent(new Event('input', { bubbles: true })); }
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
            if (ta) { ta.value = desc || ''; ta.dispatchEvent(new Event('input', { bubbles: true })); }
        }, incidentData.smellType ? `Reported as: ${incidentData.smellType}. Details: ${incidentData.description || ''}` : incidentData.description || '');

        // Proceed to final review page
        await goNext(page);
        debugLog('Navigating to Final Review Page');

        // Final submit
        if (isTestMode) {
            const html = await page.content();
            require('fs').writeFileSync('final-page.html', html);
            debugLog('TEST MODE ACTIVE: Skipping final form submission. Browser will close in 5 minutes to allow reading logs/answers (skipped in CI)...');
            if (!process.env.JEST_WORKER_ID && !process.env.GITHUB_ACTIONS && !process.env.CI) {
                // wait 1s instead of 5 minutes
                await new Promise(r => setTimeout(r, 1000));
            }
        } else {            
            // Submit
            await goNext(page);
            debugLog('Navigating to Result Page');
        
            // Verify submission success
            try {
                // Wait up to 5 seconds for the confirmation panel to appear
                await page.waitForSelector('.govuk-panel.govuk-panel--confirmation', { timeout: 5000 });
                
                const successTextExists = await page.evaluate(() => {
                    const panel = document.querySelector('.govuk-panel.govuk-panel--confirmation');
                    if (!panel) return false;
                    const text = panel.textContent.toLowerCase();
                    return text.includes('we have received') || text.includes('report sent') || text.includes('submitted');
                });

                if (successTextExists) {
                    console.log(`Successfully submitted form for ${userData.email}`);
                } else {
                    const panelText = await page.evaluate(() => document.querySelector('.govuk-panel.govuk-panel--confirmation')?.textContent || 'null');
                    console.error(`Failed to verify submission for ${userData.email}. Success text incorrect. Panel text was: "${panelText.trim()}"`);
                    return false;
                }
            } catch (error) {
                console.error(`Failed to verify submission for ${userData.email}. Success panel missing.`);
                return false;
            }
        }
        
        return true;
    } catch (e) {
        console.error('[FATAL] Puppeteer automation error:', e.stack || e.message);
        return false;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { submitGovForm, getConfig };
