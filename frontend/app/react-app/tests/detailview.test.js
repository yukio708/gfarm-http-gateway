const { test, expect } = require("@playwright/test");
const fs = require("fs");

const {
    waitForReact,
    findChildrenByPath,
    findNodeByPath,
    getSize,
    handleRoute,
    FRONTEND_URL,
    API_URL,
    DIR_LIST,
    ROUTE_STORAGE,
} = require("./test_func");

let fileStructureData = null;

// Helper function to click a file's detail button and wait for the modal to open
async function openDetailModal(page, fileName) {
    const fileRow = page.locator("tbody tr", { hasText: fileName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const detailButton = page
        .locator(".dropdown-menu")
        .locator(`[data-testid="detail-menu-${fileName}"]`);
    await expect(detailButton).toBeVisible();

    await detailButton.click();

    await expect(page.locator(".custom-sidepanel")).toBeVisible();
}

// Helper function to close the detail modal
async function closeDetailModal(page) {
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

// --- Detail View Test ---
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

test("display file name in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await openDetailModal(page, expectedFile.name);

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator(".table tbody tr", { hasText: "File:" }).locator("td").nth(1)
        ).toHaveText(expectedDetail.File);

        await closeDetailModal(page);
    }
});

test("display file type in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await openDetailModal(page, expectedFile.name);

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator(".table tbody tr", { hasText: "File Type:" }).locator("td").nth(1)
        ).toHaveText(expectedDetail.Filetype);

        await closeDetailModal(page);
    }
});

test("display file size in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await openDetailModal(page, expectedFile.name);

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator(".table tbody tr", { hasText: "Size:" }).locator("td").nth(1)
        ).toHaveText(getSize(expectedDetail.Size, false));

        await closeDetailModal(page);
    }
});

test("display permissions in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await openDetailModal(page, expectedFile.name);

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator(".table tbody tr", { hasText: "Permissions:" }).locator("td").nth(1)
        ).toHaveText(expectedDetail.Mode);

        await closeDetailModal(page);
    }
});

test("display access time in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await openDetailModal(page, expectedFile.name);

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator(".table tbody tr", { hasText: "Accessed:" }).locator("td").nth(1)
        ).toHaveText(expectedDetail.Access);

        await closeDetailModal(page);
    }
});

test("display modified time in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await openDetailModal(page, expectedFile.name);

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator(".table tbody tr", { hasText: "Last Modified:" }).locator("td").nth(1)
        ).toHaveText(expectedDetail.Modify);

        await closeDetailModal(page);
    }
});

test("display change time in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await openDetailModal(page, expectedFile.name);

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator(".table tbody tr", { hasText: "Change:" }).locator("td").nth(1)
        ).toHaveText(expectedDetail.Change);

        await closeDetailModal(page);
    }
});

test("display owner uid in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await openDetailModal(page, expectedFile.name);

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator(".table tbody tr", { hasText: "Owner UID:" }).locator("td").nth(1)
        ).toHaveText(expectedDetail.Uid);

        await closeDetailModal(page);
    }
});

test("display owner gid in details", async ({ page }) => {
    const currentDirectory = "/documents";
    const expectedChildren = findChildrenByPath(fileStructureData, currentDirectory);
    for (const expectedFile of expectedChildren) {
        const testFilePath = `${currentDirectory}/${expectedFile.name}`;

        await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
        await openDetailModal(page, expectedFile.name);

        const expectedDetail = getExpectedDetailData(testFilePath);
        await expect(
            page.locator(".table tbody tr", { hasText: "Owner GID:" }).locator("td").nth(1)
        ).toHaveText(expectedDetail.Gid);

        await closeDetailModal(page);
    }
});
