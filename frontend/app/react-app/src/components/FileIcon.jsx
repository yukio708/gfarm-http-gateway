import React, { useEffect, useState } from "react";
import { getFileIcon } from "../utils/getFileCategory";
import PropTypes from "prop-types";

function FileIcon({ filename, is_file, size }) {
    const [iconClass, setIconClass] = useState("bi bi-file-earmark");
    const extension = filename.split(".").pop();

    useEffect(() => {
        const loadIcons = async () => {
            const classname = await getFileIcon(extension, is_file);
            setIconClass(classname);
        };
        loadIcons();
    }, []);

    return <i className={iconClass || ""} style={{ fontSize: size || "1.5rem" }}></i>;
}

export default FileIcon;

FileIcon.propTypes = {
    filename: PropTypes.string,
    is_file: PropTypes.bool,
    size: PropTypes.string,
};
