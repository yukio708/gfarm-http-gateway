const { test, expect } = require("@playwright/test");

const { waitForReact, handleRoute, API_URL, FRONTEND_URL, ROUTE_STORAGE } = require("./test_func");

// === Tests ===
test.beforeEach(async ({ context }) => {
    await waitForReact();
    await context.route(`${API_URL}/**`, (route, request) => handleRoute(route, request));
});

test("move a file", async ({ page }) => {
    const currentDirectory = "/documents";
    const destinationDirectory = "/images";
    const testFileName = "meeting_notes.txt";

    await page.route(`${API_URL}/move`, async (route) => {
        console.log(`[ROUTE MOCK] Simulating delayed move for: ${testFileName}`);
        await page.waitForTimeout(1000);
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
        });
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: testFileName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const moveButton = page
        .locator(".dropdown-menu")
        .locator(`[data-testid="move-menu-${testFileName}"]`);
    await expect(moveButton).toBeVisible();
    await moveButton.click();

    const moveModal = page.locator('[data-testid="move-modal"]');
    await expect(moveModal).toBeVisible();

    await page.fill("#move-dest-input", destinationDirectory);

    // Click confirm
    const confirmButton = page.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(moveModal).not.toBeVisible();

    // Should show deleting overlay
    await expect(page.locator('[data-testid="move-overlay"]')).toBeVisible();
    await expect(page.locator('[data-testid="move-overlay"]')).not.toBeVisible();
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
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
        });
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    for (const fileName of filesToMove) {
        const fileRow = page.locator("tbody tr", { hasText: fileName });
        await fileRow.locator('input[type="checkbox"]').check();
    }

    const actionmenu = page.locator('[data-testid="action-menu"]');
    const moveButton = actionmenu.locator('[data-testid="action-menu-move"]');
    await moveButton.click();

    const moveModal = page.locator('[data-testid="move-modal"]');
    await expect(moveModal).toBeVisible();

    await page.fill("#move-dest-input", destinationDirectory);

    // Click confirm
    const confirmButton = page.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(moveModal).not.toBeVisible();
});

test("move name conflict prompt", async ({ page }) => {
    const currentDirectory = "/documents";
    const destinationDirectory = "/documents/documents";
    const filesToMove = ["report.docx", "meeting_notes.txt"];

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    for (const fileName of filesToMove) {
        const fileRow = page.locator("tbody tr", { hasText: fileName });
        await fileRow.locator('input[type="checkbox"]').check();
    }

    const actionmenu = page.locator('[data-testid="action-menu"]');
    const moveButton = actionmenu.locator('[data-testid="action-menu-move"]');
    await moveButton.click();

    const moveModal = page.locator('[data-testid="move-modal"]');
    await expect(moveModal).toBeVisible();

    await page.fill("#move-dest-input", destinationDirectory);

    // Click confirm
    const confirmButton = page.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(moveModal).not.toBeVisible();

    const overwriteModal = page.locator('[data-testid="conflict-modal"]');
    await expect(overwriteModal).toBeVisible();

    const duplicateFileName = page.locator(`[id="current-${filesToMove[0]}"]`);
    await expect(duplicateFileName).toBeVisible();
    await duplicateFileName.check();
    const notDuplicateFileName = page.locator(`[id="current-${filesToMove[1]}"]`);
    await expect(notDuplicateFileName).not.toBeVisible();

    const conflict_confirmButton = page.locator('[data-testid="modal-button-confirm"]');
    await expect(conflict_confirmButton).toBeVisible();
    await conflict_confirmButton.click();

    await expect(overwriteModal).not.toBeVisible();
});

test("move error", async ({ page }) => {
    const currentDirectory = "/documents";
    const destinationDirectory = "/images";
    const testFileName = "meeting_notes.txt";

    await page.route(`${API_URL}/move`, async (route) => {
        console.log(`[ROUTE MOCK] Simulating error for: ${testFileName}`);
        await route.fulfill({
            status: 403,
            contentType: "application/json",
            body: JSON.stringify({
                detail: { message: "Permission denied", stdout: "", stderr: "" },
            }),
        });
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: testFileName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const moveButton = page
        .locator(".dropdown-menu")
        .locator(`[data-testid="move-menu-${testFileName}"]`);
    await expect(moveButton).toBeVisible();
    await moveButton.click();

    const moveModal = page.locator('[data-testid="move-modal"]');
    await expect(moveModal).toBeVisible();

    await page.fill("#move-dest-input", destinationDirectory);

    // Click confirm
    const confirmButton = page.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(moveModal).not.toBeVisible();

    const errorNotification = page.locator('[data-testid^="notification-"]');
    await expect(errorNotification).toBeVisible();
    await expect(errorNotification).toContainText("403");
    await expect(errorNotification).toContainText("Permission denied");
});
