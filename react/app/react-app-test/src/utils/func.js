export function encodePath(path) {
    let p = '/' + path.replace(/^\/+/, "").replace(/\/+$/, "");
    // URL encode without slash
    return p.replace(/[^/]/g, encodeURIComponent);
}

export const getDeepestDirs = (dirSet) => {
    const result = [];

    for (const dirpath of dirSet) {
        // If no other dir starts with this one + "/" => it's a deepest dir
        const isDeepest = [...dirSet].every(other => (
            other === dirpath || !other.startsWith(dirpath)
        ));
        console.log("getDeepestDirs: isDeepest:", isDeepest, dirpath);
        if (isDeepest) {
            result.push(dirpath);
        }
    }

    return result;
};

export const CollectPathsFromItems = async(items) => {
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
    return {files, dirSet};
}

export const CollectPathsFromFiles = (files) => {
    const dirSet = new Set();
    console.log("CollectPathsFromFiles:", files);

    const uploadFiles = files.map(file => {
        const dirPath = file.webkitRelativePath
            ? file.webkitRelativePath.substring(0, file.webkitRelativePath.lastIndexOf("/")) + '/'
            : "";
        file.dirPath = dirPath;
        console.log("file.webkitRelativePath:", file.webkitRelativePath);
        console.log("file.dirPath:", file.dirPath);
        if (dirPath !== ""){
            dirSet.add(dirPath);
        }
        return file;
    });
    console.log("uploadFiles:", uploadFiles);

    return {files:uploadFiles, dirSet};
}

export const formatFileSize = (filesize) => {
    if (filesize === 0) {
        return "";
    }

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(filesize) / Math.log(k));

    const sizestr =  parseFloat((filesize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    return sizestr;
}