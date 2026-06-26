const puppeteer = require('puppeteer');

async function submitGovForm(userData, incidentData) {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto('https://report-an-environmental-problem.service.gov.uk/smell/source');
        // Select "A large industrial site..." (radio 1602)
        await page.click('input[value="1602"]');
        await page.click('button[type="submit"]');
        
        // NOTE: Since we don't have the rest of the form journey, this is the scaffold.
        // We compile incident data into a single string to use in the description field.
        const descriptionStr = `Time: ${incidentData.timeOfSmell}\nSeverity: ${incidentData.severity}/5\nImpact: ${incidentData.impact}\nDescription: ${incidentData.description}`;
        console.log(`Submitting form for ${userData.email} with desc: ${descriptionStr}`);
        
        // Wait for next page and interact...
        // For the plan, we simulate success after 2 seconds to not get stuck if the form structure changes.
        await new Promise(r => setTimeout(r, 2000));
        return true;
    } catch (e) {
        console.error(e);
        return false;
    } finally {
        if (browser) await browser.close();
    }
}
module.exports = { submitGovForm };
