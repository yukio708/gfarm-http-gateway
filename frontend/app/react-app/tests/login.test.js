const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const FRONTEND_URL = "http://localhost:3000";
const LOGIN_HTML = path.resolve(__dirname, "../../../../templates/login.html");
const DIR_LIST = path.resolve(__dirname, "data/datalist.json");
console.log(LOGIN_HTML);

let login = false;

// Wait for React frontend to start
// async function waitForReact() {
//     for (let i = 0; i < 10; i++) {
//         try {
//             await new Promise((resolve, reject) => {
//                 const req = http.get(FRONTEND_URL, res => {
//                     res.statusCode === 200 ? resolve() : reject();
//                 });
//                 req.on("error", reject);
//             });
//             return;
//         } catch {
//             await new Promise(res => setTimeout(res, 1000));
//         }
//     }
//     throw new Error("React app is not up!");
// }

// Read login.html once at the start
const htmlContent = fs.readFileSync(LOGIN_HTML, "utf-8");

// Route handler
async function handleRoute(route, request) {
    const url = request.url();
    if (url.includes("/login_oidc")) {
        console.log("/login_oidc", url);
        login = true;
        await route.fulfill({
            status: 302,
            headers: { Location: FRONTEND_URL },
        });
    } else if (url.includes("/d/")) {
        console.log("/d/", url);
        const jsonData = JSON.parse(fs.readFileSync(DIR_LIST, "utf-8"));
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(jsonData),
        });
    } else if (url.includes("/user_info")) {
        console.log("/user_info", url);
        if (login) {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ username: "user1" }),
            });
        } else {
            const responseData = {
                detail: {
                    command: "whoami",
                    message: "Authentication error",
                    stdout: "",
                    stderr: "",
                },
            };
            await route.fulfill({
                status: 401,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(responseData),
            });
        }
    } else if (url.includes("/redirect")) {
        login = true;
        const fakeToken = "fake";
        const redirectUrl = `${FRONTEND_URL}?code=fake-auth-code&access_token=${fakeToken}`;
        await route.fulfill({
            status: 301,
            headers: { Location: redirectUrl },
        });
    } else if (url.includes("/login")) {
        console.log("/login", url);
        await route.fulfill({
            status: 200,
            contentType: "text/html",
            body: htmlContent,
        });
    } else {
        await route.continue();
    }
}

// === Tests ===

// test.beforeAll(async () => {
//     await waitForReact();
// });

test("Login title should be visible", async ({ page }) => {
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
    await page.locator("#title").waitFor({ state: "visible" });
    await expect(page.locator("#title")).toBeVisible();
});

test("Login button should be visible", async ({ page }) => {
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
    await page.locator("#title").waitFor({ state: "visible" });
    await expect(page.locator("#oidc-btn")).toBeVisible();
});

test("OIDC login with valid token should show file table", async ({ page }) => {
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });
    await page.locator("#title").waitFor({ state: "visible" });

    await Promise.all([page.waitForNavigation(), page.click("text=Login with OpenID provider")]);

    const fileTable = await page.waitForSelector(".file-table", {
        timeout: 10000,
    });
    const fileText = await fileTable.textContent();

    console.log(`File text: ${fileText}`);
    expect(fileText).toContain("dir1");
});

test("OIDC: refresh token after access token expiry", async ({ page }) => {
    // TODO: Mock expired access token → refresh token auto-login behavior
    // TODO: Check if user session remains active
    // Confirm via FastAPI
});

test("OIDC: redirect when both tokens are expired", async ({ page }) => {
    // TODO: Mock both access & refresh tokens as expired
    // TODO: Check if user is redirected to login screen automatically
    // Confirm via FastAPI
});

test("OIDC: invalid access token", async ({ page }) => {
    // TODO: Mock a state with an invalid access token
    // TODO: Ensure login fails appropriately
    // Confirm via FastAPI
});

test("SASL login: valid user credentials", async ({ page }) => {
    await page.goto("http://react:3000");
    // TODO: Fill in correct username and password
    // TODO: Check post-login screen
});

test("SASL login: invalid user credentials", async ({ page }) => {
    await page.goto("http://react:3000");
    // TODO: Fill in wrong username/password
    // TODO: Confirm login failure
});

// Logout Process Test

test("Logout: should return to login screen", async ({ page }) => {
    // TODO: Pre-authenticate the user
    // TODO: Click logout button
    // TODO: Verify redirection to login screen
});
