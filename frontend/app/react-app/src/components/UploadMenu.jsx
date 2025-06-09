import React, { useRef } from "react";
import { getDeepestDirs, CollectPathsFromFiles } from "../utils/func";
import PropTypes from "prop-types";

function UploadMenu({ onUpload, createDirectory }) {
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const data = CollectPathsFromFiles(files);
        if (data.files) {
            console.log("Collected files:", data.files);
            onUpload(data.files, getDeepestDirs(data.dirSet));
        }
    };

    return (
        <div className="dropdown">
            <button
                type="button"
                className="btn btn-secondary btn-sm dropdown-toggle"
                id="uploadDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                Upload
            </button>
            <ul className="dropdown-menu" aria-labelledby="uploadDropdown">
                <li>
                    <h1 className="dropdown-header">Upload</h1>
                </li>
                <li>
                    <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Upload Files
                    </button>
                </li>
                <li>
                    <button
                        type="button"
                        className="dropdown-item"
                        onClick={() => folderInputRef.current?.click()}
                    >
                        Upload Folder
                    </button>
                </li>
                <li>
                    <hr className="dropdown-divider" />
                </li>
                <li>
                    <h1 className="dropdown-header">Create new</h1>
                </li>
                <li>
                    <button type="button" className="dropdown-item" onClick={createDirectory}>
                        New Folder
                    </button>
                </li>
            </ul>

            <input
                type="file"
                multiple
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            <input
                type="file"
                multiple
                webkitdirectory="true"
                style={{ display: "none" }}
                ref={folderInputRef}
                onChange={handleFileChange}
            />
        </div>
    );
}

export default UploadMenu;

UploadMenu.propTypes = {
    onUpload: PropTypes.func,
    createDirectory: PropTypes.func,
};
