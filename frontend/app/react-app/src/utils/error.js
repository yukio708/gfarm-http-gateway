export default function get_error_message(status_code, detail) {
    console.error(status_code, detail);

    if (detail === null || detail === undefined) {
        return `${status_code || "-"} : Error`;
    }
    if (detail.message) {
        return `${status_code || "-"} : ${detail.message} ( ${detail.stdout ? detail.stdout + ", " : ""}${detail.stderr} )`;
    }
    return `${status_code || "-"} : ${detail}`;
}
