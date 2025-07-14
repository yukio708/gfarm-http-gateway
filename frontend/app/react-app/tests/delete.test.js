const { test, expect } = require("@playwright/test");

const { waitForReact, handleRoute, API_URL, FRONTEND_URL, ROUTE_STORAGE } = require("./test_func");

// === Tests ===
test.beforeEach(async ({ context }) => {
    await waitForReact();
    await context.route(`${API_URL}/**`, (route, request) => handleRoute(route, request));
});

test("delete a file", async ({ page }) => {
    const currentDirectory = "/documents";
    const testFileName = "meeting_notes.txt";

    await page.route(`${API_URL}/file/**`, async (route) => {
        console.log(`[ROUTE MOCK] Simulating delayed delete for: ${testFileName}`);
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

    const deleteButton = page
        .locator(".dropdown-menu")
        .locator(`[data-testid="delete-menu-${testFileName}"]`);
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    const deleteModal = page.locator('[data-testid="delete-modal"]');
    await expect(deleteModal).toBeVisible();

    await expect(deleteModal).toContainText(testFileName);

    // Click confirm
    const confirmButton = page.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(deleteModal).not.toBeVisible();

    // Should show deleting overlay
    await expect(page.locator('[data-testid="delete-overlay"]')).toBeVisible();
    await expect(page.locator('[data-testid="delete-overlay"]')).not.toBeVisible();
});

test("delete files from actions menu", async ({ page }) => {
    const currentDirectory = "/documents";
    const filesToDelete = ["report.docx", "meeting_notes.txt"];

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    for (const fileName of filesToDelete) {
        const fileRow = page.locator("tbody tr", { hasText: fileName });
        await fileRow.locator('input[type="checkbox"]').check();
    }

    const actionmenu = page.locator('[data-testid="action-menu"]');
    const deleteButton = actionmenu.locator('[data-testid="action-menu-delete"]');
    await deleteButton.click();

    const deleteModal = page.locator('[data-testid="delete-modal"]');
    await expect(deleteModal).toBeVisible();

    for (const fileName of filesToDelete) {
        await expect(deleteModal).toContainText(fileName);
    }

    // Click confirm
    const confirmButton = page.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(deleteModal).not.toBeVisible();
});

test("delete error", async ({ page }) => {
    const currentDirectory = "/documents";
    const testFileName = "meeting_notes.txt";

    await page.route(`${API_URL}/file/**`, async (route) => {
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

    const deleteButton = page
        .locator(".dropdown-menu")
        .locator(`[data-testid="delete-menu-${testFileName}"]`);
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    const deleteModal = page.locator('[data-testid="delete-modal"]');
    await expect(deleteModal).toBeVisible();

    await expect(deleteModal).toContainText(testFileName);

    // Click confirm
    const confirmButton = page.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(deleteModal).not.toBeVisible();

    const errorNotification = page.locator('[data-testid^="notification-"]');
    await expect(errorNotification).toBeVisible();
    await expect(errorNotification).toContainText("403");
    await expect(errorNotification).toContainText("Permission denied");
});
