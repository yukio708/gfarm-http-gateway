import React, { useRef, useState } from "react";
import { CollectPathsFromFiles, checkConflicts } from "../utils/func";
import ConflictResolutionModal from "./ConflictResolutionModal";
import { BsFileEarmarkArrowUp, BsFolder, BsFolderPlus, BsUpload } from "react-icons/bs";
import PropTypes from "prop-types";

function UploadMenu({ onUpload, onCreate, uploadDir, currentItems }) {
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const handleFileChange = (e) => {
        const targetfiles = Array.from(e.target.files);
        console.debug("targetfiles:", targetfiles);
        const collectedItems = CollectPathsFromFiles(targetfiles).map((file) => {
            return {
                ...file,
                destPath: uploadDir.replace(/\/$/, "") + "/" + file.path,
                uploadDir: uploadDir.replace(/\/$/, ""),
            };
        });
        if (collectedItems) {
            const res = checkConflicts(collectedItems, currentItems);

            console.debug("res", res);
            console.debug("collectedFiles", res.incomingItems);
            if (res.hasConflict) {
                setSelectedItems(res.incomingItems);
                setShowConfirm(true);
                e.target.value = null;
                return;
            }
            onUpload(res.incomingItems);
        }
        e.target.value = null;
    };

    const confirmUpload = (incomingItems) => {
        setShowConfirm(false);
        if (incomingItems.length > 0) {
            console.debug("incomingItems:", incomingItems);
            onUpload(incomingItems);
        }
    };

    return (
        <div>
            <div className="dropdown">
                <button
                    type="button"
                    className="btn btn-info btn-sm dropdown-toggle"
                    id="uploadDropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    <BsUpload className="me-2" />
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
                    incomingItems={selectedItems}
                    setIncomingItems={setSelectedItems}
                    existingNames={currentItems.map((item) => item.name)}
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
    currentItems: PropTypes.array,
};
