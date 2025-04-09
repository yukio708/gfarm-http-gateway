export function encodePath(path) {
    let p = '/' + path.replace(/^\/+/, "").replace(/\/+$/, "");
    // URL encode without slash
    return p.replace(/[^/]/g, encodeURIComponent);
}