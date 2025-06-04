const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const http = require("http");

const FRONTEND_URL = "http://localhost:3000";
const LOGIN_HTML = path.resolve(__dirname, "../../../../templates/login.html");
const DIR_LIST = path.resolve(__dirname, "data/datalist.json");
console.log(LOGIN_HTML);

let login = false;

// Wait for React frontend to start
async function waitForReact() {
    for (let i = 0; i < 10; i++) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(FRONTEND_URL, res => {
                    res.statusCode === 200 ? resolve() : reject();
                });
                req.on("error", reject);
            });
            return;
        } catch {
            await new Promise(res => setTimeout(res, 1000));
        }
    }
    throw new Error("React app is not up!");
}

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
    } else if (url.includes("/login_passwd")) {
        console.log("/login_passwd", url);
        const postData = await request.postDataJSON?.();
        const formData = new URLSearchParams(postData || request.postData());

        if (formData.get("username") === "user1" && formData.get("password") === "pass1") {
            login = true;
            // Simulate successful login
            route.fulfill({
                status: 302,
                headers: {
                    location: FRONTEND_URL, // Redirect to some post-login page
                },
            });
        } else {
            await route.fulfill({
                status: 200,
                contentType: "text/html",
                body: htmlContent,
            });
        }
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
    } else if (url.includes("/login")) {
        console.log("/login", url);
        await route.fulfill({
            status: 200,
            contentType: "text/html",
            body: htmlContent,
        });
    } else if (url.includes("/logout")) {
        console.log("/logout", url);
        login = false;
        // Simulate redirect to index page "/"
        route.fulfill({
            status: 303, // HTTP See Other for redirect after POST/GET
            headers: {
                location: FRONTEND_URL, // Redirect to some post-login page
            },
            body: "",
        });
    } else {
        await route.continue();
    }
}

// === Tests ===

test.beforeAll(async () => {
    await waitForReact();
});

test("Login title should be visible", async ({ page }) => {
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
    await page.waitForFunction(() => window.location.href.includes("/login"));

    await expect(page.locator("#title")).toBeVisible();
});

test("Login button should be visible", async ({ page }) => {
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
    await page.waitForFunction(() => window.location.href.includes("/login"));

    await expect(page.locator("#oidc-btn")).toBeVisible();
});

test("OIDC login with valid token should show file table", async ({ page }) => {
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
    await page.waitForFunction(() => window.location.href.includes("/login"));

    await page.click("text=Login with OpenID provider");

    const fileTable = await page.waitForSelector(".file-table", {
        timeout: 10000,
    });
    const fileText = await fileTable.textContent();

    console.log(`File text: ${fileText}`);
    expect(fileText).toContain("dir1");
});

test("SASL login: valid user credentials", async ({ page }) => {
    await page.route("**/*", handleRoute);
    login = false;
    await page.goto(FRONTEND_URL);
    await page.waitForFunction(() => window.location.href.includes("/login"));

    await page.fill("#username", "user1");
    await page.fill("#password", "pass1");

    // Submit the form
    await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForResponse("**/login_passwd"),
    ]);

    // Check for login success indicator
    // Replace this selector with what your app shows after login
    await expect(page.locator(".file-table")).toBeVisible();
});

test("SASL login: invalid user credentials", async ({ page }) => {
    await page.route("**/*", handleRoute);
    login = false;
    await page.goto(FRONTEND_URL);
    await page.waitForFunction(() => window.location.href.includes("/login"));

    await page.fill("#username", "wronguser");
    await page.fill("#password", "wrongpass");

    await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForResponse("**/login_passwd"),
    ]);

    // Check for an error message (update selector to match your app)
    // If no error message, just check if it didn't redirect
    await expect(page).toHaveURL(/login/);
});

// Logout Process Test

test("Logout: should return to login screen", async ({ page }) => {
    await page.route("**/*", handleRoute);
    login = true;
    await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded" });

    await page.click('button:has-text("Logout")');

    await expect(page).toHaveURL(/login/);
});
