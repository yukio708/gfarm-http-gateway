export function encodePath(path) {
    let p = "/" + path.replace(/^\/+/, "").replace(/\/+$/, "");
    // URL encode without slash
    return p.replace(/[^/]/g, encodeURIComponent);
}

export const getDeepestDirs = (dirSet) => {
    const result = [];

    for (const dirpath of dirSet) {
        // If no other dir starts with this one + "/" => it's a deepest dir
        const isDeepest = [...dirSet].every(
            (other) => other === dirpath || !other.startsWith(dirpath)
        );
        console.log("getDeepestDirs: isDeepest:", isDeepest, dirpath);
        if (isDeepest) {
            result.push(dirpath);
        }
    }

    return result;
};

export const CollectPathsFromItems = async (items) => {
    const files = [];
    const dirSet = new Set();

    const traverseFileTree = async (item, path = "") => {
        return new Promise((resolve) => {
            if (item.isFile) {
                item.file((file) => {
                    file.dirPath = path;
                    files.push(file);
                    resolve();
                });
            } else if (item.isDirectory) {
                const currentPath = path + item.name + "/";
                dirSet.add(currentPath); // collect directory
                const dirReader = item.createReader();
                dirReader.readEntries(async (entries) => {
                    for (const entry of entries) {
                        await traverseFileTree(entry, path + item.name + "/");
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    };

    const promises = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
            promises.push(traverseFileTree(item));
        }
    }
    await Promise.all(promises);
    return { files, dirSet };
};

export const CollectPathsFromFiles = (files) => {
    const dirSet = new Set();
    console.log("CollectPathsFromFiles:", files);

    const uploadFiles = files.map((file) => {
        const dirPath = file.webkitRelativePath
            ? file.webkitRelativePath.substring(0, file.webkitRelativePath.lastIndexOf("/")) + "/"
            : "";
        file.dirPath = dirPath;
        console.log("file.webkitRelativePath:", file.webkitRelativePath);
        console.log("file.dirPath:", file.dirPath);
        if (dirPath !== "") {
            dirSet.add(dirPath);
        }
        return file;
    });
    console.log("uploadFiles:", uploadFiles);

    return { files: uploadFiles, dirSet };
};

export const formatFileSize = (filesize) => {
    if (filesize === 0) {
        return "";
    }

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(filesize) / Math.log(k));

    const sizestr = parseFloat((filesize / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    return sizestr;
};

export const loadExternalCss = (url) => {
    if (document.querySelector(`link[href="${url}"]`)) {
        return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
};

export const getFileTypes = (files) => {
    const types = new Set();

    files.forEach((file) => {
        if (file.type === "directory") {
            types.add("folder");
        } else {
            const parts = file.name.split(".");
            if (parts.length > 1) {
                types.add(parts.pop().toLowerCase());
            }
        }
    });

    return Array.from(types);
};

export const options = [
    { label: "Today", value: "today", start: 0 },
    { label: "Last 7 Days", value: "week", start: -7 },
    { label: "Last 30 days", value: "month", start: -30 },
    { label: "Last 1 year", value: "year", start: -365 },
    { label: "This Month", value: "this_month", start: 0 },
    { label: "This Year", value: "this_year", start: 0 },
];

export const filterFiles = (files, filterTypes, dateFilter) => {
    const now = new Date();
    return files.filter((file) => {
        let isTypeMatch = true;
        let isDateMatch = true;
        if (filterTypes.length !== 0) {
            isTypeMatch = filterTypes.includes("folder") && file.type === "directory";
            const ext = file.name.split(".").pop().toLowerCase();
            isTypeMatch = filterTypes.includes(ext);
        }

        const updated = new Date(file.mtime_str);
        if (dateFilter == "today") {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            // console.log("updated", updated);
            console.log("today: start", start);
            isDateMatch =
                updated.getFullYear() === start.getFullYear() &&
                updated.getMonth() === start.getMonth() &&
                updated.getDate() === start.getDate();
        } else if (dateFilter === "this_month") {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            console.log("this_month: start", start);
            isDateMatch = updated >= start;
        } else if (dateFilter === "this_year") {
            const start = new Date(now.getFullYear(), 0, 1);
            console.log("this_year: start", start);
            isDateMatch = updated >= start;
        } else {
            const getOptionByValue = (value) => {
                return options.find((option) => option.value === value);
            };
            const selected = getOptionByValue(dateFilter);
            if (selected) {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                start.setDate(start.getDate() + selected.start);
                console.log(dateFilter, "start", start);
                console.log("updated", updated);
                console.log("updated >= start", updated >= start);

                isDateMatch = updated >= start;
            }
        }

        return isDateMatch && isTypeMatch;
    });
};

export const sortFilesByName = (a, b, sortDirection) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();

    if (a.is_file !== b.is_file) {
        return a.is_file ? 1 : -1;
    }

    if (sortDirection === "asc") {
        return nameA.localeCompare(nameB);
    } else {
        return nameB.localeCompare(nameA);
    }
};

export const sortFilesBySize = (a, b, sortDirection) => {
    if (a.is_file !== b.is_file) {
        return a.is_file ? 1 : -1;
    }
    if (sortDirection === "asc") {
        return a.size - b.size;
    } else {
        return b.size - a.size;
    }
};

export const sortFilesByUpdateDate = (a, b, sortDirection) => {
    if (a.is_file !== b.is_file) {
        return a.is_file ? 1 : -1;
    }
    if (sortDirection === "asc") {
        return new Date(a.mtime_str) - new Date(b.mtime_str);
    } else {
        return new Date(b.mtime_str) - new Date(a.mtime_str);
    }
};

export const getPlatform = () => {
    const ua = window.navigator.userAgent;

    if (/android/i.test(ua)) return "android";
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "ios";
    return "desktop";
};
