const { test, expect } = require("@playwright/test");
const fs = require("fs");

const { waitForReact, handleRoute, API_URL, FRONTEND_URL, ZIPNAME } = require("./func");

// === Tests ===
test.beforeEach(async ({ context }) => {
    await waitForReact();
    await context.route(`${API_URL}/**`, (route, request) => handleRoute(route, request));
});

test("download single file", async ({ page }) => {
    const currentDirectory = "/documents";
    const testFileName = "report.docx"; // .docx ファイルを想定

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: testFileName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const downloadButton = page.locator(".dropdown-menu").getByRole("button", { name: "Download" });
    await expect(downloadButton).toBeVisible();

    // ダウンロードイベントを待機しつつ、ダウンロードボタンをクリック
    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;

    // タスクカードが表示されていることを確認
    const taskCard = page.locator(".offcanvas-body .card", { hasText: "report.docx" });
    await expect(taskCard).toBeVisible();

    // ファイル名の確認
    await expect(taskCard.locator("h6")).toContainText("report.docx");

    // プログレスバーの幅とアニメーションの確認
    const progressBar = taskCard.locator(".progress-bar");
    await expect(progressBar).toBeVisible();
    await expect(taskCard.locator(".badge")).toHaveText("completed");

    // ダウンロードされたファイル名を検証
    expect(download.suggestedFilename()).toBe(testFileName);

    const path = await download.path(); // 一時ファイルパスを取得
    const fileContent = fs.readFileSync(path, "utf8"); // ファイル内容を読み込み
    expect(fileContent).toContain(testFileName); // 内容を検証
    expect(fs.statSync(path).size).toBeGreaterThan(0); // ファイルサイズが0より大きいこと
});

test("download multiple files", async ({ page }) => {
    const currentDirectory = "/documents";
    const filesToDownload = ["report.docx", "meeting_notes.txt"];
    const expectedZipFileName = ZIPNAME; // サーバーが返すZIPファイル名と合わせる

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    // 複数ファイルを選択
    for (const fileName of filesToDownload) {
        const fileRow = page.locator("tbody tr", { hasText: fileName });
        await fileRow.locator('input[type="checkbox"]').check();
    }

    const actionsToggleButton = page.getByRole("button", { name: "Actions" });
    await actionsToggleButton.click();
    const downloadButton = page
        .locator("ul.dropdown-menu")
        .getByRole("button", { name: "Download" });

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;

    // タスクカードが表示されていることを確認
    const taskCard = page.locator(".offcanvas-body .card", { hasText: expectedZipFileName });
    await expect(taskCard).toBeVisible();

    // ファイル名の確認
    await expect(taskCard.locator("h6")).toContainText(expectedZipFileName);

    // プログレスバーの幅とアニメーションの確認
    const progressBar = taskCard.locator(".progress-bar");
    await expect(progressBar).toBeVisible();
    await expect(taskCard.locator(".badge")).toHaveText("completed");

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
    const testDirectoryName = "presentations"; // ディレクトリ名
    const expectedZipFileName = ZIPNAME; // サーバーが返すZIPファイル名と合わせる

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: testDirectoryName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const downloadButton = page.locator(".dropdown-menu").getByRole("button", { name: "Download" });
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

    await page.goto(`${FRONTEND_URL}/#${rootPath}`);

    for (const dirName of dirsToDownload) {
        const dirRow = page.locator("tbody tr", { hasText: dirName });
        await dirRow.locator('input[type="checkbox"]').check();
    }

    const actionsToggleButton = page.getByRole("button", { name: "Actions" });
    await actionsToggleButton.click();
    const downloadButton = page
        .locator("ul.dropdown-menu")
        .getByRole("button", { name: "Download" });

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

// test("download nested directories", async ({ page }) => {
//     // FastAPIで確認
// });

test("download empty file", async ({ page }) => {
    const currentDirectory = "/error_test";
    const emptyFileName = "empty_file.txt";

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: emptyFileName });
    await fileRow.locator('input[type="checkbox"]').check();

    const actionsToggleButton = page.getByRole("button", { name: "Actions" });
    await actionsToggleButton.click();
    const downloadButton = page
        .locator("ul.dropdown-menu")
        .getByRole("button", { name: "Download" });

    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);

    expect(download.suggestedFilename()).toBe(emptyFileName);

    const path = await download.path();
    const stats = fs.statSync(path);
    expect(stats.size).toBe(0);
});

test("download empty directory", async ({ page }) => {
    const currentDirectory = "/error_test";
    const emptyDirName = "empty_dir";
    const expectedZipFileName = ZIPNAME;

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    const dirRow = page.locator("tbody tr", { hasText: emptyDirName });
    await dirRow.locator('input[type="checkbox"]').check();

    const actionsToggleButton = page.getByRole("button", { name: "Actions" });
    await actionsToggleButton.click();
    const downloadButton = page
        .locator("ul.dropdown-menu")
        .getByRole("button", { name: "Download" });

    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);

    expect(download.suggestedFilename()).toBe(expectedZipFileName);

    const zipFilePath = await download.path();
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(zipFilePath);
    const zipEntries = zip.getEntries();

    expect(zipEntries.some((entry) => entry.entryName === `${emptyDirName}/`)).toBe(true);
    expect(zipEntries.filter((entry) => !entry.isDirectory).length).toBe(0);
});

test("download nonexistent path", async ({ page }) => {
    const currentDirectory = "/error_test";
    const testFileName = "deleted_file.txt";

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: testFileName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const downloadButton = page.locator(".dropdown-menu").getByRole("button", { name: "Download" });
    await expect(downloadButton).toBeVisible();

    await downloadButton.click();

    const taskCard = page.locator(".offcanvas-body .card", { hasText: testFileName });
    await expect(taskCard).toBeVisible();

    await expect(taskCard.locator("h6")).toContainText(testFileName);

    await expect(taskCard.locator(".badge")).toHaveText("error");
    const firstTaskMessage = page.locator('[data-testid="task-message-0"]');
    await expect(firstTaskMessage).toContainText("404");
});

test("download backend disconnect", async ({ page }) => {
    const currentDirectory = "/error_test";
    const testFileName = "backend_disconnect.txt";

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: testFileName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const downloadButton = page.locator(".dropdown-menu").getByRole("button", { name: "Download" });
    await expect(downloadButton).toBeVisible();

    await downloadButton.click();

    const taskCard = page.locator(".offcanvas-body .card", { hasText: testFileName });
    await expect(taskCard).toBeVisible();

    await expect(taskCard.locator("h6")).toContainText(testFileName);

    await expect(taskCard.locator(".badge")).toHaveText("error", { timeout: 30000 });
    const firstTaskMessage = page.locator('[data-testid="task-message-0"]');
    await expect(firstTaskMessage).toContainText("Failed to fetch");
});

test("download cancel", async ({ page }) => {
    const currentDirectory = "/error_test";
    const testFileName = "cancellable_file.txt";

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    const fileRow = page.locator("tbody tr", { hasText: testFileName });
    const threeDotsButton = fileRow.locator("button.btn.p-0.border-0");
    await expect(threeDotsButton).toBeVisible();
    await threeDotsButton.click();

    const downloadButton = page.locator(".dropdown-menu").getByRole("button", { name: "Download" });
    await expect(downloadButton).toBeVisible();

    await downloadButton.click();

    const taskCard = page.locator(".offcanvas-body .card", { hasText: testFileName });
    await expect(taskCard).toBeVisible();

    await expect(taskCard.locator("h6")).toContainText(testFileName);

    const cancelButton = taskCard.getByRole("button", { name: "Cancel" });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    await expect(taskCard.locator(".badge")).toHaveText("cancelled");
    const firstTaskMessage = page.locator('[data-testid="task-message-0"]');
    await expect(firstTaskMessage).toContainText("Download cancelled");
});
