const { chromium } = require('playwright');
const fs = require('fs');

async function handleRoute(route, request) {    
    if (request.url().includes('/dir1')) {
        const mockData = JSON.parse(fs.readFileSync('../../data/datalist2.json', 'utf8'));
        // Mocking the response for API call
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockData), // Mocked response data
        });
    } else if (request.url().includes('/d/')) {
        const mockData = JSON.parse(fs.readFileSync('../../data/datalist.json', 'utf8'));
        // Mocking the response for API call
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockData), // Mocked response data
        });
    } else {
        route.continue(); // Let other requests continue normally
    }
}

async function runTest() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Load mock data from a JSON file

    // Intercept and mock the API request
    await page.route('**/*', handleRoute);

    // Navigate to your app or page
    await page.goto('http://localhost:3000');

    // You can now perform actions on your page and verify that the mocked data is used

    // Example: Check if an element that should contain mock data is present
    const dataContainer = await page.locator('text=dir1');
    const dataText = await dataContainer.innerText();
    console.log(dataText);  // Should show mocked data

    await page.click("text=dir1");

    const dataContainer2 = await page.locator('text=dir1').all();
    for (const element of dataContainer2){
        const dataText2 = await element.innerText();
        console.log(dataText2);  // Should show mocked data
    }

    setTimeout(() => {
        browser.close();
    }, 1000);

}

runTest();