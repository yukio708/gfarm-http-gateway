import React from "react";
import ModalWindow from "./Modal";
import { getParentPath, suggestNewName, formatFileSize, getUniqueConflicts } from "../utils/func";
import { BsFileEarmark, BsFolder } from "react-icons/bs";
import PropTypes from "prop-types";

function ConflictResolutionModal({
    onConfirm,
    onCancel,
    incomingItems,
    setIncomingItems,
    existingNames,
}) {
    const showItems = getUniqueConflicts(incomingItems);
    console.debug("showItems", showItems);

    const handleResolve = () => {
        const filtered = incomingItems.filter((item) => {
            return !item.is_conflicted || item.keep_incoming;
        });

        const resolved = filtered.map((item) => {
            if (item.keep_current && item.keep_incoming) {
                if (item.parent_is_conflicted) {
                    const newDirpath = suggestNewName(
                        item.dirPath.replace(/\/$/, ""),
                        existingNames
                    );
                    return {
                        ...item,
                        path: newDirpath + "/" + item.name,
                        destPath: item.uploadDir + "/" + newDirpath + "/" + item.name,
                    };
                } else if (item.is_conflicted) {
                    const newName = suggestNewName(item.name, existingNames);
                    return {
                        ...item,
                        destPath: getParentPath(item.destPath) + newName,
                    };
                }
            }
            return item;
        });

        console.debug("handleResolve resolved", resolved);
        onConfirm(resolved);
    };

    const handleCheck = (event, item, key) => {
        setIncomingItems((prev) =>
            prev.map((incomingItem) => {
                if (incomingItem.name === item.name) {
                    return {
                        ...incomingItem,
                        [key]: event.target.checked,
                    };
                }
                if (incomingItem.dirPath === item.dirPath) {
                    console.debug("incomingFile.dirPath === file.dirPath");
                    return {
                        ...incomingItem,
                        [key]: event.target.checked,
                    };
                }
                return incomingItem;
            })
        );
    };

    return (
        <ModalWindow
            onCancel={onCancel}
            onConfirm={handleResolve}
            size="large"
            title={<h5 className="modal-title">File Name Conflict</h5>}
            text={
                <div>
                    Choose which files to keep. <br />
                    Selecting both will rename the incoming file. <br />
                    <ul className="list-group mt-3 shadow-sm">
                        {showItems.map(
                            (item, i) =>
                                item.is_conflicted && (
                                    <li key={i} className="list-group-item list-group-item-action">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <strong>{item.name}</strong>
                                            <span className="badge bg-warning text-dark">
                                                Conflict
                                            </span>
                                        </div>
                                        <div className="form-check mt-2">
                                            <input
                                                type="checkbox"
                                                className="form-check-input me-2"
                                                id={`current-${item.name}`}
                                                onChange={(e) =>
                                                    handleCheck(e, item, "keep_current")
                                                }
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor={`current-${item.name}`}
                                            >
                                                Keep current -{" "}
                                                {formatFileSize(item.size, item.is_dir)},{" "}
                                                {item.mtime_str}
                                            </label>
                                        </div>
                                        <div className="form-check mt-2">
                                            <input
                                                type="checkbox"
                                                className="form-check-input me-2"
                                                id={`incoming-${item.name}`}
                                                onChange={(e) =>
                                                    handleCheck(e, item, "keep_incoming")
                                                }
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor={`incoming-${item.name}`}
                                            >
                                                Keep incoming -{" "}
                                                {formatFileSize(item.current_size, item.is_dir)},{" "}
                                                {item.current_mtime_str}
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
    incomingItems: PropTypes.array,
    setIncomingItems: PropTypes.func,
    existingNames: PropTypes.array,
};
