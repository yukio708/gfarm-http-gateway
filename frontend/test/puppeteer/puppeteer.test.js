const puppeteer = require('puppeteer');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;


describe('Puppeteer test', function () {
    let browser;
    let page;
  
    before(async () => {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        page = await browser.newPage();
        
        const jsonData = JSON.parse(fs.readFileSync('/data/datalist.json', 'utf-8'));
        // Intercept and mock the API request
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.url().includes('/d/')) {
                console.log("Intercepted!", request.url());
                request.respond({
                    status: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(jsonData),
                });
            } else {
                request.continue();
            }
        });
    });
  
    after(async () => {
      await browser.close();
    });
  
    it('Check Header', async () => {
        await page.goto('http://react:3000');
    
        const header = await page.$('.App-header');
        const header_text = await page.evaluate(el => el.textContent, header);
        console.log(header_text);
        expect(header_text).to.equal("Hello!");

    });
    
    it('file2.jpg should be visible in UI', async () => {
        await page.goto('http://react:3000');
        
        const items = await page.$$('.App');
        for (const item of items) {
            const text = await page.evaluate(el => el.textContent, item);
            console.log(text);
        }

        const isVisible = await page.$eval('body', body => body.innerText.includes('file2.jpg'));
        expect(isVisible).to.be.true;

    });
});




