const { test, expect } = require("@playwright/test");

const {
    waitForReact,
    handleRoute,
    mockRoute,
    clickMenuItemformView,
    clickMenuItemformMenu,
    checkItem,
    API_URL,
    FRONTEND_URL,
    ROUTE_STORAGE,
} = require("./test_func");

async function mockMoveRoute(page, { source, destination, statusCode = 200, mockResponse = {} }) {
    await mockRoute(page, `${API_URL}/**`, "POST", "/move", {
        validateBody: (body) => {
            expect(typeof body.source).toBe("string");
            expect(typeof body.destination).toBe("string");
            if (source) expect(body.source).toBe(source);
            if (destination) expect(body.destination).toBe(destination);
        },
        statusCode,
        contentType: "application/json",
        response: JSON.stringify(mockResponse),
    });
}

// === Tests ===
test.beforeEach(async ({ context }) => {
    await waitForReact();
    await context.route(`${API_URL}/**`, (route, request) => handleRoute(route, request));
});

test("move a file", async ({ page }) => {
    const currentDirectory = "/documents";
    const destinationDirectory = "/images";
    const testFileName = "meeting_notes.txt";

    await mockMoveRoute(page, {
        source: currentDirectory + "/" + testFileName,
        destination: destinationDirectory + "/" + testFileName,
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    await clickMenuItemformView(page, testFileName, "move");

    const moveModal = page.locator('[data-testid="move-modal"]');
    await expect(moveModal).toBeVisible();

    const destdirInput = moveModal.locator('[id="move-dest-input"]');
    await destdirInput.fill(destinationDirectory);

    await page.waitForTimeout(100);

    // Click confirm
    const confirmButton = moveModal.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(moveModal).not.toBeVisible();
});

test("move files from actions menu", async ({ page }) => {
    const currentDirectory = "/documents";
    const destinationDirectory = "/images";
    const filesToMove = ["report.docx", "meeting_notes.txt"];

    let api_count = 0;
    await page.route(`${API_URL}/move`, async (route) => {
        console.log(`[ROUTE MOCK] Simulating move for: ${filesToMove[api_count]}`);
        const request = route.request();
        const bodyText = request.postData();

        await expect(bodyText).toContain(filesToMove[api_count++]);
        await page.waitForTimeout(1000);
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
        });
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    for (const fileName of filesToMove) {
        await checkItem(page, fileName);
    }

    await clickMenuItemformMenu(page, "move");

    const moveModal = page.locator('[data-testid="move-modal"]');
    await expect(moveModal).toBeVisible();

    const destdirInput = moveModal.locator('[id="move-dest-input"]');
    await destdirInput.fill(destinationDirectory);

    await page.waitForTimeout(100);

    // Click confirm
    const confirmButton = moveModal.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(moveModal).not.toBeVisible();

    // Should show deleting overlay
    await expect(page.locator('[data-testid="move-overlay"]')).toBeVisible();
    await expect(page.locator('[data-testid="move-overlay"]')).not.toBeVisible();
});

test("move name conflict prompt", async ({ page }) => {
    const currentDirectory = "/documents";
    const destinationDirectory = "/documents/documents";
    const filesToMove = ["report.docx", "meeting_notes.txt"];

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    for (const fileName of filesToMove) {
        await checkItem(page, fileName);
    }

    await clickMenuItemformMenu(page, "move");

    const moveModal = page.locator('[data-testid="move-modal"]');
    await expect(moveModal).toBeVisible();

    const destdirInput = moveModal.locator('[id="move-dest-input"]');
    await destdirInput.fill(destinationDirectory);

    await page.waitForTimeout(100);

    // Click confirm
    const confirmButton = moveModal.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(moveModal).not.toBeVisible();

    const overwriteModal = page.locator('[data-testid="conflict-modal"]');
    await expect(overwriteModal).toBeVisible();

    const duplicateFileName = overwriteModal.locator(`[id="current-${filesToMove[0]}"]`);
    await expect(duplicateFileName).toBeVisible();
    await duplicateFileName.check();
    const notDuplicateFileName = overwriteModal.locator(`[id="current-${filesToMove[1]}"]`);
    await expect(notDuplicateFileName).not.toBeVisible();

    const conflict_confirmButton = overwriteModal.locator('[data-testid="modal-button-confirm"]');
    await expect(conflict_confirmButton).toBeVisible();
    await conflict_confirmButton.click();

    await expect(overwriteModal).not.toBeVisible();
});

test("move error", async ({ page }) => {
    const currentDirectory = "/documents";
    const destinationDirectory = "/images";
    const testFileName = "meeting_notes.txt";

    await mockMoveRoute(page, {
        source: currentDirectory + "/" + testFileName,
        destination: destinationDirectory + "/" + testFileName,
        statusCode: 403,
        contentType: "application/json",
        mockResponse: {
            detail: { message: "Permission denied", stdout: "", stderr: "" },
        },
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    await clickMenuItemformView(page, testFileName, "move");

    const moveModal = page.locator('[data-testid="move-modal"]');
    await expect(moveModal).toBeVisible();

    const destdirInput = moveModal.locator('[id="move-dest-input"]');
    await destdirInput.fill(destinationDirectory);

    await page.waitForTimeout(100);

    // Click confirm
    const confirmButton = moveModal.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(moveModal).not.toBeVisible();

    const errorNotification = page.locator('[data-testid^="notification-"]');
    await expect(errorNotification).toBeVisible();
    await expect(errorNotification).toContainText("403");
    await expect(errorNotification).toContainText("Permission denied");
});
