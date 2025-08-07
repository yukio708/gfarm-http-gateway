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

export const ErrorCodes = {
    EMPTY_NAME: 1001,
    EMPTY_PATH: 1002,
    INVALID_NAME: 1003,
    NOT_FOUND: 1004,
    SAME_DESTINATION: 1005,
    ALREADY_EXISTS: 1006,
    REQUIRED_NOT_MET: 1007,
};

const ErrorMap = {
    [ErrorCodes.EMPTY_NAME]: {
        type: "warning",
        message: "Empty name",
    },
    [ErrorCodes.EMPTY_PATH]: {
        type: "warning",
        message: "Empty path",
    },
    [ErrorCodes.INVALID_NAME]: {
        type: "warning",
        message: 'Invalid name. Avoid characters like <>:"/\\|?* or ending with space/dot.',
    },
    [ErrorCodes.NOT_FOUND]: {
        type: "warning",
        message: "Not found",
    },
    [ErrorCodes.SAME_DESTINATION]: {
        type: "warning",
        message: "Destination is the same as current path",
    },
    [ErrorCodes.ALREADY_EXISTS]: {
        type: "warning",
        message: "Already exists",
    },
    [ErrorCodes.REQUIRED_NOT_MET]: {
        type: "warning",
        message: "All fields are required",
    },
};

export function get_ui_error(code) {
    return ErrorMap[code] ?? { type: "warning", message: "Unknown error" };
}
