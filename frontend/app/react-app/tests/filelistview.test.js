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
        if (node.path === normalizedTargetPath) {
            return node.childlen && Array.isArray(node.childlen) ? node.childlen : [];
        }

        // If the current node is a directory and has child elements
        if (!node.is_file && node.childlen && Array.isArray(node.childlen)) {
            if (
                normalizedTargetPath.startsWith(node.path + "/") ||
                (node.path === "/" && normalizedTargetPath !== "/")
            ) {
                const foundChildren = findChildrenByPath(node.childlen, targetPath);
                if (foundChildren !== null) {
                    return foundChildren;
                }
            }
        }
    }
    // Return null if path is not found
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

// File/Directory Display Test

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

    // Check if the table header is displayed
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

    // Validate the row and contents of each file/folder
    for (const expectedFile of expectedChildren) {
        const rowLocator = page.locator("tbody tr", { hasText: expectedFile.name });

        // Check if the row itself is visible
        await expect(rowLocator).toBeVisible();

        // Check the icon
        const ext = expectedFile.name.split(".").pop();
        const iconClassString = getFileIconDefault(ext, expectedFile.is_file);
        const iconCssSelector = "." + iconClassString.replace(/ /g, ".");
        await expect(rowLocator.locator(iconCssSelector)).toBeVisible();

        // Check if the file name is displayed correctly
        const fileCheckbox = rowLocator.locator('input[type="checkbox"][class="form-check-input"]');
        await expect(fileCheckbox).toBeVisible();
        await expect(fileCheckbox).not.toBeChecked();

        await expect(rowLocator.locator("td").nth(2)).toHaveText(expectedFile.name);

        await expect(rowLocator.locator("td").nth(3)).toHaveText(getSize(expectedFile.size));

        await expect(rowLocator.locator("td").nth(4)).toHaveText(expectedFile.mtime_str);
    }
});

test("display error on nonexistent path", async ({ page }) => {
    await page.route("**/*", handleRoute);
    const nonexistentPath = "/nonexistent-directory-12345";
    await page.goto(`${FRONTEND_URL}/#${nonexistentPath}`);

    // The heading "Error!" is displayed
    await expect(page.getByRole("heading", { name: "Error!" })).toBeVisible();

    // The correct error message is displayed
    await expect(page.getByText(`Failed to fetch ${nonexistentPath} : Error: 404`)).toBeVisible();

    // "Return to home" link is visible
    await expect(page.getByRole("link", { name: "Return to home" })).toBeVisible();

    // Check if the link's 'to' attribute (href) is valid
    const homeLink = page.getByRole("link", { name: "Return to home" });
    await expect(homeLink).toHaveAttribute("href", "#/");
});

test("display long file list", async ({ page }) => {
    const numberOfFiles = 1000;

    await page.route("**/d/*", async (route) => {
        const url = new URL(route.request().url());
        let requestedPath = url.pathname.substring(3);
        if (requestedPath === "") {
            requestedPath = "/";
        } else {
            requestedPath = "/" + decodeURIComponent(requestedPath);
        }

        const largeFileList = [];
        for (let i = 0; i < numberOfFiles; i++) {
            largeFileList.push({
                mode_str: "-rw-r--r--",
                is_file: true,
                nlink: 1,
                uname: `user${i % 5}`,
                gname: "users",
                size: Math.floor(Math.random() * 1000000) + 1000,
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

    // Access the path where a large number of files are displayed
    await page.goto(FRONTEND_URL);

    await page.waitForSelector(".file-table", {
        timeout: 10000,
    });

    const tableHeader = page.locator("table.file-table thead tr");

    // Check if all the specified number of files are displayed
    const fileItems = page.locator("tbody tr");
    await expect(fileItems).toHaveCount(numberOfFiles);

    const lastFileName = `large_file_${numberOfFiles - 1}.txt`;
    await page.waitForSelector(`text=${lastFileName}`);

    // Scroll until the element is found
    await page.getByText(lastFileName).scrollIntoViewIfNeeded();

    // Check if the last file is displayed
    await expect(page.getByText(lastFileName)).toBeVisible();

    // After scrolling, make sure the header is visible, even if it should fit in the viewport

    // Check if the table header is visible
    await expect(tableHeader).toBeVisible();

    // Performance verification (optional but advanced test)

    // const startTime = performance.now();
    // await page.goto(FRONTEND_URL + "/d/");
    // // Wait until the network settles down
    // await page.waitForLoadState('networkidle');

    // await expect(fileItems).toHaveCount(numberOfFiles);
    // const endTime = performance.now();
    // console.log(`Rendering ${numberOfFiles} files took ${endTime - startTime} ms`);
    // // Expect rendering within 5 seconds
    // expect(endTime - startTime).toBeLessThan(5000);
});

test("sort by filename", async ({ page }) => {
    await page.route("**/*", handleRoute);

    const targetPath = "/";
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    const initialFiles = findChildrenByPath(fileStructureData, targetPath);

    const nameHeader = page.locator('[data-testid="header-name"]');
    const fileNamesLocator = page.locator("tbody tr td:nth-child(3)");

    // arc
    console.log(`expectedChildren: ${initialFiles}`);
    const expectedAscendingNames = [...initialFiles].sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return nameA.localeCompare(nameB);
    });

    // default : name asc

    await expect(nameHeader.locator('[data-testid="sort-icon-asc"]')).toBeVisible();

    for (let i = 0; i < expectedAscendingNames.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedAscendingNames[i].name);
    }

    // desc
    const expectedDescendingNames = [...initialFiles].sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return nameB.localeCompare(nameA);
    });

    await nameHeader.click();

    await expect(nameHeader.locator('[data-testid="sort-icon-desc"]')).toBeVisible();

    for (let i = 0; i < expectedDescendingNames.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedDescendingNames[i].name);
    }
});

test("sort by filesize", async ({ page }) => {
    await page.route("**/*", handleRoute);

    const targetPath = "/";
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    const initialFiles = findChildrenByPath(fileStructureData, targetPath);

    const sizeHeader = page.locator('[data-testid="header-size"]');
    const fileNamesLocator = page.locator("tbody tr td:nth-child(3)");

    // arc
    const expectedAscendingSizes = [...initialFiles].sort((a, b) => {
        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return a.size - b.size;
    });

    await sizeHeader.click();

    await expect(sizeHeader.locator('[data-testid="sort-icon-asc"]')).toBeVisible();

    for (let i = 0; i < expectedAscendingSizes.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedAscendingSizes[i].name);
    }

    // desc
    const expectedDescendingSizes = [...initialFiles].sort((a, b) => {
        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return b.size - a.size;
    });

    await sizeHeader.click();
    await expect(sizeHeader.locator('[data-testid="sort-icon-desc"]')).toBeVisible();

    for (let i = 0; i < expectedDescendingSizes.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedDescendingSizes[i].name);
    }
});

test("sort by update date", async ({ page }) => {
    await page.route("**/*", handleRoute);

    const targetPath = "/";
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    const initialFiles = findChildrenByPath(fileStructureData, targetPath);

    const updatedDateHeader = page.locator('[data-testid="header-date"]');
    const fileNamesLocator = page.locator("tbody tr td:nth-child(3)");

    // arc
    const expectedAscendingTimes = [...initialFiles].sort((a, b) => {
        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return new Date(a.mtime_str) - new Date(b.mtime_str);
    });

    await updatedDateHeader.click();

    await expect(updatedDateHeader.locator('[data-testid="sort-icon-asc"]')).toBeVisible();

    for (let i = 0; i < expectedAscendingTimes.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedAscendingTimes[i].name);
    }

    // desc
    const expectedDescendingTimes = [...initialFiles].sort((a, b) => {
        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        return new Date(b.mtime_str) - new Date(a.mtime_str);
    });

    await updatedDateHeader.click();
    await expect(updatedDateHeader.locator('[data-testid="sort-icon-desc"]')).toBeVisible();

    for (let i = 0; i < expectedDescendingTimes.length; i++) {
        await expect(fileNamesLocator.nth(i)).toHaveText(expectedDescendingTimes[i].name);
    }
});

test("filter by extension", async ({ page }) => {
    await page.route("**/*", handleRoute);

    const targetPath = "/documents";
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    const initialFiles = findChildrenByPath(fileStructureData, targetPath);
    const expectedTxtFiles = initialFiles.filter(
        (file) => file.is_file && file.name.endsWith(".txt")
    );
    const unexpectedPdfFile = initialFiles.find(
        (file) => file.is_file && file.name.endsWith(".docx")
    );
    const folder = initialFiles.find((file) => !file.is_file);

    // Find the dropdown toggle button
    const filterToggleButton = page.locator('[data-testid="file-filter-dropdown"]');
    await expect(filterToggleButton).toBeVisible();

    await filterToggleButton.click();

    const clearButton = page.locator('[data-testid="file-filter-clear-button"]');
    await expect(clearButton).toBeVisible();

    const txtFilterCheckbox = page.locator("#dropdown-filter-txt");
    await expect(txtFilterCheckbox).toBeVisible();
    await txtFilterCheckbox.check();

    await filterToggleButton.click();

    // Wait for the list to update after applying a filter
    await page.waitForLoadState("networkidle");

    // Check display files
    for (const expectedFile of expectedTxtFiles) {
        await expect(page.locator("tbody tr", { hasText: expectedFile.name })).toBeVisible();
    }
    if (unexpectedPdfFile) {
        await expect(
            page.locator("tbody tr", { hasText: unexpectedPdfFile.name })
        ).not.toBeVisible();
    }
    if (folder) {
        // folders should be hidden
        await expect(page.locator("tbody tr", { hasText: folder.name })).not.toBeVisible();
    }
    await expect(page.locator("tbody tr")).toHaveCount(expectedTxtFiles.length);

    await expect(filterToggleButton).toHaveText("Types: txt");

    await filterToggleButton.click();
    await clearButton.click();

    // show all
    for (const expectedFile of initialFiles) {
        await expect(page.locator("tbody tr", { hasText: expectedFile.name })).toBeVisible();
    }
});

// return the expected list of files based on a given dateFilter value
const getExpectedFilesForDateFilter = (allFiles, filterType) => {
    const now = new Date("2025-06-01T12:00:00Z"); // freeze time

    return allFiles.filter((file) => {
        const fileDate = new Date(file.mtime_str);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const oneYearAgo = new Date(now);
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        switch (filterType) {
            case "all":
                return true;
            case "today":
                return (
                    fileDate.getFullYear() === now.getFullYear() &&
                    fileDate.getMonth() === now.getMonth() &&
                    fileDate.getDate() === now.getDate()
                );
            case "week":
                return fileDate >= sevenDaysAgo;
            case "month":
                return fileDate >= thirtyDaysAgo;
            case "year":
                return fileDate >= oneYearAgo;
            case "this_month":
                return (
                    fileDate.getFullYear() === now.getFullYear() &&
                    fileDate.getMonth() === now.getMonth()
                );
            case "this_year":
                return fileDate.getFullYear() === now.getFullYear();
            default:
                return true;
        }
    });
};

test("filter by modified date (all options)", async ({ page }) => {
    await page.route("**/*", handleRoute);

    await page.addInitScript((isoDate) => {
        const fixed = new Date(isoDate);
        const OriginalDate = Date;

        class MockDate extends OriginalDate {
            constructor(...args) {
                if (args.length === 0) {
                    return new OriginalDate(fixed);
                }
                return new OriginalDate(...args);
            }

            static now() {
                return fixed.getTime();
            }

            static parse = OriginalDate.parse;
            static UTC = OriginalDate.UTC;
            static [Symbol.hasInstance](instance) {
                return instance instanceof OriginalDate;
            }
        }

        window.Date = MockDate;
    }, "2025-06-01T12:00:00Z"); // freeze time

    const targetPath = "/";
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    const allFilesAtRoot = findChildrenByPath(fileStructureData, targetPath);
    const dateFilterToggleButton = page.locator('[data-testid="date-filter-dropdown"]');
    await expect(dateFilterToggleButton).toBeVisible();

    const filtersToTest = [
        { label: "Today", value: "today" },
        { label: "Last 7 Days", value: "week" },
        { label: "Last 30 days", value: "month" },
        { label: "Last 1 year", value: "year" },
        { label: "This Month", value: "this_month" },
        { label: "This Year", value: "this_year" },
    ];

    for (const { label, value } of filtersToTest) {
        await dateFilterToggleButton.click(); // open dropdown again
        const option = page.locator(`#dropdown-filter-${value}`);
        await expect(option).toBeVisible();
        await option.click();

        await page.waitForLoadState("networkidle");
        await expect(dateFilterToggleButton).toHaveText(label);

        const expectedFiles = getExpectedFilesForDateFilter(allFilesAtRoot, value);
        await expect(page.locator("tbody tr")).toHaveCount(expectedFiles.length);

        for (const expectedFile of expectedFiles) {
            await expect(page.locator("tbody tr", { hasText: expectedFile.name })).toBeVisible();
        }

        const unexpectedFiles = allFilesAtRoot.filter((file) => !expectedFiles.includes(file));
        for (const unexpectedFile of unexpectedFiles) {
            await expect(
                page.locator("tbody tr", { hasText: unexpectedFile.name })
            ).not.toBeVisible();
        }
    }

    // Clear filter
    await dateFilterToggleButton.click();
    const clearFilterButton = page.locator('[data-testid="date-filter-clear-button"]');
    await clearFilterButton.click();

    await page.waitForLoadState("networkidle");
    await expect(dateFilterToggleButton).toHaveText("Filter by Modified");
    await expect(page.locator("tbody tr")).toHaveCount(allFilesAtRoot.length);
});

test("display current directory path", async ({ page }) => {
    await page.route("**/*", handleRoute);

    await page.goto(`${FRONTEND_URL}/#/`);

    const homeButton = page.locator("ol.breadcrumb button.btn.p-0").first();
    await expect(homeButton).toBeVisible();
    await expect(homeButton.locator("svg")).toBeVisible();

    // home = 1
    await expect(page.locator("ol.breadcrumb li")).toHaveCount(1);
    await expect(
        page.locator("ol.breadcrumb li").filter({ hasText: "documents" })
    ).not.toBeVisible();

    const testPath = "/documents/presentations";
    await page.goto(`${FRONTEND_URL}/#${testPath}`);

    await expect(homeButton).toBeVisible();

    // "documents"
    const documentsBreadcrumb = page.locator("ol.breadcrumb li button", { hasText: "documents" });
    await expect(documentsBreadcrumb).toBeVisible();
    // "presentations"
    const presentationsBreadcrumb = page.locator("ol.breadcrumb li button", {
        hasText: "presentations",
    });
    await expect(presentationsBreadcrumb).toBeVisible();

    // home + "documents" + "presentations" = 3
    await expect(page.locator("ol.breadcrumb li")).toHaveCount(3);

    // go to "documents"
    await documentsBreadcrumb.click();

    await expect(page).toHaveURL(`${FRONTEND_URL}/#/documents`);

    // home + "documents" = 2
    await expect(page.locator("ol.breadcrumb li")).toHaveCount(2);
    await expect(page.locator("ol.breadcrumb li button", { hasText: "documents" })).toBeVisible();

    // go home
    await homeButton.click();

    await expect(page).toHaveURL(`${FRONTEND_URL}/#/`);

    // home = 1
    await expect(page.locator("ol.breadcrumb li")).toHaveCount(1);

    // access /documents/presentations/
    await page.goto(`${FRONTEND_URL}/#/documents/presentations/`);
    // /documents/presentations
    await expect(
        page.locator("ol.breadcrumb li button", { hasText: "presentations" })
    ).toBeVisible();
    // Trailing slashes are ignored
    await expect(page.locator("ol.breadcrumb li")).toHaveCount(3);
});

test("display operation menu for a file", async ({ page }) => {
    await page.route("**/*", handleRoute);

    const targetPath = "/documents";
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    // Find the line in the file to be tested
    const reportDocxRow = page.locator("tbody tr", { hasText: "report.docx" });
    const threeDotsButton = reportDocxRow.locator("button.btn.p-0.border-0");

    // Check if the three-point leader button is displayed
    await expect(threeDotsButton).toBeVisible();

    // Click the button to open the drop-down menu
    await threeDotsButton.click();

    // Check if the dropdown menu appears
    const dropdownMenu = reportDocxRow.locator(".dropdown-menu");
    await expect(dropdownMenu).toBeVisible();

    // Check if each menu item is displayed
    await expect(dropdownMenu.getByRole("button", { name: "Detail" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "View" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Rename" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Move" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Copy" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Download" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Delete" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Change Permissions" })).toBeVisible();

    // Check if 'View' does not appear in the folder menu
    const presentationsRow = page.locator("tbody tr", { hasText: "presentations" });
    const presentationsThreeDotsButton = presentationsRow.locator("button.btn.p-0.border-0");
    await presentationsThreeDotsButton.click();
    const presentationsDropdownMenu = presentationsRow.locator(".dropdown-menu");
    await expect(presentationsDropdownMenu).toBeVisible();
    await expect(presentationsDropdownMenu.getByRole("button", { name: "View" })).not.toBeVisible();
});

test("display action buttons", async ({ page }) => {
    await page.route("**/*", handleRoute);

    const targetPath = "/documents";
    await page.goto(`${FRONTEND_URL}/#${targetPath}`);

    const actionsToggleButton = page.getByRole("button", { name: "Actions" });

    // Check that the button is not displayed
    await expect(actionsToggleButton).not.toBeVisible();

    const firstFileCheckbox = page.locator("tbody tr").first().locator('input[type="checkbox"]');
    await firstFileCheckbox.check();

    // Check if the "Actions" button is displayed
    await expect(actionsToggleButton).toBeVisible();

    await actionsToggleButton.click();

    // Check if the dropdown menu appears
    const dropdownMenu = page.locator('ul.dropdown-menu[aria-labelledby="fileActionsDropdown"]');
    await expect(dropdownMenu).toBeVisible();

    await expect(dropdownMenu.getByRole("button", { name: "Download" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Delete" })).toBeVisible();
    await expect(dropdownMenu.getByRole("button", { name: "Move" })).toBeVisible();

    // Click outside the dropdown to close
    await page.click("body", { position: { x: 10, y: 10 } });

    await expect(dropdownMenu).not.toBeVisible();

    await firstFileCheckbox.uncheck();

    // Check if the component is hidden again
    await expect(actionsToggleButton).not.toBeVisible();
});
