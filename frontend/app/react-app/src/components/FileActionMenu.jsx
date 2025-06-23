import React from "react";
import {
    BsThreeDots,
    BsInfoCircle,
    BsEye,
    BsPencil,
    BsArrowRightSquare,
    BsFiles,
    BsDownload,
    BsTrash,
    BsKey,
} from "react-icons/bs";
import PropTypes from "prop-types";

function FileActionMenu({ downloadFiles, removeFiles, moveFiles, selectedFiles }) {
    if (selectedFiles.length === 0) return null;

    return (
        <div className="dropdown">
            <button
                className="btn btn-primary btn-sm dropdown-toggle"
                type="button"
                id="fileActionsDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                Actions
            </button>
            <ul className="dropdown-menu" aria-labelledby="fileActionsDropdown">
                <li>
                    <button className="dropdown-item" onClick={() => downloadFiles(selectedFiles)}>
                        <BsDownload className="me-2" /> Download
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => removeFiles(selectedFiles)}>
                        <BsTrash className="me-2" /> Delete
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => moveFiles(selectedFiles)}>
                        <BsArrowRightSquare className="me-2" /> Move
                    </button>
                </li>
            </ul>
        </div>
    );
}

function FileMenu({ file, download, display, move, remove, showDetail, permission }) {
    return (
        <div className="dropdown">
            <button
                type="button"
                className="btn p-0 border-0"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                <BsThreeDots />
            </button>
            <ul className="dropdown-menu">
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => showDetail(file.name, file.path)}
                    >
                        <BsInfoCircle className="me-2" /> Detail
                    </button>
                </li>
                {file.is_file && (
                    <li>
                        <button className="dropdown-item" onClick={() => display(file.path)}>
                            <BsEye className="me-2" /> View
                        </button>
                    </li>
                )}
                <li>
                    <button className="dropdown-item" onClick={() => move(file.path)}>
                        <BsPencil className="me-2" /> Rename
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => move([file])}>
                        <BsArrowRightSquare className="me-2" /> Move
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => {}}>
                        <BsFiles className="me-2" /> Copy
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => download([file])}>
                        <BsDownload className="me-2" /> Download
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => remove([file])}>
                        <BsTrash className="me-2" /> Delete
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => permission(true)}>
                        <BsKey className="me-2" /> Change Permissions
                    </button>
                </li>
            </ul>
        </div>
    );
}

export { FileActionMenu, FileMenu };

FileActionMenu.propTypes = {
    downloadFiles: PropTypes.func,
    removeFiles: PropTypes.func,
    moveFiles: PropTypes.func,
    selectedFiles: PropTypes.array,
};

FileMenu.propTypes = {
    file: PropTypes.object,
    download: PropTypes.func,
    display: PropTypes.func,
    move: PropTypes.func,
    remove: PropTypes.func,
    showDetail: PropTypes.func,
    permission: PropTypes.func,
};
