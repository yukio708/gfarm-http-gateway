const { test, expect } = require("@playwright/test");

const {
    waitForReact,
    handleRoute,
    clickMenuItemFromView,
    API_URL,
    FRONTEND_URL,
    ROUTE_STORAGE,
    ROUTE_DOWNLOAD,
} = require("./test_func");

// === Tests ===

test.beforeEach(async ({ context }) => {
    await waitForReact();
    await context.route(`${API_URL}/**`, (route, request) => handleRoute(route, request));
});

// Copy link
test("copy link button (webui)", async ({ page }) => {
    const currentDirectory = "/documents";
    const targetFile = "report.docx";

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    await clickMenuItemFromView(page, targetFile, "url");

    const acltab = page.locator('[data-testid="url-tab"]');

    const input = acltab.locator("#webui-path-input");
    await expect(input).toBeVisible();

    await expect(input).toHaveValue(
        `${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}/${targetFile}`
    );
});

test("copy link button (download)", async ({ page }) => {
    const currentDirectory = "/documents";
    const targetFile = "report.docx";

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    await clickMenuItemFromView(page, targetFile, "url");

    const acltab = page.locator('[data-testid="url-tab"]');
    const input = acltab.locator("#download-path-input");
    await expect(input).toBeVisible();

    await expect(input).toHaveValue(
        `${FRONTEND_URL}/#${ROUTE_DOWNLOAD}${currentDirectory}/${targetFile}`
    );

    await page.goto(`${FRONTEND_URL}/#${ROUTE_DOWNLOAD}${currentDirectory}/${targetFile}`);
    await expect(page.locator("body")).toContainText(
        `This is the content of ${currentDirectory}/${targetFile}.`
    );
});

test("copy link button (api)", async ({ page }) => {
    const currentDirectory = "/documents";
    const targetFile = "report.docx";

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    await clickMenuItemFromView(page, targetFile, "url");

    const acltab = page.locator('[data-testid="url-tab"]');
    const input = acltab.locator("#resource-path-input");
    await expect(input).toBeVisible();

    await expect(input).toHaveValue(`${FRONTEND_URL}/file${currentDirectory}/${targetFile}`);
});
