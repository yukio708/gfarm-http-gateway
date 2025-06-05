let fileMeta = null;

export const loadFileMeta = async () => {
    if (fileMeta) return fileMeta; // already loaded

    const res = await fetch("/assets/file_meta.json");
    if (!res.ok) throw new Error("Failed to load file_meta.json");

    fileMeta = await res.json();
    return fileMeta;
};

export const getIconCSS = async () => {
    const meta = await loadFileMeta();
    return meta.css;
};

export const getFileCategory = async (ext) => {
    const meta = await loadFileMeta();
    ext = ext.toLowerCase();

    for (const [category, extensions] of Object.entries(meta.category)) {
        if (extensions.includes(ext)) {
            return category;
        }
    }

    return "unknown";
};

export const getFileIcon = async (ext, is_file) => {
    const meta = await loadFileMeta();
    if (!is_file) {
        return meta.icons?.["folder"];
    }
    const category = await getFileCategory(ext);
    return meta.icons?.[category] || "bi bi-file-earmark";
};
