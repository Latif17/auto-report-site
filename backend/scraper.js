const puppeteer = require('puppeteer');

async function clickLabel(page, text) {
    await page.evaluate((textToFind) => {
        const labels = Array.from(document.querySelectorAll('label'));
        const target = labels.find(l => l.textContent.includes(textToFind));
        if (target) {
            const inputId = target.getAttribute('for');
            if (inputId) {
                const el = document.getElementById(inputId);
                if (el) el.click();
            } else {
                target.click();
            }
        } else {
            console.warn("Could not find label for:", textToFind);
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

        // Page 4: Find your address (skip lookup)
        await page.evaluate(() => {
            const manualLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('Enter address manually'));
            if (manualLink) manualLink.click();
        });
        await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(()=>{});

        // Page 5: Enter address
        // Try to fill standard address fields, fallback to eval
        await page.evaluate((userData) => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            if(inputs[0]) inputs[0].value = userData.address || '11 Kentfield Street';
            if(inputs[1]) inputs[1].value = 'Barking Riverside'; // Town
            if(inputs[inputs.length-1]) inputs[inputs.length-1].value = userData.postcode || 'IG11 0ZA';
        }, userData);
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
        await page.evaluate((time) => {
            const input = document.querySelector('input[type="text"], input[type="time"]');
            if (input) input.value = time || '11:00pm';
        }, incidentData.timeOfSmell);
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
            if (ta) ta.value = desc || 'Skip this';
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
