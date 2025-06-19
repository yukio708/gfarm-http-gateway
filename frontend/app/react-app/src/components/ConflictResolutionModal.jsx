import React from "react";
import ModalWindow from "./Modal";
import { getParentPath, suggestNewName, formatFileSize, getUniqueConflicts } from "../utils/func";
import { BsFileEarmark, BsFolder } from "react-icons/bs";
import PropTypes from "prop-types";

function ConflictResolutionModal({
    onConfirm,
    onCancel,
    incomingFiles,
    setIncomingFiles,
    existingNames,
}) {
    const showFiles = getUniqueConflicts(incomingFiles);
    console.debug("showFiles", showFiles);

    const handleResolve = () => {
        const filtered = incomingFiles.filter((file) => {
            return !file.is_conflicted || file.keep_incoming;
        });

        const resolved = filtered.map((file) => {
            if (file.keep_current && file.keep_incoming) {
                if (file.parent_is_conflicted) {
                    const newDirpath = suggestNewName(
                        file.dirPath.replace(/\/$/, ""),
                        existingNames
                    );
                    return {
                        ...file,
                        path: newDirpath + "/" + file.name,
                        destPath: file.uploadDir + "/" + newDirpath + "/" + file.name,
                    };
                } else if (file.is_conflicted) {
                    const newName = suggestNewName(file.name, existingNames);
                    return {
                        ...file,
                        destPath: getParentPath(file.destPath) + newName,
                    };
                }
            }
            return file;
        });

        console.debug("handleResolve resolved", resolved);
        onConfirm(resolved);
    };

    const handleCheck = (event, file, key) => {
        setIncomingFiles((prev) =>
            prev.map((incomingFile) => {
                if (incomingFile.name === file.name) {
                    return {
                        ...incomingFile,
                        [key]: event.target.checked,
                    };
                }
                if (incomingFile.dirPath === file.dirPath) {
                    console.debug("incomingFile.dirPath === file.dirPath");
                    return {
                        ...incomingFile,
                        [key]: event.target.checked,
                    };
                }
                return incomingFile;
            })
        );
    };

    return (
        <ModalWindow
            onCancel={onCancel}
            onConfirm={handleResolve}
            title={<h5 className="modal-title">File Name Conflict</h5>}
            text={
                <div>
                    Choose which files to keep. <br />
                    Selecting both will rename the incoming file. <br />
                    <ul className="list-group mt-3 shadow-sm">
                        {showFiles.map(
                            (file, i) =>
                                file.is_conflicted && (
                                    <li key={i} className="list-group-item list-group-item-action">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <strong>{file.name}</strong>
                                            <span className="badge bg-warning text-dark">
                                                Conflict
                                            </span>
                                        </div>
                                        <div className="form-check mt-2">
                                            <input
                                                type="checkbox"
                                                className="form-check-input me-2"
                                                id={`current-${file.name}`}
                                                onChange={(e) =>
                                                    handleCheck(e, file, "keep_current")
                                                }
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor={`current-${file.name}`}
                                            >
                                                Keep current - {formatFileSize(file.size)},{" "}
                                                {file.mtime_str}
                                            </label>
                                        </div>
                                        <div className="form-check mt-2">
                                            <input
                                                type="checkbox"
                                                className="form-check-input me-2"
                                                id={`incoming-${file.name}`}
                                                onChange={(e) =>
                                                    handleCheck(e, file, "keep_incoming")
                                                }
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor={`incoming-${file.name}`}
                                            >
                                                Keep incoming - {formatFileSize(file.current_size)},{" "}
                                                {file.current_mtime_str}
                                            </label>
                                        </div>
                                    </li>
                                )
                        )}
                    </ul>
                </div>
            }
        />
    );
}

export default ConflictResolutionModal;

ConflictResolutionModal.propTypes = {
    onConfirm: PropTypes.func,
    onCancel: PropTypes.func,
    incomingFiles: PropTypes.array,
    setIncomingFiles: PropTypes.func,
    existingNames: PropTypes.array,
};
