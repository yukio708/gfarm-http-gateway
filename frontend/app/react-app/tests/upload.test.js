const { test, expect } = require("@playwright/test");
const fs = require("fs");

const {
    waitForReact,
    handleRoute,
    API_URL,
    FRONTEND_URL,
    DIR_LIST,
    DUMMYS,
} = require("./test_func");

async function waitForProgressView(page, expectedFileNames) {
    const taskCard = page.locator(".offcanvas-body .card", { hasText: expectedFileNames });
    await expect(taskCard).toBeVisible();

    await expect(taskCard.locator("h6")).toContainText(expectedFileNames);

    const progressBar = taskCard.locator(".progress-bar");
    await expect(progressBar).toBeVisible();
    await expect(taskCard.locator(".badge")).toHaveText("completed");
}

// === Tests ===
test.beforeEach(async ({ context }) => {
    await waitForReact();
    await context.route(`${API_URL}/**`, (route, request) => handleRoute(route, request));
});

test("upload single file", async ({ page }) => {
    const currentDirectory = "/"; // Upload to root
    const testFileName = "dummy.txt";
    const uploadFilePath = DUMMYS + "/" + testFileName;

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    // UploadMenu interaction
    const uploadDropdownToggle = page.getByRole("button", { name: "Upload" });
    await uploadDropdownToggle.click();
    const fileUploadButton = page.getByRole("button", { name: "File upload" });
    await fileUploadButton.click();

    // Set the dummy file to the input
    const inputLocator = page.locator('input[type="file"][multiple]:not([webkitdirectory])');
    await expect(inputLocator).toBeAttached();
    await inputLocator.setInputFiles([uploadFilePath]);

    // ProgressView verification
    await waitForProgressView(page, testFileName);

    // Close ProgressView
    const ProgressViewHeader = page.locator(".offcanvas-header", { hasText: "Transfers" });
    const close_button = ProgressViewHeader.locator(".btn-close");
    await close_button.click();
    await expect(ProgressViewHeader).not.toBeVisible();
});

// TC-076: 複数ファイルの一括アップロード
test("upload multiple files", async ({ page }) => {
    const currentDirectory = "/"; // アップロード先ディレクトリ
    const testFileNames = ["dummy.txt", "dummy.py", "dummy.js"];
    const filePaths = testFileNames.map((f) => DUMMYS + "/" + f);

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    const uploadDropdownToggle = page.getByRole("button", { name: "Upload" });
    await uploadDropdownToggle.click();
    const fileUploadButton = page.getByRole("button", { name: "File upload" });
    await fileUploadButton.click();

    // Set the dummy file to the input
    const inputLocator = page.locator('input[type="file"][multiple]:not([webkitdirectory])');
    await expect(inputLocator).toBeAttached();
    await inputLocator.setInputFiles(filePaths);

    // ProgressView で全てのタスクが完了することを確認
    for (const testFileName of testFileNames) {
        await waitForProgressView(page, testFileName);
    }
});

test("upload single directory (nested)", async ({ page }) => {
    const currentDirectory = "/documents"; // Upload to root
    const testFileNames = ["dummy.txt", "dummy.py", "dummy.js", "dummy2.txt"];

    // Ensure the dummy file exists at the specified path before running tests
    // No need to create it here, just reference its path.
    const uploadFilePath = DUMMYS;

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    // UploadMenu interaction
    const uploadDropdownToggle = page.getByRole("button", { name: "Upload" });
    await uploadDropdownToggle.click();
    const fileUploadButton = page.getByRole("button", { name: "Folder upload" });
    await fileUploadButton.click();

    // Set the dummy file to the input
    const inputLocator = page.locator('input[type="file"][multiple][webkitdirectory]');
    await expect(inputLocator).toBeAttached();
    await inputLocator.setInputFiles([uploadFilePath]);

    // ProgressView で全てのタスクが完了することを確認
    for (const testFileName of testFileNames) {
        await waitForProgressView(page, testFileName);
    }
});

test("upload name conflict prompt (overwrite)", async ({ page }) => {
    const currentDirectory = "/dummy"; // Upload to root
    const testFileName = "dummy.txt"; // Use the dummy file's name

    // Ensure the dummy file exists at the specified path before running tests
    // No need to create it here, just reference its path.
    const uploadFilePath = DUMMYS + "/" + testFileName;

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    // 既存ファイルがリストに表示されていることを確認
    await expect(page.locator("tbody tr", { hasText: testFileName })).toBeVisible();

    const uploadDropdownToggle = page.getByRole("button", { name: "Upload" });
    await uploadDropdownToggle.click();
    const fileUploadButton = page.getByRole("button", { name: "File upload" });
    await fileUploadButton.click();

    // input[type="file"] にファイルをセット
    await page
        .locator('input[type="file"][multiple]:not([webkitdirectory])')
        .setInputFiles([uploadFilePath]);

    // === 確認モーダルウィンドウが表示されることを確認 ===
    const overwriteModalTitle = page.getByText(
        "Are you sure you want to overwrite the following files?"
    );
    await expect(overwriteModalTitle).toBeVisible({ timeout: 5000 });

    const duplicateFileNameInModal = page.locator("ul.modal-body strong", {
        hasText: testFileName,
    });
    await expect(duplicateFileNameInModal).toBeVisible();

    // 「Confirm」ボタンをクリック (UploadMenuコンポーネントの `confirmUpload` が呼ばれる)
    const confirmButton = page.getByRole("button", { name: "Confirm" }); // ModalWindowのデフォルト
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(overwriteModalTitle).not.toBeVisible();

    // ProgressView verification
    await waitForProgressView(page, testFileName);
});

test("upload name conflict prompt (cancel)", async ({ page }) => {
    const currentDirectory = "/dummy"; // Upload to root
    const testFileName = "dummy.txt"; // Use the dummy file's name

    // Ensure the dummy file exists at the specified path before running tests
    // No need to create it here, just reference its path.
    const uploadFilePath = DUMMYS + "/" + testFileName;

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    // 既存ファイルがリストに表示されていることを確認
    await expect(page.locator("tbody tr", { hasText: testFileName })).toBeVisible();

    const uploadDropdownToggle = page.getByRole("button", { name: "Upload" });
    await uploadDropdownToggle.click();
    const fileUploadButton = page.getByRole("button", { name: "File upload" });
    await fileUploadButton.click();

    // input[type="file"] にファイルをセット
    await page
        .locator('input[type="file"][multiple]:not([webkitdirectory])')
        .setInputFiles([uploadFilePath]);

    // === 確認モーダルウィンドウが表示されることを確認 ===
    const overwriteModalTitle = page.getByText(
        "Are you sure you want to overwrite the following files?"
    );
    await expect(overwriteModalTitle).toBeVisible({ timeout: 5000 });

    const duplicateFileNameInModal = page.locator("ul.modal-body strong", {
        hasText: testFileName,
    });
    await expect(duplicateFileNameInModal).toBeVisible();

    const cancelButton = page.getByRole("button", { name: "Cancel" });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    await expect(overwriteModalTitle).not.toBeVisible();

    await expect(page.locator("#offcanvasFileDetail")).not.toBeVisible();
});

// TC-081: 空ファイルアップロード
test("upload empty file", async ({ page }) => {
    const currentDirectory = "/";
    const testFileName = "empty.txt";
    const uploadFilePath = DUMMYS + "/" + testFileName;

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    // UploadMenu のドロップダウンを開く
    const uploadDropdownToggle = page.getByRole("button", { name: "Upload" });
    await uploadDropdownToggle.click();
    const fileUploadButton = page.getByRole("button", { name: "File upload" });
    await fileUploadButton.click();

    // input[type="file"][multiple] 要素に空ファイルをセット
    const fileInput = page.locator('input[type="file"][multiple]:not([webkitdirectory])');
    await fileInput.setInputFiles([uploadFilePath]);

    // ProgressView verification
    await waitForProgressView(page, testFileName);
});

// // TC-083: 存在しないファイルのアップロード (異常系)
// test("upload nonexistent file", async ({ page }) => {
// });

// // TC-084: 存在しないパスにアップロード
// test("upload to nonexistent path", async ({ page }) => {
//     // TODO: UIで存在しないフォルダにアップしようとするとエラー表示されること
//  FastAPI
// });

// TC-085: 単体ファイルのドラッグ&ドロップ
test("drag and drop single file", async ({ page }) => {
    const currentDirectory = "/";
    const testFileName = "dummy.txt";
    const uploadFilePath = DUMMYS + "/" + testFileName;
    const fileContent = new Blob(["This is test file content"], { type: "text/plain" });
    const file = new File([fileContent], "test-file.txt", { type: "text/plain" });

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    dataTransfer.items.add(file);

    await page.evaluate(() => {
        const dataTransfer = new DataTransfer();
        // Hack: Directly push "Files" into types (some frameworks rely on this)
        Object.defineProperty(dataTransfer, "types", {
            get: () => ["Files"],
        });

        const event = new DragEvent("dragenter", {
            dataTransfer,
            bubbles: true,
            cancelable: true,
        });

        document.dispatchEvent(event);
    });

    // Manually simulate dragging the file over the drop zone
    await page.dispatchEvent(".drop-zone", "dragenter", { dataTransfer });
    await page.dispatchEvent(".drop-zone", "dragover", { dataTransfer });
    const dropZoneLocator = page.locator(".drop-zone");
    await expect(dropZoneLocator).toBeVisible();
    await page.dispatchEvent(".drop-zone", "drop", { dataTransfer });

    // その後の確認モーダルが表示されることを確認
    const confirmModalTitle = page.getByText(
        "Are you sure you want to upload the following files?"
    );
    await expect(confirmModalTitle).toBeVisible();
    await expect(page.locator("ul.modal-body strong")).toContainText(testFileName); // ファイル名が表示されるか

    // 「Confirm」ボタンをクリックしてアップロードを続行
    const confirmButton = page.getByRole("button", { name: "Confirm" });
    await confirmButton.click();

    // ProgressView が開かれ、タスクが完了することを確認
    await waitForProgressView(page, testFileName);

    // アップロードされたファイルがリストに表示されていることを確認（リロード後）
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("tbody tr", { hasText: testFileName })).toBeVisible();
});

// // TC-086: 複数ファイルのドラッグ&ドロップ
// test("drag and drop multiple files", async ({ page }) => {
//     // TODO: 上記と同様にファイルを複数ドロップする挙動をエミュレート
// });

// // TC-087: 単体ディレクトリのドラッグ&ドロップ
// test("drag and drop single directory", async ({ page }) => {
//     // TODO: Playwrightで完全なディレクトリドラッグ&ドロップの再現はやや難
// });

// // TC-088: 複数ディレクトリのドラッグ&ドロップ
// test("drag and drop multiple directories", async ({ page }) => {
//     // TODO: 再現が難しい場合は手動テストを補完してもOK
// });

// // TC-089: ファイル+ディレクトリの混合ドラッグ&ドロップ
// test("drag and drop mixed content", async ({ page }) => {
//     // TODO: ファイル・フォルダ混合をドロップ → 成功確認
// });

// // TC-090: 空ファイルのドラッグ&ドロップ
// test("drag and drop empty file", async ({ page }) => {
//     // TODO: サイズ0のファイルをdrop → 成功アップロード
// });

// // TC-091: 空ディレクトリのドラッグ&ドロップ
// test("drag and drop empty directory", async ({ page }) => {
//     // TODO: dropした空フォルダがアップロードできるか
// });

// TC-093: バックエンド切断時のアップロード
test("upload backend disconnect", async ({ page }) => {
    const currentDirectory = "/";
    const testFileName = "dummy.txt";
    const uploadFilePath = DUMMYS + "/" + testFileName;

    // === Mock PUT /file/:path to simulate a 500 error from backend ===
    await page.route(
        new RegExp(`${API_URL}/file/${encodeURIComponent(testFileName)}`),
        async (route) => {
            console.log(
                `[ROUTE MOCK] Simulating 500 Internal Server Error for upload: ${testFileName}`
            );
            await route.fulfill({
                status: 500, // Simulate server error
                contentType: "application/json",
                body: JSON.stringify({
                    detail: {
                        command: "upload",
                        message: "Simulated backend connection lost or internal error.",
                        stderr: "Connection reset by peer or server crashed.",
                    },
                }),
            });
        }
    );

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    // UploadMenu interaction
    const uploadDropdownToggle = page.getByRole("button", { name: "Upload" });
    await uploadDropdownToggle.click();
    const fileUploadButton = page.getByRole("button", { name: "File upload" });
    await fileUploadButton.click();

    // Set the dummy file to the input
    const inputLocator = page.locator('input[type="file"][multiple]:not([webkitdirectory])');
    await expect(inputLocator).toBeAttached();
    await inputLocator.setInputFiles([uploadFilePath]);

    // Verify ProgressView appears and task shows error
    const taskCard = page.locator(".offcanvas-body .card", { hasText: testFileName });
    await expect(taskCard).toBeVisible();
    await expect(taskCard.locator(".badge")).toHaveText("error"); // Status should be 'error'

    // Verify error message
    const firstTaskMessage = taskCard.locator('[data-testid="task-message-0"]');
    await expect(firstTaskMessage).toContainText("Error: HTTP 500: Internal Server Error");
});

test("upload cancel", async ({ page }) => {
    const currentDirectory = "/";
    const testFileName = "dummy.txt";
    const uploadFilePath = DUMMYS + "/" + testFileName;

    // === Mock PUT /file/:path to introduce a delay for cancellation ===
    // This will make the upload appear "in progress" for long enough to click cancel.
    await page.route(
        new RegExp(`${API_URL}/file/${encodeURIComponent(testFileName)}`),
        async (route) => {
            console.log(`[ROUTE MOCK] Simulating delayed upload for: ${testFileName}`);
            // Delay the response
            await page.waitForTimeout(1000); // 5-second delay
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ message: "Upload completed (mocked after delay)" }),
            });
        }
    );

    await page.goto(`${FRONTEND_URL}/#${currentDirectory}`);

    // UploadMenu interaction
    const uploadDropdownToggle = page.getByRole("button", { name: "Upload" });
    await uploadDropdownToggle.click();
    const fileUploadButton = page.getByRole("button", { name: "File upload" });
    await fileUploadButton.click();

    // Set the dummy file to the input
    const inputLocator = page.locator('input[type="file"][multiple]:not([webkitdirectory])');
    await expect(inputLocator).toBeAttached();
    await inputLocator.setInputFiles([uploadFilePath]);

    // Verify ProgressView appears and task shows error
    const taskCard = page.locator(".offcanvas-body .card", { hasText: testFileName });
    await expect(taskCard).toBeVisible();
    await expect(taskCard.locator(".badge")).toHaveText("uploading"); // Initial status

    // Find and click the "Cancel" button
    const cancelButton = taskCard.getByRole("button", { name: "Cancel" });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Verify task status changes to "cancelled"
    await expect(taskCard.locator(".badge")).toHaveText("cancelled");
    const firstTaskMessage = taskCard.locator('[data-testid="task-message-0"]');
    await expect(firstTaskMessage).toContainText("Upload cancelled"); // Verify cancellation message

    const ProgressViewHeader = page.locator(".offcanvas-header", { hasText: "Transfers" });
    const close_button = ProgressViewHeader.locator(".btn-close");
    await close_button.click();
    await expect(ProgressViewHeader).not.toBeVisible();

    const ProgressViewButton = page.locator(".btn", { hasText: "Show Progress" });
    await expect(ProgressViewButton).not.toBeVisible();
});
