const { test, expect } = require("@playwright/test");
const fs = require("fs");

const {
    waitForReact,
    findChildrenByPath,
    findNodeByPath,
    clickMenuItemformView,
    getSize,
    handleRoute,
    FRONTEND_URL,
    API_URL,
    DIR_LIST,
    ROUTE_STORAGE,
} = require("./test_func");

let fileStructureData = null;

async function closeDetailTab(page) {
    const sidepanel = page.locator(".custom-sidepanel");
    const closeButton = sidepanel.locator(".btn-close");
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await expect(page.locator(".custom-sidepanel.hide")).toBeVisible();
}

test.beforeAll(async () => {
    await waitForReact();
    fileStructureData = JSON.parse(fs.readFileSync(DIR_LIST, "utf-8"));
});

// === Tests ===

test.beforeEach(async ({ context }) => {
    await waitForReact();
    fileStructureData = JSON.parse(fs.readFileSync(DIR_LIST, "utf-8"));
    await context.route(`${API_URL}/**`, (route, request) => handleRoute(route, request));
});

const getExpectedDetailData = (filePath) => {
    const fileNode = findNodeByPath(fileStructureData, filePath);
    if (!fileNode) return null;

    return {
        File: fileNode.name,
        Filetype: fileNode.name.includes(".")
            ? fileNode.name.split(".").pop()
            : fileNode.is_file
              ? "regular file"
              : "directory",
        Size: fileNode.size,
        Mode: fileNode.mode_str,
        Access: fileNode.mtime_str, // Use 'mtime_str'
        Modify: fileNode.mtime_str, // Use 'mtime_str'
        Change: fileNode.mtime_str, // Use 'mtime_str'
        Uid: fileNode.uname, // Use 'uname'
        Gid: fileNode.gname, // Use 'gname'
        MetadataHost: "test-host.local",
        MetadataPort: 8080,
        MetadataUser: "testuser",
    };
};

// === Tests ===

test("display file name in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemformView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-File"]').locator("td").nth(1)).toHaveText(
            expectedDetail.File
        );

        await closeDetailTab(page);
    }
});

test("display file type in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemformView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator('[data-testid="detail-File Type"]').locator("td").nth(1)
        ).toHaveText(expectedDetail.Filetype);

        await closeDetailTab(page);
    }
});

test("display file size in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemformView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Size"]').locator("td").nth(1)).toHaveText(
            getSize(expectedDetail.Size, false)
        );

        await closeDetailTab(page);
    }
});

test("display permissions in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemformView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator('[data-testid="detail-Permissions"]').locator("td").nth(1)
        ).toHaveText(expectedDetail.Mode);

        await closeDetailTab(page);
    }
});

test("display access time in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemformView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Access"]').locator("td").nth(1)).toHaveText(
            expectedDetail.Access
        );

        await closeDetailTab(page);
    }
});

test("display modified time in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemformView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Modify"]').locator("td").nth(1)).toHaveText(
            expectedDetail.Modify
        );

        await closeDetailTab(page);
    }
});

test("display change time in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemformView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Change"]').locator("td").nth(1)).toHaveText(
            expectedDetail.Change
        );

        await closeDetailTab(page);
    }
});

test("display owner uid in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemformView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Owner"]').locator("td").nth(1)).toHaveText(
            expectedDetail.Uid
        );

        await closeDetailTab(page);
    }
});

test("display owner gid in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemformView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Group"]').locator("td").nth(1)).toHaveText(
            expectedDetail.Gid
        );

        await closeDetailTab(page);
    }
});
