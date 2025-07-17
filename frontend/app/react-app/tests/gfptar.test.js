const { test, expect } = require("@playwright/test");
const fs = require("fs");

const { waitForReact, handleRoute, API_URL, FRONTEND_URL, ROUTE_STORAGE } = require("./test_func");

const currentDirectory = "/documents";
const outdir = "/archives";
const filesToGfptar = ["report.docx", "meeting_notes.txt"];

// === Tests ===
test.beforeEach(async ({ context }) => {
    await waitForReact();
    await context.route(`${API_URL}/**`, (route, request) => handleRoute(route, request));
});

async function setupMockGfptar(route, expectedCommand, basedir, outdir, sources) {
    const request = route.request();
    const body = JSON.parse(request.postData());

    expect(body.command).toBe(expectedCommand);
    if (basedir) expect(body.basedir).toBe(basedir);
    if (outdir) expect(body.outdir).toBe(outdir);
    for (const fileName of filesToGfptar) {
        expect(body.source).toContain(fileName);
    }

    const headers = {
        "content-type": "application/json",
        "transfer-encoding": "chunked",
    };

    let chunks = "";
    for (let count = 1; count <= 10; count++) {
        chunks += JSON.stringify({ message: `test ${count}` }) + "\n";
    }

    await route.fulfill({
        status: 200,
        headers,
        body: chunks,
    });
}

async function openGfptarModal(page, commandLabel = "Create archive") {
    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    for (const fileName of filesToGfptar) {
        const fileRow = page.locator("tbody tr", { hasText: fileName });
        await fileRow.locator(`[id="checkbox-${fileName}"]`).check();
    }

    const actionmenu = page.locator('[data-testid="action-menu"]');
    await actionmenu.locator('[data-testid="action-menu-gfptar"]').click();

    const gfptarModal = page.locator('[data-testid="gfptar-modal"]');
    await expect(gfptarModal).toBeVisible();

    const commandDropdown = gfptarModal.locator('[data-testid="gfptar-command"]');
    await commandDropdown.selectOption({ label: commandLabel });

    const outdirInput = gfptarModal.locator('[data-testid="gfptar-outdir"]');
    await outdirInput.fill(outdir);

    const confirmButton = gfptarModal.locator('[data-testid="modal-button-confirm"]');
    await confirmButton.click();

    await expect(gfptarModal).not.toBeVisible();
}

test("Create archive", async ({ page }) => {
    const currentDirectory = "/documents";
    const filesToGfptar = ["report.docx", "meeting_notes.txt"];
    const archiveName = "/test-archive";

    await page.route(`${API_URL}/gfptar`, async (route) => {
        console.log(`[ROUTE MOCK] Simulating gfptar for: ${filesToGfptar}`);
        const request = route.request();
        const bodyText = request.postData();

        await expect(bodyText).toContain(archiveName);
        await expect(bodyText).toContain("create");
        for (const fileName of filesToGfptar) {
            await expect(bodyText).toContain(fileName);
        }

        const headers = {
            "content-type": "application/json",
            "transfer-encoding": "chunked",
        };

        let chunks = "";
        let count = 0;
        const total = 10;

        while (count < total) {
            count++;
            chunks += JSON.stringify({ message: `test ${count}` }) + "\n";
        }

        await route.fulfill({
            status: 200,
            headers,
            body: chunks,
        });
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    for (const fileName of filesToGfptar) {
        const fileRow = page.locator("tbody tr", { hasText: fileName });
        await fileRow.locator(`[id="checkbox-${fileName}"]`).check();
    }

    const actionmenu = page.locator('[data-testid="action-menu"]');
    const gfptarButton = actionmenu.locator('[data-testid="action-menu-gfptar"]');
    await gfptarButton.click();

    const gfptarModal = page.locator('[data-testid="gfptar-modal"]');
    await expect(gfptarModal).toBeVisible();

    const outdirInput = gfptarModal.locator('[data-testid="outdir-input"]');
    await outdirInput.fill();

    const radioButton = page.locator('[id="mode-create"]');
    await expect(radioButton).toBeVisible(archiveName);
    await radioButton.click();

    const confirmButton = page.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(gfptarModal).not.toBeVisible();
});
test("Update archive", async ({ page }) => {
    const currentDirectory = "/documents";
    const filesToGfptar = ["report.docx", "meeting_notes.txt"];

    await page.route(`${API_URL}/gfptar`, async (route) => {
        const bodyText = route.request().postData();
        await expect(bodyText).toContain("update");
        for (const fileName of filesToUpdate) {
            await expect(bodyText).toContain(fileName);
        }
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ message: "Update completed" }),
        });
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);

    for (const fileName of filesToGfptar) {
        const fileRow = page.locator("tbody tr", { hasText: fileName });
        await fileRow.locator(`[id="checkbox-${fileName}"]`).check();
    }

    const actionmenu = page.locator('[data-testid="action-menu"]');
    const gfptarButton = actionmenu.locator('[data-testid="action-menu-gfptar"]');
    await gfptarButton.click();

    const gfptarModal = page.locator('[data-testid="gfptar-modal"]');
    await expect(gfptarModal).toBeVisible();

    const radioButton = page.locator('[id="mode-update"]');
    await expect(radioButton).toBeVisible();
    await radioButton.click();

    const confirmButton = page.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(gfptarModal).not.toBeVisible();
});

test("Append archive", async ({ page }) => {
    const archiveName = "archive_append.tar";
    const filesToAppend = ["append_this.txt"];

    await page.route(`${API_URL}/gfptar`, async (route) => {
        const bodyText = route.request().postData();
        for (const fileName of filesToAppend) {
            await expect(bodyText).toContain(fileName);
        }
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ message: "Append completed" }),
        });
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}/documents`);

    for (const fileName of filesToAppend) {
        await page.locator(`[id="checkbox-${fileName}"]`).check();
    }

    await page
        .locator('[data-testid="action-menu"]')
        .locator('[data-testid="action-menu-gfptar"]')
        .click();
    await page
        .locator('[data-testid="gfptar-modal"]')
        .locator('[data-testid="tar-operation"]')
        .selectOption("append");
    await page.locator('[data-testid="modal-archive-name"]').fill(archiveName);
    await page.locator('[data-testid="modal-button-confirm"]').click();
    await expect(page.locator('[data-testid="gfptar-modal"]')).not.toBeVisible();
});

test("get indir members", async ({ page }) => {
    const archiveName = "nested.tar";

    await page.route(`${API_URL}/gfptar/members`, async (route) => {
        const members = ["folder1/fileA.txt", "folder2/fileB.txt"];
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ members }),
        });
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}/documents`);

    const archiveRow = page.locator("tbody tr", { hasText: archiveName });
    await archiveRow.locator(`[id="checkbox-${archiveName}"]`).check();

    await page
        .locator('[data-testid="action-menu"]')
        .locator('[data-testid="action-menu-members"]')
        .click();
    await expect(page.locator('[data-testid="members-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="members-modal"]')).toContainText("folder1/fileA.txt");
    await expect(page.locator('[data-testid="members-modal"]')).toContainText("folder2/fileB.txt");
});

test("Extract archive", async ({ page }) => {
    const archiveName = "extract_me.tar";

    await page.route(`${API_URL}/gfptar/extract`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ message: "Extraction completed" }),
        });
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}/documents`);

    const archiveRow = page.locator("tbody tr", { hasText: archiveName });
    await archiveRow.locator(`[id="checkbox-${archiveName}"]`).check();

    await page
        .locator('[data-testid="action-menu"]')
        .locator('[data-testid="action-menu-extract"]')
        .click();
    await expect(page.locator('[data-testid="extract-modal"]')).toBeVisible();

    await page.locator('[data-testid="modal-button-confirm"]').click();
    await expect(page.locator('[data-testid="extract-modal"]')).not.toBeVisible();
});

test("error test", async ({ page }) => {
    const filesToArchive = ["fail.txt"];

    await page.route(`${API_URL}/gfptar`, async (route) => {
        await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Internal Server Error" }),
        });
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}/documents`);

    for (const fileName of filesToArchive) {
        await page.locator(`[id="checkbox-${fileName}"]`).check();
    }

    await page
        .locator('[data-testid="action-menu"]')
        .locator('[data-testid="action-menu-gfptar"]')
        .click();
    await expect(page.locator('[data-testid="gfptar-modal"]')).toBeVisible();
    await page.locator('[data-testid="modal-button-confirm"]').click();

    const errorToast = page.locator('[data-testid="toast-error"]');
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText("Internal Server Error");
});
