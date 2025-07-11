const { test, expect } = require("@playwright/test");
const fs = require("fs");

const {
    waitForReact,
    handleRoute,
    API_URL,
    FRONTEND_URL,
    ROUTE_STORAGE,
    ZIPNAME,
} = require("./test_func");

// === Tests ===
test.beforeEach(async ({ context }) => {
    await waitForReact();
    await context.route(`${API_URL}/**`, (route, request) => handleRoute(route, request));
});

test("download single file", async ({ page }) => {
    const currentDirectory = "/documents";
    const testFileName = "meeting_notes.txt";

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: testFileName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const downloadButton = page
        .locator(".dropdown-menu")
        .locator(`[data-testid="download-menu-${testFileName}"]`);
    await expect(downloadButton).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;

    // Verify the downloaded file name
    expect(download.suggestedFilename()).toBe(testFileName);

    const path = await download.path(); // Get the temporary file path
    const fileContent = fs.readFileSync(path, "utf8"); // Read the file contents
    expect(fileContent).toContain(testFileName);
    expect(fs.statSync(path).size).toBeGreaterThan(0);
});

test("download multiple files", async ({ page }) => {
    const currentDirectory = "/documents";
    const filesToDownload = ["report.docx", "meeting_notes.txt"];
    const expectedZipFileName = ZIPNAME;

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    for (const fileName of filesToDownload) {
        const fileRow = page.locator("tbody tr", { hasText: fileName });
        await fileRow.locator('input[type="checkbox"]').check();
    }

    const actionmenu = page.locator('[data-testid="action-menu"]');
    const downloadButton = actionmenu.locator('[data-testid="action-menu-download"]');
    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(expectedZipFileName);

    const zipFilePath = await download.path();
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(zipFilePath);
    const zipEntries = zip.getEntries();
    for (const fileName of filesToDownload) {
        expect(zipEntries.map((entry) => entry.entryName)).toContain(fileName);
    }
});

test("download single directory", async ({ page }) => {
    const currentDirectory = "/documents";
    const testDirectoryName = "presentations";
    const expectedZipFileName = ZIPNAME;

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: testDirectoryName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const downloadButton = page
        .locator(".dropdown-menu")
        .locator(`[data-testid="download-menu-${testDirectoryName}"]`);
    await expect(downloadButton).toBeVisible();

    // ダウンロードイベントを待機しつつ、ダウンロードボタンをクリック
    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(expectedZipFileName);

    const zipFilePath = await download.path();
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(zipFilePath);
    const zipEntries = zip.getEntries();
    expect(zipEntries.map((entry) => entry.entryName)).toContain(testDirectoryName + "/");
});

test("download multiple directories", async ({ page }) => {
    const rootPath = "/";
    const dirsToDownload = ["documents", "images"];
    const expectedZipFileName = ZIPNAME;

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${rootPath}`);

    for (const dirName of dirsToDownload) {
        const dirRow = page.locator("tbody tr", { hasText: dirName });
        await dirRow.locator('input[type="checkbox"]').check();
    }

    const actionmenu = page.locator('[data-testid="action-menu"]');
    const downloadButton = actionmenu.locator('[data-testid="action-menu-download"]');
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);

    expect(download.suggestedFilename()).toBe(expectedZipFileName);

    const zipFilePath = await download.path();
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(zipFilePath);
    const zipEntries = zip.getEntries();
    for (const dirName of dirsToDownload) {
        expect(zipEntries.map((entry) => entry.entryName)).toContain(dirName + "/");
    }
});

test("download empty file", async ({ page }) => {
    const currentDirectory = "/error_test";
    const emptyFileName = "empty_file.txt";

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: emptyFileName });
    await fileRow.locator('input[type="checkbox"]').check();

    const actionmenu = page.locator('[data-testid="action-menu"]');
    const downloadButton = actionmenu.locator('[data-testid="action-menu-download"]');

    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);

    expect(download.suggestedFilename()).toBe(emptyFileName);

    const path = await download.path();
    const stats = fs.statSync(path);
    expect(stats.size).toBe(0);
});

test("download nonexistent path", async ({ page }) => {
    const currentDirectory = "/error_test";
    const testFileName = "deleted_file.txt";

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: testFileName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const downloadButton = page
        .locator(".dropdown-menu")
        .locator(`[data-testid="download-menu-${testFileName}"]`);
    await expect(downloadButton).toBeVisible();

    await downloadButton.click();

    await expect(page.locator("body")).toContainText("File not found");
});

test("download backend disconnect", async ({ page }) => {
    const currentDirectory = "/error_test";
    const testFileName = "backend_disconnect.txt";

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: testFileName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const downloadButton = page
        .locator(".dropdown-menu")
        .locator(`[data-testid="download-menu-${testFileName}"]`);
    await expect(downloadButton).toBeVisible();

    await downloadButton.click();

    await expect(page.locator("body")).toContainText("error test");
});
