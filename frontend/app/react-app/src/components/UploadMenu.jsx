import React, { useRef, useState } from "react";
import { CollectPathsFromFiles } from "../utils/func";
import ModalWindow from "./Modal";
import { BsFileEarmarkArrowUp, BsFolder, BsFolderPlus } from "react-icons/bs";
import PropTypes from "prop-types";

function UploadMenu({ onUpload, onCreate, files }) {
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [modalText, setModalText] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState(null);

    const handleFileChange = (e) => {
        const targetfiles = Array.from(e.target.files);
        const data = CollectPathsFromFiles(targetfiles);
        if (data.files) {
            console.debug("Collected files:", data.files);
            const duplicates = files.filter((file) =>
                data.files.some((selectedfile) => {
                    if (file.is_file && file.name === selectedfile.name) return true;
                    else if (file.name === selectedfile.dirPath.split("/", 2)[0]) {
                        return true;
                    }
                    return false;
                })
            );

            if (duplicates.length > 0) {
                setSelectedFiles(data.files);
                setModalText(
                    <ul className="modal-body">
                        <p>The following files/directories already exist:</p>
                        {duplicates.map((file, idx) => (
                            <li key={idx}>
                                <strong>{file.name}</strong>
                            </li>
                        ))}
                    </ul>
                );
                setShowConfirm(true);
                return;
            }
            onUpload(data.files);
        }
        e.target.value = null;
    };

    const confirmUpload = () => {
        setShowConfirm(false);
        if (selectedFiles.length > 0) {
            console.debug("selectedFiles:", selectedFiles);
            onUpload(selectedFiles);
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
                <ModalWindow
                    onCancel={() => {
                        setShowConfirm(false);
                    }}
                    onConfirm={confirmUpload}
                    title={
                        <p className="modal-title">
                            Are you sure you want to overwrite the following files?
                        </p>
                    }
                    text={modalText}
                />
            )}
        </div>
    );
}

export default UploadMenu;

UploadMenu.propTypes = {
    onUpload: PropTypes.func,
    onCreate: PropTypes.func,
    files: PropTypes.array,
};
