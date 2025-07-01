export const encodePath = (path) => {
    let p = "/" + path.replace(/^\/+/, "").replace(/\/+$/, "");
    // URL encode without slash
    return p.replace(/[^/]/g, encodeURIComponent);
};

export const getParentPath = (path) => {
    if (!path || path === "/") return "/";
    const parts = path.split("/").filter(Boolean);
    parts.pop(); // remove last part
    if (parts.length < 1) return "/";
    return "/" + parts.join("/");
};

export const getDeepestDirs = (dirSet) => {
    const result = [];

    for (const dirpath of dirSet) {
        // If no other dir starts with this one + "/" => it's a deepest dir
        const isDeepest = [...dirSet].every(
            (other) => other === dirpath || !other.startsWith(dirpath)
        );
        console.debug("getDeepestDirs: isDeepest:", isDeepest, dirpath);
        if (isDeepest) {
            result.push(dirpath);
        }
    }

    return result;
};

const mtime_str_options = {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    year: "numeric",
    hour12: false,
};

export const CollectPathsFromItems = async (items) => {
    const files = [];

    const traverseFileTree = async (item, path = "") => {
        return new Promise((resolve) => {
            if (item.isFile) {
                item.file((file) => {
                    const date = new Date(file.lastModified);
                    files.push({
                        path: path + file.name,
                        dirPath: path,
                        name: file.name,
                        is_file: true,
                        is_dir: false,
                        mtime_str: date.toLocaleString("en-US", mtime_str_options),
                        size: file.size,
                        file: file,
                    });
                    resolve();
                    console.debug("file", file);
                });
            } else if (item.isDirectory) {
                const currentPath = path + item.name + "/";

                const dirReader = item.createReader();
                dirReader.readEntries(async (entries) => {
                    if (entries.length > 0) {
                        for (const entry of entries) {
                            await traverseFileTree(entry, path + item.name + "/");
                        }
                    } else {
                        files.push({
                            path: currentPath,
                            dirPath: path,
                            name: item.name,
                            is_file: false,
                            is_dir: true,
                            mtime_str: "unknown",
                            size: null,
                        });
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
    return files;
};

export const CollectPathsFromFiles = (files) => {
    console.debug("CollectPathsFromFiles:", files);

    const uploadFiles = files.map((file) => {
        const dirPath = file.webkitRelativePath
            ? file.webkitRelativePath.substring(0, file.webkitRelativePath.lastIndexOf("/")) + "/"
            : "";
        const date = new Date(file.lastModified);
        return {
            path: dirPath + file.name,
            dirPath: dirPath,
            name: file.name,
            is_file: !file.isDirectory,
            is_dir: file.isDirectory,
            mtime_str: date.toLocaleString("en-US", mtime_str_options),
            size: file.size,
            file: file,
        };
    });
    console.debug("uploadFiles:", uploadFiles);

    return uploadFiles;
};

export const formatFileSize = (filesize, is_dir) => {
    if (filesize === null || is_dir) {
        return "";
    }
    if (filesize === 0) {
        return "0 Bytes";
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

export const filterItems = (items, filterTypes, dateFilter) => {
    const now = new Date();
    return items.filter((file) => {
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
            console.debug("today: start", start);
            isDateMatch =
                updated.getFullYear() === start.getFullYear() &&
                updated.getMonth() === start.getMonth() &&
                updated.getDate() === start.getDate();
        } else if (dateFilter === "this_month") {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            console.debug("this_month: start", start);
            isDateMatch = updated >= start;
        } else if (dateFilter === "this_year") {
            const start = new Date(now.getFullYear(), 0, 1);
            console.debug("this_year: start", start);
            isDateMatch = updated >= start;
        } else {
            const getOptionByValue = (value) => {
                return options.find((option) => option.value === value);
            };
            const selected = getOptionByValue(dateFilter);
            if (selected) {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                start.setDate(start.getDate() + selected.start);
                console.debug(dateFilter, "start", start);
                console.debug("updated", updated);
                console.debug("updated >= start", updated >= start);

                isDateMatch = updated >= start;
            }
        }

        return isDateMatch && isTypeMatch;
    });
};

export const sortItemsByName = (a, b, sortDirection) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();

    if (a.is_dir !== b.is_dir) {
        return a.is_dir ? -1 : 1;
    }

    if (sortDirection === "asc") {
        return nameA.localeCompare(nameB);
    } else {
        return nameB.localeCompare(nameA);
    }
};

export const sortItemsBySize = (a, b, sortDirection) => {
    if (a.is_dir !== b.is_dir) {
        return a.is_dir ? -1 : 1;
    }
    if (sortDirection === "asc") {
        return a.size - b.size;
    } else {
        return b.size - a.size;
    }
};

export const sortItemsByUpdateDate = (a, b, sortDirection) => {
    if (a.is_dir !== b.is_dir) {
        return a.is_dir ? -1 : 1;
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

export const checkConflicts = (incomingItems, currentItems) => {
    const currentMap = new Map(currentItems.map((file) => [file.name, file]));
    console.debug("currentMap", currentMap);
    let hasConflict = false;

    const updatedIncoming = incomingItems.map((file) => {
        if (file.dirPath) {
            const currentDir = currentMap.get(file.dirPath.replace(/\/$/, ""));
            if (currentDir) {
                hasConflict = true;
                return {
                    ...file,
                    is_conflicted: true,
                    parent_is_conflicted: true,
                    current_size: currentDir.size,
                    current_mtime_str: currentDir.mtime_str,
                };
            }
        } else {
            const current = currentMap.get(file.name);
            if (current) {
                hasConflict = true;
                return {
                    ...file,
                    is_conflicted: true,
                    parent_is_conflicted: false,
                    current_size: current.size || null,
                    current_mtime_str: current.mtime_str,
                };
            }
        }

        return {
            ...file,
            is_conflicted: false,
            parent_is_conflicted: false,
        };
    });

    return { hasConflict, incomingItems: updatedIncoming };
};

export const getUniqueConflicts = (incomingItems) => {
    const map = new Map();
    incomingItems.forEach((file) => {
        if (!file) return;
        const key = file.parent_is_conflicted ? file.dirPath.replace(/\/$/, "") : file.name;
        map.set(
            key,
            file.parent_is_conflicted
                ? {
                      ...file,
                      name: file.dirPath.replace(/\/$/, ""),
                  }
                : file
        );
    });
    return Array.from(map.values());
};

export const suggestNewName = (name, existingNames) => {
    const extIndex = name.lastIndexOf(".");
    const base = extIndex !== -1 ? name.slice(0, extIndex) : name;
    const ext = extIndex !== -1 ? name.slice(extIndex) : "";

    let i = 1;
    let newName = `${base} (${i})${ext}`;
    while (existingNames.includes(newName)) {
        i++;
        newName = `${base} (${i})${ext}`;
    }
    return newName;
};

export const checkFileName = (name) => {
    return (
        name.length > 0 && // not empty
        !/[<>:"/\\|?*]/.test(name) && // no invalid chars
        !/[. ]$/.test(name) // doesn't end with space or dot
    );
};
