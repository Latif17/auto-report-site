const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://report-an-environmental-problem.service.gov.uk/smell/source', { waitUntil: 'networkidle0' });
    
    // Page 1
    const labels = await page.$$('label');
    for (const label of labels) {
        const text = await label.evaluate(el => el.textContent.trim());
        if (text.includes('industrial site')) {
            await label.click();
            break;
        }
    }
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // Page 2
    const labels2 = await page.$$('label');
    for (const label of labels2) {
        const text = await label.evaluate(el => el.textContent.trim());
        if (text.includes('Yes')) {
            await label.click();
            break;
        }
    }
    
    await page.waitForSelector('input[type="text"]', {visible: true});
    const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input[type="text"]')).map(el => ({
            id: el.id,
            name: el.name,
            placeholder: el.placeholder
        }));
    });
    console.log("PAGE 2 INPUTS:");
    console.log(inputs);
    
    await browser.close();
}
run();
