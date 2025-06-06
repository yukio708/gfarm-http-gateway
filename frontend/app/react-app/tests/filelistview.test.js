const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const http = require("http");

const FRONTEND_URL = "http://localhost:3000";
const DIR_LIST = path.resolve(__dirname, "data/filelist.json");

let fileStructureData = null;

// Wait for React frontend to start
async function waitForReact() {
    for (let i = 0; i < 10; i++) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(FRONTEND_URL, (res) => {
                    res.statusCode === 200 ? resolve() : reject();
                });
                req.on("error", reject);
            });
            return;
        } catch {
            await new Promise((res) => setTimeout(res, 1000));
        }
    }
    throw new Error("React app is not up!");
}

const findChildrenByPath = (nodes, targetPath) => {
    console.log("targetPath", targetPath);
    // パスの先頭と末尾のスラッシュを正規化して、比較を容易にする
    const normalizedTargetPath = "/" + targetPath;

    for (const node of nodes) {
        // パスが一致する場合
        if (node.path === normalizedTargetPath) {
            // "childlen" プロパティが存在し、かつ配列である場合はそれを返す
            // そうでなければ、空の配列を返す（ファイルの場合など）
            return node.childlen && Array.isArray(node.childlen) ? node.childlen : [];
        }

        // 現在のノードがディレクトリであり、かつ子要素を持っている場合
        if (!node.is_file && node.childlen && Array.isArray(node.childlen)) {
            // targetPathが現在のノードのパスで始まる場合、さらに深く探索する
            // 例: targetPathが "/documents/presentations" で、現在のnode.pathが "/documents" の場合
            if (
                normalizedTargetPath.startsWith(node.path + "/") ||
                (node.path === "/" && normalizedTargetPath !== "/")
            ) {
                const foundChildren = findChildrenByPath(node.childlen, targetPath);
                if (foundChildren !== null) {
                    return foundChildren; // 子要素が見つかった場合はそのまま返す
                }
            }
        }
    }
    // パスが見つからない場合はnullを返す
    return null;
};

const getSize = (filesize) => {
    if (filesize === 0) {
        return "";
    }

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(filesize) / Math.log(k));

    const sizestr = parseFloat((filesize / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    return sizestr;
};

const getFileIconDefault = (ext, is_file) => {
    ext = ext.toLowerCase();
    if (!is_file) {
        return "bi bi-folder";
    }

    switch (ext) {
        case "pdf":
            return "bi bi-file-earmark-pdf";
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
            return "bi bi-file-earmark-image";
        case "mp4":
        case "webm":
            return "bi bi-file-earmark-play";
        case "mp3":
        case "wav":
            return "bi bi-file-earmark-music";
        case "js":
        case "py":
        case "html":
        case "css":
            return "bi bi-file-earmark-code";
        case "zip":
        case "rar":
        case "tar":
        case "gz":
            return "bi bi-file-earmark-zip";
        default:
            return "bi bi-file-earmark-text"; // Default file icon
    }
};

// Route handler
async function handleRoute(route, request) {
    const url = request.url();
    if (url.includes("/d/")) {
        console.log("/d/", url);
        if (fileStructureData === null) {
            fileStructureData = JSON.parse(fs.readFileSync(DIR_LIST, "utf-8"));
        }
        const path = url.split("/d/", 2)[1].split("?")[0];
        const jsonData = findChildrenByPath(fileStructureData, path);
        if (jsonData !== null) {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(jsonData),
            });
        } else {
            const responseData = {
                detail: {
                    command: "gfls",
                    message: "no such file or directory",
                    stdout: "",
                    stderr: "",
                },
            };
            await route.fulfill({
                status: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(responseData),
            });
        }
    } else if (url.includes("/user_info")) {
        console.log("/user_info", url);
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ username: "user1" }),
        });
    } else {
        await route.continue();
    }
}

// === Tests ===

test.beforeAll(async () => {
    await waitForReact();
    fileStructureData = JSON.parse(fs.readFileSync(DIR_LIST, "utf-8"));
});

// --- File/Directory Display Test ---

test("display file list existing path", async ({ page }) => {
    const targetPath = "";
    const expectedChildren = findChildrenByPath(fileStructureData, targetPath);
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);

    const fileTable = await page.waitForSelector(".file-table", {
        timeout: 10000,
    });
    const fileText = await fileTable.textContent();

    console.log(`File text: ${fileText}`);

    // テーブルヘッダーが表示されているか確認
    const tableHeader = page.locator("table.file-table thead tr");
    const checkboxHeader = tableHeader.locator('input[type="checkbox"][class="form-check-input"]');
    await expect(checkboxHeader).toBeVisible();
    await expect(checkboxHeader).not.toBeChecked();

    const nameHeader = tableHeader.locator("th", { hasText: "Name" });
    await expect(nameHeader).toBeVisible();

    const sizeHeader = tableHeader.locator("th", { hasText: "Size" });
    await expect(sizeHeader).toBeVisible();

    const updatedDateHeader = tableHeader.locator("th", { hasText: "Updated Date" });
    await expect(updatedDateHeader).toBeVisible();

    await expect(page.locator("tbody tr")).toHaveCount(expectedChildren.length);

    // 各ファイル/フォルダの行と内容を検証
    for (const expectedFile of expectedChildren) {
        const rowLocator = page.locator("tbody tr", { hasText: expectedFile.name });

        // 行自体が表示されていることを確認
        await expect(rowLocator).toBeVisible();

        // アイコンの確認 (getFileIconDefault のロジックも考慮に入れる)
        const ext = expectedFile.name.split(".").pop();
        const iconClassString = getFileIconDefault(ext, expectedFile.is_file);
        const iconCssSelector = "." + iconClassString.replace(/ /g, ".");
        await expect(rowLocator.locator(iconCssSelector)).toBeVisible();

        // ファイル名が正しく表示されていることを確認
        const fileCheckbox = rowLocator.locator('input[type="checkbox"][class="form-check-input"]');
        await expect(fileCheckbox).toBeVisible();
        await expect(fileCheckbox).not.toBeChecked();

        await expect(rowLocator.locator("td").nth(2)).toHaveText(expectedFile.name);

        await expect(rowLocator.locator("td").nth(3)).toHaveText(getSize(expectedFile.size));

        await expect(rowLocator.locator("td").nth(4)).toHaveText(expectedFile.mtime_str);
    }
});

test("display error on nonexistent path", async ({ page }) => {
    // TODO: 存在しないディレクトリに移動して、エラーメッセージを確認
    await page.route("**/*", handleRoute);
    const nonexistentPath = "/nonexistent-directory-12345";
    await page.goto(FRONTEND_URL + "/#" + nonexistentPath);

    // 1. "Error!" という見出しが表示されていること
    await expect(page.getByRole("heading", { name: "Error!" })).toBeVisible();

    // 2. 正しいエラーメッセージが表示されていること
    // handleRoute が body: JSON.stringify({ error: "Path not found" }) を返すと仮定
    await expect(page.getByText(`Failed to fetch ${nonexistentPath} : Error: 404`)).toBeVisible();

    // 3. "Return to home" リンクが表示されていること
    await expect(page.getByRole("link", { name: "Return to home" })).toBeVisible();

    // （オプション）リンクの 'to' 属性（href）が正しいか確認
    const homeLink = page.getByRole("link", { name: "Return to home" });
    await expect(homeLink).toHaveAttribute("href", "#/");
});

test("display large file list", async ({ page }) => {
    // TODO: たくさんのファイルが表示されるパスでスクロール・表示の確認
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
});

test("sort by filename", async ({ page }) => {
    // TODO: ソートボタンを押して、昇順・降順の順番を確認
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
});

test("sort by filesize", async ({ page }) => {
    // TODO: サイズソートを押して、サイズ順になっているか確認
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
});

test("sort by modified time", async ({ page }) => {
    // TODO: 更新日時ソートで正しく並び替えられているか
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
});

test("filter by extension", async ({ page }) => {
    // TODO: 例えば `.txt` だけフィルターして確認
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
});

test("filter by date range", async ({ page }) => {
    // TODO: 日付フィルターを使って、範囲内のファイルのみが表示されるか
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
});

test("display current directory path", async ({ page }) => {
    // TODO: ナビゲーションバーなどに現在のパスが表示されているか確認
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
});

test("display operation menu", async ({ page }) => {
    // TODO: ファイルやフォルダを右クリック（またはメニューアイコン）して操作メニューを確認
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
});

test("display action buttons", async ({ page }) => {
    // TODO: コピー、削除、アップロードなどのボタンが正しく表示されるか
    await page.route("**/*", handleRoute);
    await page.goto(FRONTEND_URL);
});
