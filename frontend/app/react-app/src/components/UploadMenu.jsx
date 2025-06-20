import React, { useRef, useState } from "react";
import { CollectPathsFromFiles, checkConflicts } from "../utils/func";
import ConflictResolutionModal from "./ConflictResolutionModal";
import { BsFileEarmarkArrowUp, BsFolder, BsFolderPlus } from "react-icons/bs";
import PropTypes from "prop-types";

function UploadMenu({ onUpload, onCreate, uploadDir, currentFiles }) {
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);

    const handleFileChange = (e) => {
        const targetfiles = Array.from(e.target.files);
        console.debug("targetfiles:", targetfiles);
        const collectedFiles = CollectPathsFromFiles(targetfiles).map((file) => {
            return {
                ...file,
                destPath: uploadDir.replace(/\/$/, "") + "/" + file.path,
                uploadDir: uploadDir.replace(/\/$/, ""),
            };
        });
        if (collectedFiles) {
            const res = checkConflicts(collectedFiles, currentFiles);

            console.debug("res", res);
            console.debug("collectedFiles", res.incomingFiles);
            if (res.hasConflict) {
                setSelectedFiles(res.incomingFiles);
                setShowConfirm(true);
                e.target.value = null;
                return;
            }
            onUpload(res.incomingFiles);
        }
        e.target.value = null;
    };

    const confirmUpload = (incomingFiles) => {
        setShowConfirm(false);
        if (incomingFiles.length > 0) {
            console.debug("incomingFiles:", incomingFiles);
            onUpload(incomingFiles);
        }
    };

    return (
        <div>
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
                            <BsFileEarmarkArrowUp className="me-2" />
                            File upload
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => folderInputRef.current?.click()}
                        >
                            <BsFolder className="me-2" />
                            Folder upload
                        </button>
                    </li>
                    <li>
                        <hr className="dropdown-divider" />
                    </li>
                    <li>
                        <h1 className="dropdown-header">Create new</h1>
                    </li>
                    <li>
                        <button type="button" className="dropdown-item" onClick={onCreate}>
                            <BsFolderPlus className="me-2" />
                            New folder
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
            {showConfirm && (
                <ConflictResolutionModal
                    incomingFiles={selectedFiles}
                    setIncomingFiles={setSelectedFiles}
                    existingNames={currentFiles.map((file) => file.name)}
                    onCancel={() => {
                        setShowConfirm(false);
                    }}
                    onConfirm={confirmUpload}
                />
            )}
        </div>
    );
}

export default UploadMenu;

UploadMenu.propTypes = {
    onUpload: PropTypes.func,
    onCreate: PropTypes.func,
    uploadDir: PropTypes.string,
    currentFiles: PropTypes.array,
};
