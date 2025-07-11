import React from "react";
import ModalWindow from "./Modal";
import {
    getParentPath,
    suggestNewName,
    formatFileSize,
    getTimeStr,
    getUniqueConflicts,
} from "../utils/func";
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
                        destPath: getParentPath(item.destPath).replace(/\/$/, "") + "/" + newName,
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
                if (incomingItem.name === item.name || incomingItem.dirPath === item.dirPath) {
                    return {
                        ...incomingItem,
                        [key]: event.target.checked,
                    };
                }
                return incomingItem;
            })
        );
    };

    const handleSelectAll = (event, key) => {
        setIncomingItems((prev) =>
            prev.map((incomingItem) => {
                if (incomingItem.parent_is_conflicted || incomingItem.is_conflicted) {
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
            body={
                <div data-testid="conflict-modal">
                    <div className="mb-2">
                        Choose which files to keep. <br />
                        Selecting both will rename the incoming file.
                    </div>

                    {/* Select all checkboxes */}
                    <div className="mb-3">
                        <div className="row">
                            <div className="col">
                                <input
                                    type="checkbox"
                                    className="form-check-input me-2"
                                    id="select-all-current"
                                    onChange={(e) => handleSelectAll(e, "keep_current")}
                                    checked={
                                        showItems.filter(
                                            (item) =>
                                                item.is_conflicted || item.parent_is_conflicted
                                        ).length ===
                                        showItems.filter((item) => item.keep_current).length
                                    }
                                />
                                <label className="form-check-label" htmlFor="select-all-current">
                                    Select all current
                                </label>
                            </div>
                            <div className="col">
                                <input
                                    type="checkbox"
                                    className="form-check-input me-2"
                                    id="select-all-incoming"
                                    onChange={(e) => handleSelectAll(e, "keep_incoming")}
                                    checked={
                                        showItems.filter(
                                            (item) =>
                                                item.is_conflicted || item.parent_is_conflicted
                                        ).length ===
                                        showItems.filter((item) => item.keep_incoming).length
                                    }
                                />
                                <label className="form-check-label" htmlFor="select-all-incoming">
                                    Select all incoming
                                </label>
                            </div>
                        </div>
                    </div>

                    <ul className="list-group mt-2 shadow-sm">
                        {showItems.map(
                            (item, i) =>
                                item.is_conflicted && (
                                    <li key={i} className="list-group-item list-group-item-action">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div>
                                                {item.is_dir ? (
                                                    <BsFolder className="me-2" />
                                                ) : (
                                                    <BsFileEarmark className="me-2" />
                                                )}
                                                <strong>{item.name}</strong>
                                            </div>
                                            <span className="badge bg-warning text-dark">
                                                Conflict
                                            </span>
                                        </div>

                                        <div className="row">
                                            <div className="col">
                                                <div className="form-check">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input me-2"
                                                        id={`current-${item.name}`}
                                                        onChange={(e) =>
                                                            handleCheck(e, item, "keep_current")
                                                        }
                                                        checked={item.keep_current}
                                                    />
                                                    <label
                                                        className="form-check-label"
                                                        htmlFor={`current-${item.name}`}
                                                    >
                                                        Keep current
                                                    </label>
                                                    <div className="small">
                                                        Size:{" "}
                                                        {formatFileSize(item.size, item.is_dir)}
                                                    </div>
                                                    <div className="small">
                                                        Modified: {getTimeStr(item.mtime)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col">
                                                <div className="form-check">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input me-2"
                                                        id={`incoming-${item.name}`}
                                                        onChange={(e) =>
                                                            handleCheck(e, item, "keep_incoming")
                                                        }
                                                        checked={item.keep_incoming}
                                                    />
                                                    <label
                                                        className="form-check-label"
                                                        htmlFor={`incoming-${item.name}`}
                                                    >
                                                        Keep incoming
                                                    </label>
                                                    <div className="small">
                                                        Size:{" "}
                                                        {formatFileSize(
                                                            item.current_size,
                                                            item.is_dir
                                                        )}
                                                    </div>
                                                    <div className="small">
                                                        Modified: {getTimeStr(item.current_mtime)}
                                                    </div>
                                                </div>
                                            </div>
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
