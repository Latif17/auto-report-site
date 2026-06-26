const puppeteer = require('puppeteer');

function formatTime(timeStr) {
    if (!timeStr) return '11:00am';
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) return timeStr;
    const [h, m] = timeStr.split(':');
    let hour = parseInt(h, 10);
    const suffix = hour >= 12 ? 'pm' : 'am';
    hour = hour % 12 || 12;
    return `${hour}:${m || '00'}${suffix}`;
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
        const isTestMode = process.env.TEST_MODE === 'true';
        
        const launchArgs = { 
            headless: isTestMode ? false : "new", 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        };
        
        if (isTestMode) {
            launchArgs.slowMo = 50; // Slow down so you can watch it
        }
        
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchArgs.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        browser = await puppeteer.launch(launchArgs);
        const page = await browser.newPage();

        // Page 1: Where is smell coming from?
        await page.goto('https://report-an-environmental-problem.service.gov.uk/smell/source', { waitUntil: 'networkidle0' });
        await clickLabel(page, 'industrial site');
        await goNext(page);

        // Page 2: Can you give details?
        await clickLabel(page, 'Yes');
        await page.type('input[name="site_name"]', 'ReFoods UK (Dagenham), East London BioGas, Veolia Dagenham').catch(()=>{});
        await page.type('input[name="site_street"]', 'Choats Rd Dagenham').catch(()=>{});
        // We just type in whatever inputs exist on this page
        await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            if(inputs[0]) inputs[0].value = 'ReFoods UK (Dagenham), East London BioGas, Veolia Dagenham';
            if(inputs[1]) inputs[1].value = 'Choats Rd Dagenham';
            if(inputs[2]) inputs[2].value = 'RM9 6LF';
        });
        await goNext(page);

        // Page 3: Affecting you at home?
        await clickLabel(page, 'Yes');
        await goNext(page);

        // Page 4 & 5: Find your address (skip lookup, enter manually)
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
        await clickLabel(page, 'You cannot describe it');
        await goNext(page);

        // Page 7: Problems before?
        await clickLabel(page, 'happens often');
        await goNext(page);

        // Page 8: What date?
        await clickLabel(page, 'Earlier today');
        await goNext(page);

        // Page 9: What time?
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
        await clickLabel(page, 'Yes');
        await goNext(page);

        // Page 11: How strong?
        await clickLabel(page, 'Extremely strong'); // or map severity
        await goNext(page);

        // Page 12: Noticeable indoors?
        await clickLabel(page, 'Yes');
        await goNext(page);

        // Page 13: Sticks to clothing?
        await clickLabel(page, 'Yes');
        await goNext(page);

        // Page 14: Because of the smell...
        await clickLabel(page, 'Leave the area');
        await clickLabel(page, 'Keep windows');
        await clickLabel(page, 'Avoid using parts');
        await goNext(page);

        // Page 15: Health problems
        await clickLabel(page, 'Headache');
        await clickLabel(page, 'Watering eyes');
        await clickLabel(page, 'Sickness or nausea');
        await goNext(page);

        // Page 16: Medical help
        await clickLabel(page, 'No');
        await goNext(page);

        // Page 17: Contact details
        await page.evaluate((userData) => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]'));
            if(inputs[0] && userData.fullName) inputs[0].value = userData.fullName;
            if(inputs[1] && userData.email) inputs[1].value = userData.email;
            if(inputs[2] && userData.phone) inputs[2].value = userData.phone;
        }, userData);
        await goNext(page);

        // Page 18: Images/videos?
        await clickLabel(page, 'No');
        await goNext(page);

        // Page 19: Anything else
        await page.evaluate((desc) => {
            const ta = document.querySelector('textarea');
            if (ta) ta.value = desc || '';
        }, incidentData.description);
        
        // Final submit
        if (isTestMode) {
            console.log('TEST MODE ACTIVE: Skipping final form submission. Browser will close in 5 seconds...');
            await new Promise(r => setTimeout(r, 5000));
        } else {
            await goNext(page);
            console.log(`Successfully submitted form for ${userData.email}`);
        }
        
        return true;
    } catch (e) {
        console.error("Puppeteer automation error:", e.message);
        return false;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { submitGovForm };
