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
    if (targetPath === null) return null;
    console.log("targetPath", targetPath);
    const normalizedTargetPath = targetPath.startsWith("/") ? targetPath : "/" + targetPath;

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
    const targetPath = "/";
    const expectedChildren = findChildrenByPath(fileStructureData, targetPath);
    await page.route("**/*", handleRoute);
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    const fileTable = await page.waitForSelector(".file-table", {
        timeout: 10000,
    });
    const fileText = await fileTable.textContent();

    console.log(`File text: ${fileText}`);

    // テーブルヘッダーが表示されているか確認
    const checkboxHeader = page.locator('[data-testid="header-checkbox"]');
    await expect(checkboxHeader).toBeVisible();
    await expect(checkboxHeader).not.toBeChecked();

    const nameHeader = page.locator('[data-testid="header-name"]');
    await expect(nameHeader).toBeVisible();

    const sizeHeader = page.locator('[data-testid="header-size"]');
    await expect(sizeHeader).toBeVisible();

    const updatedDateHeader = page.locator('[data-testid="header-date"]');
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
    await page.goto(`${FRONTEND_URL}/#${nonexistentPath}`);

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

test("display long file list", async ({ page }) => {
    const numberOfFiles = 1000; // テストしたいファイルの数

    // /d/ エンドポイントのレスポンスをモックし、大量のファイルを返す
    await page.route("**/d/*", async (route) => {
        const url = new URL(route.request().url());
        let requestedPath = url.pathname.substring(3);
        if (requestedPath === "") {
            requestedPath = "/";
        } else {
            requestedPath = "/" + decodeURIComponent(requestedPath);
        }

        // 大量のダミーファイルを生成
        const largeFileList = [];
        for (let i = 0; i < numberOfFiles; i++) {
            largeFileList.push({
                mode_str: "-rw-r--r--",
                is_file: true,
                nlink: 1,
                uname: `user${i % 5}`,
                gname: "users",
                size: Math.floor(Math.random() * 1000000) + 1000, // ランダムなサイズ
                mtime_str: `Jun ${(i % 30) + 1} 10:00:00 2025`,
                name: `large_file_${i}.txt`,
                path: `${requestedPath}/large_file_${i}.txt`,
            });
        }

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(largeFileList),
        });
    });

    await page.route("**/user_info*", handleRoute);

    // 大量のファイルが表示されるパスにアクセス
    // （ここではルートにダミーデータを表示するようにモックしているので /d/ にアクセス）
    await page.goto(FRONTEND_URL);

    await page.waitForSelector(".file-table", {
        timeout: 10000,
    });

    // --- テストの検証 ---
    const tableHeader = page.locator("table.file-table thead tr");

    // 1. 指定した数のファイルが全て表示されていることを確認
    // .file-item は各ファイル行に付与されているクラス名と仮定
    const fileItems = page.locator("tbody tr");
    await expect(fileItems).toHaveCount(numberOfFiles);

    // 最後のファイルが表示されていることを確認
    const lastFileName = `large_file_${numberOfFiles - 1}.txt`;

    // 要素が見つかるまでスクロール
    await page.waitForSelector(`text=${lastFileName}`); // まず要素がDOMに存在することを確認

    // 要素がビューポートに入るまでスクロール
    // PlaywrightのtoBeVisible()は自動的にスクロールを試みますが、明示的なスクロールも可能
    await page.getByText(lastFileName).scrollIntoViewIfNeeded();

    // 最後のファイルが表示されていることを確認
    await expect(page.getByText(lastFileName)).toBeVisible();

    // （オプション）スクロール後に、表示領域に収まっているはずのヘッダ見えるか確認

    // テーブルヘッダーが表示されているか確認
    await expect(tableHeader).toBeVisible();

    // 3. パフォーマンスに関する検証（オプションだが高度なテスト）
    // 大量レンダリング時のパフォーマンスを測定したい場合
    // const startTime = performance.now();
    // await page.goto(FRONTEND_URL + "/d/");
    // await page.waitForLoadState('networkidle'); // ネットワークが落ち着くまで待つ
    // await expect(fileItems).toHaveCount(numberOfFiles); // UIがレンダリングされるまで待つ
    // const endTime = performance.now();
    // console.log(`Rendering ${numberOfFiles} files took ${endTime - startTime} ms`);
    // expect(endTime - startTime).toBeLessThan(5000); // 例えば5秒以内にレンダリングされることを期待
});

test("sort by filename", async ({ page }) => {
    await page.route("**/*", handleRoute);

    const targetPath = "/"; // テスト対象のパス
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    // findChildrenByPath を使って期待される子要素のデータを取得
    const initialFiles = findChildrenByPath(fileStructureData, targetPath);

    // ソートボタンのセレクタを特定
    const nameHeader = page.locator('[data-testid="header-name"]');
    // 各ファイルの「名前」が表示されるtd要素のセレクタ
    const fileNamesLocator = page.locator("tbody tr td:nth-child(3)");

    // --- 昇順ソートの確認 ---

    console.log(`expectedChildren: ${initialFiles}`);
    // JavaScriptで期待される昇順のファイル名リストを生成
    const expectedAscendingNames = [...initialFiles].sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return nameA.localeCompare(nameB);
    });
    // `sensitivity: 'base'` は大文字小文字を区別せずにソートするため、より自然なファイル名ソートに合致しやすいです。

    // default : name asc

    // ソートアイコン（昇順）が表示されていることを確認（あなたのgetSortIconの実装に依存）
    await expect(nameHeader.locator('[data-testid="sort-icon-asc"]')).toBeVisible();

    // UI上のファイル名が期待される昇順になっていることを検証
    for (let i = 0; i < expectedAscendingNames.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedAscendingNames[i].name);
    }

    // --- 降順ソートの確認 ---

    // JavaScriptで期待される降順のファイル名リストを生成
    const expectedDescendingNames = [...initialFiles].sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return nameB.localeCompare(nameA);
    });

    await nameHeader.click(); // 名前ヘッダーをもう一度クリックして降順ソート

    // ソートアイコン（降順）が表示されていることを確認
    await expect(nameHeader.locator('[data-testid="sort-icon-desc"]')).toBeVisible();

    // UI上のファイル名が期待される降順になっていることを検証
    for (let i = 0; i < expectedDescendingNames.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedDescendingNames[i].name);
    }
});

test("sort by filesize", async ({ page }) => {
    await page.route("**/*", handleRoute);

    const targetPath = "/"; // テスト対象のパス
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    const initialFiles = findChildrenByPath(fileStructureData, targetPath);

    const sizeHeader = page.locator('[data-testid="header-size"]');
    // 各ファイルの「名前」が表示されるtd要素のセレクタ
    const fileNamesLocator = page.locator("tbody tr td:nth-child(3)");

    // --- 昇順ソートの確認 ---
    const expectedAscendingSizes = [...initialFiles].sort((a, b) => {
        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return a.size - b.size;
    }); // ソート後の生のサイズ値

    await sizeHeader.click(); // サイズヘッダーをクリックして昇順ソート

    // ソートアイコン（昇順）が表示されていることを確認（例: '.bi-sort-amount-down' など）
    await expect(sizeHeader.locator('[data-testid="sort-icon-asc"]')).toBeVisible();

    for (let i = 0; i < expectedAscendingSizes.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedAscendingSizes[i].name);
    }

    // --- 降順ソートの確認 ---
    const expectedDescendingSizes = [...initialFiles].sort((a, b) => {
        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return b.size - a.size;
    });

    await sizeHeader.click(); // サイズヘッダーをもう一度クリックして降順ソート
    await expect(sizeHeader.locator('[data-testid="sort-icon-desc"]')).toBeVisible();

    for (let i = 0; i < expectedDescendingSizes.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedDescendingSizes[i].name);
    }
});

test("sort by update date", async ({ page }) => {
    await page.route("**/*", handleRoute);

    const targetPath = "/"; // テスト対象のパス
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    const initialFiles = findChildrenByPath(fileStructureData, targetPath);

    const updatedDateHeader = page.locator('[data-testid="header-date"]');
    // 各ファイルの「名前」が表示されるtd要素のセレクタ
    const fileNamesLocator = page.locator("tbody tr td:nth-child(3)");

    // --- 昇順ソートの確認 ---
    const expectedAscendingTimes = [...initialFiles].sort((a, b) => {
        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return new Date(a.mtime_str) - new Date(b.mtime_str);
    });

    await updatedDateHeader.click(); // 更新日時ヘッダーをクリックして昇順ソート

    // ソートアイコン（昇順）が表示されていることを確認（例: '.bi-sort-down' など）
    await expect(updatedDateHeader.locator('[data-testid="sort-icon-asc"]')).toBeVisible();

    // UI上のファイルの並び順で検証 (ファイル名で順序を確認)
    for (let i = 0; i < expectedAscendingTimes.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedAscendingTimes[i].name);
    }

    // --- 降順ソートの確認 ---
    const expectedDescendingTimes = [...initialFiles].sort((a, b) => {
        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return new Date(b.mtime_str) - new Date(a.mtime_str);
    });

    await updatedDateHeader.click(); // もう一度クリックして降順ソート
    await expect(updatedDateHeader.locator('[data-testid="sort-icon-desc"]')).toBeVisible();

    for (let i = 0; i < expectedDescendingTimes.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedDescendingTimes[i].name);
    }
});

test("filter by extension", async ({ page }) => {
    // 適切なモックデータを設定
    await page.route("**/*", handleRoute);

    const targetPath = "/documents"; // テスト対象のパス
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    // /documents の初期データ: report.docx (pdf), meeting_notes.txt (txt), presentations (folder)
    const initialFiles = findChildrenByPath(fileStructureData, targetPath);
    const expectedTxtFiles = initialFiles.filter(
        (file) => file.is_file && file.name.endsWith(".txt")
    );
    const unexpectedPdfFile = initialFiles.find(
        (file) => file.is_file && file.name.endsWith(".docx")
    );
    const folder = initialFiles.find((file) => !file.is_file);

    // --- 1. ドロップダウンを開く ---
    // ドロップダウンのトグルボタンを見つける
    const filterToggleButton = page.locator('[data-testid="file-filter-dropdown"]');
    await expect(filterToggleButton).toBeVisible();

    await filterToggleButton.click(); // クリックしてドロップダウンを開く

    // ドロップダウンメニューが表示されたことを確認
    const clearButton = page.locator('[data-testid="file-filter-clear-button"]');
    await expect(clearButton).toBeVisible();

    // --- 2. ".txt" フィルタを適用する ---
    // ".txt" のチェックボックスを見つけてクリック
    // `id` 属性が `dropdown-filter-txt` なので、それを使うのが最も堅牢
    const txtFilterCheckbox = page.locator("#dropdown-filter-txt");
    await expect(txtFilterCheckbox).toBeVisible(); // チェックボックスが表示されていること
    await txtFilterCheckbox.check(); // チェックボックスをONにする

    await filterToggleButton.click(); // クリックしてドロップダウンを閉じる

    // フィルタ適用後、リストが更新されるまで待つ
    await page.waitForLoadState("networkidle");

    // --- 3. フィルタリング結果の検証 ---
    // 期待されるファイル（.txt）が表示されていること
    for (const expectedFile of expectedTxtFiles) {
        await expect(page.locator("tbody tr", { hasText: expectedFile.name })).toBeVisible();
    }
    // 期待されないファイル（.pdf, folderなど）が表示されていないこと
    if (unexpectedPdfFile) {
        await expect(
            page.locator("tbody tr", { hasText: unexpectedPdfFile.name })
        ).not.toBeVisible();
    }
    if (folder) {
        // フォルダもフィルター対象外なら
        await expect(page.locator("tbody tr", { hasText: folder.name })).not.toBeVisible();
    }
    // 表示されているファイルの数が期待通りか確認
    await expect(page.locator("tbody tr")).toHaveCount(expectedTxtFiles.length);

    // --- 4. フィルタラベルの更新確認 ---
    // フィルタリングされた後にボタンのラベルが 'Types: TXT' に変わることを確認
    await expect(filterToggleButton).toHaveText("Types: txt");

    await filterToggleButton.click(); // クリックしてドロップダウンを開く
    await clearButton.click();

    // show all
    for (const expectedFile of initialFiles) {
        await expect(page.locator("tbody tr", { hasText: expectedFile.name })).toBeVisible();
    }
});

// mtime_str を Date オブジェクトにパースするヘルパー関数
// mtime_str が "May 30 18:00:00 2025" のような形式なので、Date コンストラクタでパース可能
const parseMtimeStr = (mtimeStr) => {
    return new Date(mtimeStr);
};

// 特定の dateFilter 値に基づいて、期待されるファイルリストを返すヘルパー関数
const getExpectedFilesForDateFilter = (allFiles, filterType) => {
    // const now = new Date("2025-06-06T17:55:46+09:00"); // テスト実行時の現在日時を固定（東京時間）
    const now = new Date(); // テスト実行時の現在日時を固定（東京時間）

    return allFiles.filter((file) => {
        const fileDate = parseMtimeStr(file.mtime_str);
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

        switch (filterType) {
            case "all":
                return true; // 全て表示
            case "today":
                // fileDate が today の日付と同じか
                return (
                    fileDate.getFullYear() === now.getFullYear() &&
                    fileDate.getMonth() === now.getMonth() &&
                    fileDate.getDate() === now.getDate()
                );
            case "week":
                // 過去7日間の範囲内か
                return fileDate >= sevenDaysAgo && fileDate <= now;
            case "month":
                // 今月の範囲内か
                return (
                    fileDate.getFullYear() === now.getFullYear() &&
                    fileDate.getMonth() === now.getMonth()
                );
            default:
                return true; // デフォルトでは全て表示
        }
    });
};

test("filter by modified date", async ({ page }) => {
    await page.route("**/*", handleRoute);

    const targetPath = "/"; // ルートパスをテスト対象とする（多様なファイルがあるため）
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    // fileStructureData からすべてのファイルをフラットに取得（テストヘルパーとして追加）
    // ルートの子要素だけでなく、テスト対象となるファイルすべて
    const allFilesAtRoot = findChildrenByPath(fileStructureData, targetPath);

    // ドロップダウンのトグルボタンを見つける
    const dateFilterToggleButton = page.locator('[data-testid="date-filter-dropdown"]');
    await expect(dateFilterToggleButton).toBeVisible();

    // --- 1. ドロップダウンを開く ---
    await dateFilterToggleButton.click();
    // ドロップダウンメニューが表示されたことを確認
    const clearButton = page.locator('[data-testid="date-filter-clear-button"]');
    await expect(clearButton).toBeVisible();

    // --- 2. "Last 7 Days" フィルタを適用する ---
    const last7DaysButton = page.locator("#dropdown-filter-week");
    await expect(last7DaysButton).toBeVisible(); // ボタンが表示されていること
    await last7DaysButton.click();

    // フィルタ適用後、リストが更新されるまで待つ
    await page.waitForLoadState("networkidle");

    // フィルタラベルが更新されたことを確認
    await expect(dateFilterToggleButton).toHaveText("Last 7 Days");

    // --- 3. フィルタリング結果の検証（"Last 7 Days"） ---
    const expectedFilesLast7Days = getExpectedFilesForDateFilter(allFilesAtRoot, "week");
    await expect(page.locator("tbody tr")).toHaveCount(expectedFilesLast7Days.length);
    for (const expectedFile of expectedFilesLast7Days) {
        await expect(page.locator("tbody tr", { hasText: expectedFile.name })).toBeVisible();
    }
    // 期待されないファイル（日付範囲外のファイル）が表示されていないこと
    const filesOutsideLast7Days = allFilesAtRoot.filter(
        (file) => !getExpectedFilesForDateFilter(allFilesAtRoot, "week").includes(file)
    );
    for (const unexpectedFile of filesOutsideLast7Days) {
        await expect(page.locator("tbody tr", { hasText: unexpectedFile.name })).not.toBeVisible();
    }

    // --- 4. "This Month" フィルタを適用する ---
    await dateFilterToggleButton.click(); // ドロップダウンを再度開く
    const thisMonthButton = page.locator("#dropdown-filter-month");
    await thisMonthButton.click();

    await page.waitForLoadState("networkidle");
    await expect(dateFilterToggleButton).toHaveText("This Month");

    // --- 5. フィルタリング結果の検証（"This Month"） ---
    const expectedFilesThisMonth = getExpectedFilesForDateFilter(allFilesAtRoot, "month");
    await expect(page.locator("tbody tr")).toHaveCount(expectedFilesThisMonth.length);
    for (const expectedFile of expectedFilesThisMonth) {
        await expect(page.locator("tbody tr", { hasText: expectedFile.name })).toBeVisible();
    }
    const filesOutsideThisMonth = allFilesAtRoot.filter(
        (file) => !getExpectedFilesForDateFilter(allFilesAtRoot, "month").includes(file)
    );
    for (const unexpectedFile of filesOutsideThisMonth) {
        await expect(page.locator("tbody tr", { hasText: unexpectedFile.name })).not.toBeVisible();
    }

    // --- 6. 「Clear filter」ボタンをクリック ---
    await dateFilterToggleButton.click(); // ドロップダウンを再度開く
    const clearFilterButton = page.locator('[data-testid="date-filter-clear-button"]');
    await expect(clearFilterButton).toBeVisible();
    await clearFilterButton.click();

    await page.waitForLoadState("networkidle");

    // フィルタが解除されたことを検証
    await expect(dateFilterToggleButton).toHaveText("Filter by Modified"); // 初期ラベルに戻る
    await expect(page.locator("tbody tr")).toHaveCount(allFilesAtRoot.length); // 全てのファイルが再び表示される
    for (const file of allFilesAtRoot) {
        await expect(page.locator("tbody tr", { hasText: file.name })).toBeVisible();
    }
});

test("display current directory path", async ({ page }) => {
    // APIリクエストをモック
    await page.route("**/*", handleRoute);

    // --- 1. ルートパスの表示確認 ---
    // ルートパスに移動
    await page.goto(`${FRONTEND_URL}/#/`);

    // ホームアイコンボタンが表示されていることを確認
    const homeButton = page.locator("ol.breadcrumb button.btn.p-0").first(); // 最初のパンくず項目がホームボタン
    await expect(homeButton).toBeVisible();
    await expect(homeButton.locator("svg")).toBeVisible(); // BsHouse SVGアイコンが存在することを確認 (または特定のクラス名)

    // ルートパスの場合、ホームアイコン以外にテキストのパンくずがないことを確認
    await expect(page.locator("ol.breadcrumb li")).toHaveCount(1); // ホームアイコンの li のみ
    await expect(
        page.locator("ol.breadcrumb li").filter({ hasText: "documents" })
    ).not.toBeVisible();

    // --- 2. 複数階層パスの表示確認 ---
    const testPath = "/documents/presentations";
    await page.goto(`${FRONTEND_URL}/#${testPath}`);

    // ホームアイコンボタンが引き続き表示されていることを確認
    await expect(homeButton).toBeVisible();

    // パンくずリストの各部分が表示されていることを確認
    // "documents"
    const documentsBreadcrumb = page.locator("ol.breadcrumb li button", { hasText: "documents" });
    await expect(documentsBreadcrumb).toBeVisible();
    // "presentations"
    const presentationsBreadcrumb = page.locator("ol.breadcrumb li button", {
        hasText: "presentations",
    });
    await expect(presentationsBreadcrumb).toBeVisible();

    // パンくずリストの項目の総数が正しいか確認
    // ホームアイコン + "documents" + "presentations" = 3
    await expect(page.locator("ol.breadcrumb li")).toHaveCount(3);

    // --- 3. 各パス部分のリンク（ボタン）の動作確認 ---

    // "documents" パンくずをクリック
    await documentsBreadcrumb.click();
    // URLが "/d/documents" に遷移したことを確認
    await expect(page).toHaveURL(`${FRONTEND_URL}/#/documents`);

    // (オプション) 再度、パンくずが更新されたことを確認
    await expect(page.locator("ol.breadcrumb li")).toHaveCount(2); // ホーム + documents
    await expect(page.locator("ol.breadcrumb li button", { hasText: "documents" })).toBeVisible();

    // ホームアイコンをクリック
    await homeButton.click();
    // URLが "/" に遷移したことを確認
    await expect(page).toHaveURL(`${FRONTEND_URL}/#/`);
    // (オプション) パンくずが更新されたことを確認
    await expect(page.locator("ol.breadcrumb li")).toHaveCount(1);

    // --- 4. パスの正規化テスト（例: 末尾のスラッシュ、連続スラッシュ） ---
    // 例えば、/documents/presentations/ にアクセスした場合
    await page.goto(`${FRONTEND_URL}/#/documents/presentations/`);
    // パス表示が /documents/presentations と同じであることを確認
    await expect(
        page.locator("ol.breadcrumb li button", { hasText: "presentations" })
    ).toBeVisible();
    await expect(page.locator("ol.breadcrumb li")).toHaveCount(3); // 末尾のスラッシュは無視される
});

test("display operation menu for a file", async ({ page }) => {
    await page.route("**/*", handleRoute);

    const targetPath = "/documents";
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    // テスト対象のファイル（例: report.docx）の行を見つける
    const reportDocxRow = page.locator("tbody tr", { hasText: "report.docx" });
    // その行にある三点リーダーボタンを見つける
    const threeDotsButton = reportDocxRow.locator("button.btn.p-0.border-0");

    // --- 検証 ---

    // 1. 三点リーダーボタンが表示されていることを確認
    await expect(threeDotsButton).toBeVisible();

    // 2. ボタンをクリックしてドロップダウンメニューを開く
    await threeDotsButton.click();

    // 3. ドロップダウンメニューが表示されたことを確認
    const dropdownMenu = reportDocxRow.locator(".dropdown-menu"); // その行の子孫としてメニューを探す
    await expect(dropdownMenu).toBeVisible();

    // 4. 各メニュー項目が表示されていることを確認
    await expect(dropdownMenu.getByRole("button", { name: "Detail" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "View" })).toBeVisible(); // report.docx はファイルなので 'View' があるはず
    await expect(dropdownMenu.getByRole("button", { name: "Rename" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Move" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Copy" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Download" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Delete" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Change Permissions" })).toBeVisible();

    // 5. フォルダのメニューで 'View' が表示されないことを確認
    const presentationsRow = page.locator("tbody tr", { hasText: "presentations" });
    const presentationsThreeDotsButton = presentationsRow.locator("button.btn.p-0.border-0");
    await presentationsThreeDotsButton.click(); // フォルダのメニューを開く
    const presentationsDropdownMenu = presentationsRow.locator(".dropdown-menu");
    await expect(presentationsDropdownMenu).toBeVisible();
    await expect(presentationsDropdownMenu.getByRole("button", { name: "View" })).not.toBeVisible();
});

test("display action buttons", async ({ page }) => {
    // APIリクエストをモック
    await page.route("**/*", handleRoute);

    const targetPath = "/documents";
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    // --- 1. 初期状態: ファイルが選択されていない場合に非表示であること ---
    // 「Actions」ボタンを特定
    const actionsToggleButton = page.getByRole("button", { name: "Actions" });

    // selectedFiles.length === 0 のため、ボタンが表示されていないことを確認
    await expect(actionsToggleButton).not.toBeVisible();

    // --- 2. ファイルを選択してコンポーネントが表示されることを確認 ---
    // 最初のファイルのチェックボックスを選択
    const firstFileCheckbox = page.locator("tbody tr").first().locator('input[type="checkbox"]');
    await firstFileCheckbox.check();

    // ファイル選択後、「Actions」ボタンが表示されたことを確認
    await expect(actionsToggleButton).toBeVisible();

    // --- 3. ドロップダウンを開く ---
    await actionsToggleButton.click();

    // ドロップダウンメニューが表示されたことを確認
    const dropdownMenu = page.locator('ul.dropdown-menu[aria-labelledby="fileActionsDropdown"]');
    await expect(dropdownMenu).toBeVisible();

    // --- 4. メニュー項目が表示されていることを確認 ---
    await expect(dropdownMenu.getByRole("button", { name: "Download" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Delete" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Move" })).toBeVisible();

    // --- 5. ドロップダウンが閉じることを確認（例: 他の場所をクリック） ---
    // ドロップダウンの外側をクリックして閉じる
    await page.click("body", { position: { x: 10, y: 10 } }); // 適当な場所をクリック

    await expect(dropdownMenu).not.toBeVisible();

    // --- 6. 全てのファイルの選択を解除してコンポーネントが非表示になることを確認 ---
    await firstFileCheckbox.uncheck(); // 選択解除

    // コンポーネントが再び非表示になったことを確認
    await expect(actionsToggleButton).not.toBeVisible();
});
