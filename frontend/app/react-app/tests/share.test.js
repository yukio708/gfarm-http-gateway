const { test, expect } = require("@playwright/test");
const fs = require("fs");

const { waitForReact, handleRoute, API_URL, FRONTEND_URL, ACLIST } = require("./test_func");

let mockAclData = null;

async function openSidePanel(page, fileName) {
    const fileRow = page.locator("tbody tr", { hasText: fileName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const detailButton = page.locator(".dropdown-menu").getByRole("button", { name: "Share" });
    await expect(detailButton).toBeVisible();

    await detailButton.click();

    await expect(page.locator(".custom-sidepanel")).toBeVisible();
}

async function assertEntry(entry, { acl_type, acl_name, acl_perms, is_default, is_dir }) {
    await expect(entry.locator("select")).toHaveValue(acl_type);
    if (acl_name !== null) {
        await expect(entry.locator(".form-control")).toHaveValue(acl_name);
    }
    for (const p of ["r", "w", "x"]) {
        const box = entry.locator(`input[id*="-${p}"]`);
        if (acl_perms[p]) {
            await expect(box).toBeChecked();
        } else {
            await expect(box).not.toBeChecked();
        }
    }

    if (is_dir) {
        if (is_default) {
            const def = entry.locator('input[id^="default-"]');
            await expect(def).toBeChecked();
        } else if (acl_name !== null) {
            const def = entry.locator('input[id^="default-"]');
            await expect(def).not.toBeChecked();
        } else {
            await expect(entry.locator('input[id^="default-"]')).not.toBeVisible();
        }
    } else {
        await expect(entry.locator('input[id^="default-"]')).not.toBeVisible();
    }
}

// === Tests ===

test.beforeEach(async ({ context }) => {
    await waitForReact();
    mockAclData = JSON.parse(fs.readFileSync(ACLIST, "utf-8"));
    await context.route(`${API_URL}/**`, (route, request) => handleRoute(route, request));
});

// Get ACL
test("get ACL entry", async ({ page }) => {
    const currentDirectory = "/documents";
    const targetFile = "report.docx";

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    await openSidePanel(page, targetFile);

    const acltab = page.locator('[data-testid="acl-tab"]');

    let count = 0;
    for (const data of mockAclData) {
        console.debug("data", data);
        const entry = acltab.locator("div.border.rounded.p-2.mb-2").nth(count);
        await assertEntry(entry, data);
        count++;
    }
});

// Set ACL
test("add new ACL entry", async ({ page }) => {
    const currentDirectory = "/documents";
    const targetFile = "report.docx";

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    await openSidePanel(page, targetFile);

    const acltab = page.locator('[data-testid="acl-tab"]');

    await acltab.click('button:has-text("+ Add Entry")');

    const entry = acltab.locator("div.border.rounded.p-2.mb-2").last();

    const typeSelect = entry.locator("select");
    await typeSelect.selectOption("user");

    const nameInput = entry.locator(".form-control");
    await nameInput.fill("test");

    const r_box = entry.locator('input[id*="-r"]');
    const w_box = entry.locator('input[id*="-w"]');

    await r_box.check();
    await w_box.check();
    await expect(entry.locator('input[id^="default-"]')).not.toBeVisible();

    const set_button = acltab.locator("text=Set ACL");
    await expect(set_button).toBeVisible(); // just confirming no error
    await set_button.click();
});

// Set ACL (default)
test("add new ACL entry (default)", async ({ page }) => {
    const currentDirectory = "/";
    const targetFile = "documents";

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    await openSidePanel(page, targetFile);

    const acltab = page.locator('[data-testid="acl-tab"]');

    await acltab.click('button:has-text("+ Add Entry")');

    const entry = acltab.locator("div.border.rounded.p-2.mb-2").last();

    const typeSelect = entry.locator("select");
    await typeSelect.selectOption("user");

    const nameInput = entry.locator(".form-control");
    await nameInput.fill("test");

    const r_box = entry.locator('input[id*="-r"]');
    const w_box = entry.locator('input[id*="-w"]');
    const d_box = entry.locator('input[id^="default-"]');

    await r_box.check();
    await w_box.check();
    await d_box.check();

    const set_button = acltab.locator("text=Set ACL");
    await expect(set_button).toBeVisible();
    await set_button.click();
});

// remove an ACL entry
test("remove an ACL entry", async ({ page }) => {
    const currentDirectory = "/documents";
    const targetFile = "report.docx";

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    await openSidePanel(page, targetFile);

    const acltab = page.locator('[data-testid="acl-tab"]');

    const entry = acltab.locator("div.border.rounded.p-2.mb-2").nth(3);

    const deleteBtn = entry.locator(".btn-close");
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    const entries = acltab.locator("div.border.rounded.p-2.mb-2");

    for (let i = 0; i < mockAclData.length - 1; i++) {
        await expect(entries.nth(i).locator(".form-control")).not.toHaveValue(
            mockAclData[3].acl_name
        );
    }
});

// Copy link
test("copy link button works", async ({ page }) => {
    const currentDirectory = "/documents";
    const targetFile = "report.docx";

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    await openSidePanel(page, targetFile);

    const acltab = page.locator('[data-testid="acl-tab"]');

    const input = acltab.locator("input[readonly]");
    await expect(input).toBeVisible();

    await expect(input).toHaveValue(`${FRONTEND_URL}/file${currentDirectory}/${targetFile}`);

    const copyButton = acltab.locator("button", { hasText: "Copy" });
    await expect(copyButton).toBeVisible();
});

test("copy link button (directory)", async ({ page }) => {
    const currentDirectory = "/";
    const targetFile = "documents";

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    await openSidePanel(page, targetFile);

    const acltab = page.locator('[data-testid="acl-tab"]');
    const input = acltab.locator("input[readonly]");
    await expect(input).toBeVisible();

    await expect(input).toHaveValue(`${FRONTEND_URL}/#${currentDirectory}${targetFile}`);

    const copyButton = acltab.locator("button", { hasText: "Copy" });
    await expect(copyButton).toBeVisible();
});
