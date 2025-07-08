import React, { useEffect, useState } from "react";
import ModalWindow from "./Modal";
import { useNotifications } from "../context/NotificationContext";
import useFileList from "../hooks/useFileList";
import SuggestInput from "./SuggestInput";
import { checkConflicts, getParentPath } from "../utils/func";
import { setSymlink } from "../utils/symlink";
import PropTypes from "prop-types";

function NewSymlinkModal({ showModal, setShowModal, currentDir, targetItem, refresh }) {
    const [linkPath, setLinkPath] = useState("");
    const [sourcePath, setSourcePath] = useState("");
    const [uploadDir, setUploadDir] = useState(currentDir);
    const [suggestDir, setSuggestDir] = useState(null);
    const { currentItems } = useFileList(uploadDir, "");
    const { currentItems: suggestions } = useFileList(suggestDir, "");
    const suggestionDirs = currentItems.filter((file) => file.is_dir);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);
    const { addNotification } = useNotifications();

    useEffect(() => {
        setUploadDir(currentDir);
        setLinkPath(currentDir.replace(/\/$/, "") + "/");
        if (targetItem) {
            setSourcePath(targetItem.path);
        } else {
            setSuggestDir(currentDir);
        }
    }, [showModal, targetItem, currentDir]);

    useEffect(() => {
        if (sourcePath.endsWith("/")) {
            setSuggestDir(sourcePath);
        }
    }, [sourcePath]);

    useEffect(() => {
        if (currentItems.some((item) => item.path === linkPath)) {
            setError("! already exists !");
        } else {
            setError(null);
        }
        if (linkPath) {
            const parent = getParentPath(linkPath);
            if (uploadDir !== parent) setUploadDir(parent);
        }
    }, [linkPath]);

    const handleCreate = async () => {
        if (!linkPath || !sourcePath) {
            addNotification("Create Symlink", "All fields are required.", "error");
            return false;
        }
        const res = checkConflicts([{ name: linkPath }], currentItems);
        if (res.hasConflict) {
            addNotification("Create Symlink", "The same name exists alredy", "error");
            return false;
        }
        setIsCreating(true);
        const error = await setSymlink(sourcePath, linkPath);
        if (error) addNotification("Create Symlink", error, "error");
        refresh();
        setIsCreating(false);
        return true;
    };

    return (
        <div>
            {showModal && (
                <ModalWindow
                    onCancel={() => {
                        setShowModal(false);
                        setLinkPath("");
                        setSourcePath("");
                        setUploadDir("");
                    }}
                    onConfirm={handleCreate}
                    comfirmText="Create"
                    title={<h5 className="modal-title">New Symlink</h5>}
                    text={
                        <div>
                            <div className="mb-3">
                                <label className="form-label fw-bold">Link Path</label>
                                <SuggestInput
                                    value={linkPath}
                                    onChange={(value) => setLinkPath(value)}
                                    suggestions={suggestionDirs.map((item) => item.path)}
                                    placeholder="Enter link path"
                                />
                                {error && <div className="form-text alert-danger">{error}</div>}
                            </div>
                            {targetItem ? (
                                <div className="mt-3">
                                    <label className="form-label fw-bold">Source Path</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={sourcePath}
                                        disabled
                                    />
                                </div>
                            ) : (
                                <div className="mt-3">
                                    <label className="form-label fw-bold">Source Path</label>
                                    <SuggestInput
                                        value={sourcePath}
                                        onChange={(value) => setSourcePath(value)}
                                        suggestions={suggestions.map((item) => item.path)}
                                    />
                                </div>
                            )}
                        </div>
                    }
                />
            )}
            {isCreating && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50"
                    style={{ zIndex: 1050 }}
                >
                    <div className="spinner-border text-primary" role="status"></div>
                    <div>Creating symlink... please wait</div>
                </div>
            )}
        </div>
    );
}

export default NewSymlinkModal;

NewSymlinkModal.propTypes = {
    showModal: PropTypes.bool,
    setShowModal: PropTypes.func,
    currentDir: PropTypes.string,
    targetItem: PropTypes.object,
    refresh: PropTypes.func,
};
