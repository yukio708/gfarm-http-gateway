export async function loadFileTypes() {
    const response = await fetch("/assets/file_category.json");
    if (!response.ok) {
        throw new Error("Failed to load file type config");
    }
    const data = await response.json();
    return data;
}

export const getCategoryFromExt = (ext, fileTypeMap) => {
    for (const [category, exts] of Object.entries(fileTypeMap)) {
        if (exts.includes(ext.toLowerCase())) {
            return category;
        }
    }
    return "other";
};
