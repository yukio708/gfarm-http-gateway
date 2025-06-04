import React from "react";
import PropTypes from "prop-types";

function FileActionsMenu({ downloadFiles, deleteFile, moveFiles, selectedFiles }) {
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
                        Download
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => deleteFile(selectedFiles)}>
                        Delete
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => moveFiles(selectedFiles)}>
                        Move
                    </button>
                </li>
            </ul>
        </div>
    );
}

export default FileActionsMenu;

FileActionsMenu.propTypes = {
    downloadFiles: PropTypes.func,
    deleteFile: PropTypes.func,
    moveFiles: PropTypes.func,
    selectedFiles: PropTypes.array,
};
