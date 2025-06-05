import React from "react";
import { getCategoryFromExt } from "../utils/getFileCategory";
import {
    BsFolder,
    BsFileEarmark,
    BsFileEarmarkPdf,
    BsFileEarmarkZip,
    BsFileEarmarkImage,
    BsFileEarmarkPlay,
    BsFileEarmarkMusic,
    BsFileEarmarkCode,
} from "react-icons/bs";
import PropTypes from "prop-types";

function FileIcon(filename, is_file, fileTypeMap) {
    const extension = filename.split(".").pop().toLowerCase();

    if (!is_file) {
        return <BsFolder />;
    }

    const category = getCategoryFromExt(extension, fileTypeMap);

    switch (category) {
        case "image":
            return <BsFileEarmarkImage />;
        case "video":
            return <BsFileEarmarkPlay />;
        case "audio":
            return <BsFileEarmarkMusic />;
        case "pdf":
            return <BsFileEarmarkPdf />;
        case "archive":
            return <BsFileEarmarkZip />;
        case "code":
            return <BsFileEarmarkCode />;
        case "document":
        default:
            return <BsFileEarmark />; // Default file icon
    }
}

export default FileIcon;

FileIcon.propTypes = {
    filename: PropTypes.string,
    is_file: PropTypes.bool,
    fileTypeMap: PropTypes.array,
};
