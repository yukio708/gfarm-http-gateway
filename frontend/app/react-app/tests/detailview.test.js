const { test, expect } = require("@playwright/test");
const fs = require("fs");

const {
    findChildrenByPath,
    findNodeByPath,
    clickMenuItemFromView,
    getSize,
    symbolicToOctal,
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

// === Tests ===

test.beforeEach(async ({ context }) => {
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
        Cksum: "123456",
        CksumType: "test",
    };
};

// === Tests ===

test("Should display file name in the details panel", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemFromView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Path"]').locator("td").nth(1)).toHaveText(
            expectedDetail.File
        );

        await closeDetailTab(page);
    }
});

test("Should display file type in the details panel", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemFromView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Type"]').locator("td").nth(1)).toHaveText(
            expectedDetail.Filetype
        );

        await closeDetailTab(page);
    }
});

test("Should display file size in the details panel", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemFromView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Size"]').locator("td").nth(1)).toHaveText(
            getSize(expectedDetail.Size, false)
        );

        await closeDetailTab(page);
    }
});

test("Should display permissions in the details panel", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemFromView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Mode"]').locator("td").nth(1)).toHaveText(
            symbolicToOctal(expectedDetail.Mode)
        );

        await closeDetailTab(page);
    }
});

test("Should display last access time in the details panel", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemFromView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Access"]').locator("td").nth(1)).toHaveText(
            expectedDetail.Access
        );

        await closeDetailTab(page);
    }
});

test("Should display last modified time in the details panel", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemFromView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Modify"]').locator("td").nth(1)).toHaveText(
            expectedDetail.Modify
        );

        await closeDetailTab(page);
    }
});

test("Should display change time in the details panel", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemFromView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Change"]').locator("td").nth(1)).toHaveText(
            expectedDetail.Change
        );

        await closeDetailTab(page);
    }
});

test("Should display file owner (UID) in the details panel", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemFromView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Owner"]').locator("td").nth(1)).toHaveText(
            expectedDetail.Uid
        );

        await closeDetailTab(page);
    }
});

test("Should display file group (GID) in the details panel", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemFromView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(page.locator('[data-testid="detail-Group"]').locator("td").nth(1)).toHaveText(
            expectedDetail.Gid
        );

        await closeDetailTab(page);
    }
});

test("Should display cksum in the details panel", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await clickMenuItemFromView(page, expectedFile.name, "detail");

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator('[data-testid="detail-Cksum"]').locator("td").nth(1)
        ).toContainText(expectedDetail.Cksum);
        await expect(
            page.locator('[data-testid="detail-Cksum"]').locator("td").nth(1)
        ).toContainText(expectedDetail.CksumType);

        await closeDetailTab(page);
    }
});
