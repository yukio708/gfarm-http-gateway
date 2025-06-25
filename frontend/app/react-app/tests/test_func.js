const fs = require("fs");
const path = require("path");
const http = require("http");

export const FRONTEND_URL = "http://localhost:3000";
export const API_URL = "http://localhost:8080";
export const DIR_LIST = path.resolve(__dirname, "data/filelist.json");
export const ACLIST = path.resolve(__dirname, "data/aclist.json");
export const DUMMYS = path.resolve(__dirname, "data/dummy");

export const ZIPNAME = "files.zip";

let fileStructureData = null;

// Wait for React frontend to start
export async function waitForReact() {
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

export const findChildrenByPath = (nodes, targetPath) => {
    if (targetPath === null) return null;
    console.log("targetPath", targetPath);
    const normalizedTargetPath = targetPath.startsWith("/") ? targetPath : "/" + targetPath;

    for (const node of nodes) {
        if (node.path === normalizedTargetPath) {
            return node.childlen && Array.isArray(node.childlen) ? node.childlen : [];
        }

        // If the current node is a directory and has child elements
        if (node.is_dir && node.childlen && Array.isArray(node.childlen)) {
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

export const findNodeByPath = (nodes, targetPath) => {
    if (targetPath === null) return null;
    const normalizedTargetPath = targetPath.startsWith("/") ? targetPath : "/" + targetPath;

    for (const node of nodes) {
        if (node.path === normalizedTargetPath) {
            return node;
        }

        if (node.is_dir && node.childlen && Array.isArray(node.childlen)) {
            if (
                normalizedTargetPath.startsWith(node.path + "/") ||
                (node.path === "/" && normalizedTargetPath !== "/")
            ) {
                const foundNode = findNodeByPath(node.childlen, targetPath);
                if (foundNode !== null) {
                    return foundNode;
                }
            }
        }
    }
    return null;
};

export const getSize = (filesize, is_dir) => {
    if (is_dir) {
        return "";
    }

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(filesize) / Math.log(k));

    const sizestr = parseFloat((filesize / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    return sizestr;
};

export const getFileIconDefault = (ext, is_dir, is_sym) => {
    ext = ext.toLowerCase();
    if (is_dir) {
        return "bi bi-folder";
    }
    if (is_sym) {
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

export const getDummyFileContent = (filename) => {
    return fs.readFileSync(DUMMYS + filename, "utf8");
};

// Route handler
export const handleRoute = async (route, request) => {
    const url = request.url();
    const method = request.method();
    console.log("url", url);

    if (url.includes("/dir/") && method === "GET") {
        console.log("/dir/", url);
        if (fileStructureData === null) {
            fileStructureData = JSON.parse(fs.readFileSync(DIR_LIST, "utf-8"));
        }
        const path = url.split("/dir/", 2)[1].split("?")[0];
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
    } else if (url.includes("/attr/")) {
        console.log("/attr/", url);
        const filePath = decodeURIComponent(url.split("/attr/")[1]);
        const fileNode = findNodeByPath(fileStructureData, filePath);

        if (fileNode) {
            // Construct a detail object using information from the fileNode
            const detailResponse = {
                File: fileNode.name,
                Filetype: fileNode.name.includes(".")
                    ? fileNode.name.split(".").pop()
                    : fileNode.is_file
                      ? "regular file"
                      : "directory",
                Size: fileNode.size,
                Mode: fileNode.mode_str,
                Access: fileNode.mtime_str, // Use 'mtime_str'
                Modify: fileNode.mtime_str, // Use 'mtime_str'
                Change: fileNode.mtime_str, // Use 'mtime_str'
                Uid: fileNode.uname, // Use 'uname'
                Gid: fileNode.gname, // Use 'gname'
                MetadataHost: "test-host.local",
                MetadataPort: 8080,
                MetadataUser: "testuser",
            };

            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(detailResponse),
            });
        } else {
            await route.fulfill({
                status: 404,
                contentType: "application/json",
                body: JSON.stringify({ error: "File not found" }),
            });
        }
    } else if (url.includes("/file/") && method === "GET") {
        console.log("/file/", url);
        const filePath = decodeURIComponent(url.split("/file/")[1].split("?")[0]);
        const filename = filePath.split("/").pop();
        const ext = filename.split(".").pop();
        const request_url = new URL(url);
        const action = request_url.searchParams.get("action") || "view";

        console.log("filename", filename);
        if (filename === "deleted_file.txt") {
            await route.fulfill({
                status: 404,
                contentType: "application/json",
                body: JSON.stringify({ error: `File not found: ${filePath}` }),
            });
            return;
        }
        if (filePath.endsWith("backend_disconnect.txt")) {
            // await route.fulfill({
            //     status: 500,
            //     contentType: "application/json",
            //     body: JSON.stringify({
            //         error: "Simulated server disconnect: Internal Server Error",
            //     }),
            // });

            await route.continue();
            return;
        }
        if (filePath.endsWith("cancellable_file.txt")) {
            return;
        }

        const mockContent = `This is the content of /${filePath}.`;
        const mockContent_html = `<!DOCTYPE html><html><body><h1>${filePath} Content</h1><p>This file was displayed in a new tab.</p></body></html>`;
        const mockContent_pdf = Buffer.from(
            "JVBERi0xLjQKJdDUxdgKMSAwIG9iagogIDw8L1BhZ2VzIDIgMCBSD4u (a very short PDF string) ...",
            "base64"
        );
        const headers = {};
        if (ext === "html") {
            headers["content-type"] = "text/html";
            headers["content-length"] = mockContent_html.length.toString();
        } else if (ext === "pdf") {
            headers["content-type"] = "application/pdf";
            headers["content-length"] = mockContent_pdf.length.toString();
        } else {
            headers["content-type"] = "text/plain";
            headers["content-length"] = mockContent.length.toString();
        }

        if (action === "download") {
            const encoded = encodeURIComponent(filename);
            headers["content-disposition"] = `attachment; filename*=UTF-8''"${encoded}"`;
        }

        if (filename.includes("empty")) {
            await route.fulfill({
                status: 200,
                body: "",
                headers,
            });
        } else {
            await route.fulfill({
                status: 200,
                body: mockContent,
                headers,
            });
        }
    } else if (url.includes("/zip") && method === "POST") {
        if (fileStructureData === null) {
            fileStructureData = JSON.parse(fs.readFileSync(DIR_LIST, "utf-8"));
        }
        console.log("/zip/", url);
        const json = JSON.parse(request.postData());
        const files = json["files"];

        const AdmZip = require("adm-zip");
        const zip = new AdmZip();
        for (const item of files) {
            const itemPath = decodeURIComponent(item.split(":")[1]);
            const node = findNodeByPath(fileStructureData, itemPath);

            if (node) {
                const entryPath = node.name;

                if (node.is_file) {
                    let fileContent = `Dummy content for ${node.path}. Size: ${getSize(node.size)}`;
                    if (node.size === 0) {
                        fileContent = "";
                    }
                    zip.addFile(entryPath, fileContent);
                    console.log(`[ROUTE MOCK] Added file to ZIP: ${entryPath}`);
                } else {
                    zip.addFile(entryPath + "/", Buffer.from(""));
                    console.log(`[ROUTE MOCK] Added directory to ZIP: ${entryPath}`);
                }
            } else {
                console.warn(`[ROUTE MOCK] Path not found in mock data: ${itemPath}`);
                // 存在しないパスはZIPに含めない
            }
        }
        // const zipContent = await zip.generateAsync({ type: "uint8array" });
        // const zipContentBuffer = Buffer.from(zipContent); // 明示的にBufferに変換
        const zipContentBuffer = zip.toBuffer();
        const headers = {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename=${ZIPNAME}`,
            "Content-Length": zipContentBuffer.length.toString(),
        };
        await route.fulfill({
            status: 200,
            body: zipContentBuffer,
            headers,
        });
    } else if (url.includes("/file/") && method === "PUT") {
        console.log("/file/", url);
        const request = route.request();
        const bodyBuffer = request.postDataBuffer();
        const bodyText = request.postData();

        console.log("Body buffer:", bodyBuffer);
        console.log("Body text:", bodyText); // for plain text or JSON

        // Return mocked JSON response
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ result: "ok" }),
        });
    } else if (url.includes("/dir/") && method === "PUT") {
        console.log("/dir/", url);
        const dirPath = decodeURIComponent(url.split("/dir/")[1].split("?")[0]);

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ message: `Directory '${dirPath}' created successfully.` }),
        });
        return;
    } else if (url.includes("/users") && method === "GET") {
        console.log("[MOCK] /users GET", url);
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ list: ["userA", "userB", "userC", "admin"] }),
        });
    } else if (url.includes("/groups") && method === "GET") {
        console.log("[MOCK] /groups GET", url);
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ list: ["groupA", "groupB", "developers", "testers"] }),
        });
    } else if (url.includes("/acl") && method === "GET") {
        console.log("[MOCK] /acl GET", url);
        let mockAclData = JSON.parse(fs.readFileSync(ACLIST, "utf-8"));

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ acl: mockAclData }),
        });
    } else if (url.includes("/acl") && method === "POST") {
        console.log("[MOCK] /acl POST", url);
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ message: "ACL updated successfully" }),
        });
    } else {
        await route.continue();
    }
};
