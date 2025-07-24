import React, { useEffect, useState } from "react";
import ModalWindow from "@components/Modal/Modal";
import { useShowHidden } from "@context/ShowHiddenContext";
import { useNotifications } from "@context/NotificationContext";
import useFileList from "@hooks/useFileList";
import SuggestInput from "@components/SuggestInput";
import { getParentPath, joinPaths, normalizePath } from "@utils/func";
import { setSymlink } from "@utils/symlink";
import PropTypes from "prop-types";

function NewSymlinkModal({ setShowModal, currentDir, targetItem, refresh }) {
    const { showHidden } = useShowHidden();
    const [visible, setVisible] = useState(true);
    const [linkName, setLinkName] = useState(currentDir.replace(/\/$/, "") + "/");
    const [linkPath, setLinkPath] = useState("");
    const [sourcePath, setSourcePath] = useState("");
    const [uploadDir, setUploadDir] = useState(currentDir);
    const [suggestDir, setSuggestDir] = useState(null);
    const { currentItems } = useFileList(uploadDir, showHidden);
    const { currentItems: suggestions } = useFileList(suggestDir, showHidden);
    const suggestionDirs = currentItems.filter((file) => file.is_dir);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (!visible && !isCreating) {
            setShowModal(false);
        }
    }, [visible, isCreating]);

    useEffect(() => {
        setUploadDir(currentDir);
        setLinkName(currentDir.replace(/\/$/, "") + "/");
        if (targetItem) {
            setSourcePath(targetItem.path);
        } else {
            setSuggestDir(currentDir);
        }
    }, [targetItem, currentDir]);

    useEffect(() => {
        if (sourcePath.endsWith("/")) {
            setSuggestDir(sourcePath);
        }
    }, [sourcePath]);

    useEffect(() => {
        if (linkName) {
            let fullpath = linkName;
            if (!linkName.startsWith("/")) {
                fullpath = normalizePath(joinPaths(currentDir, linkName));
                console.debug("linkName", linkName);
                console.debug("currentDir", currentDir);
                console.debug("fullpath", fullpath);
            }
            setLinkPath(fullpath);
            const parent = getParentPath(fullpath);
            if (uploadDir !== parent) setUploadDir(parent);
        }
    }, [linkName]);

    useEffect(() => {
        if (linkPath) {
            if (currentItems.some((item) => item.path === linkPath)) {
                setError("! already exists !");
            } else {
                setError(null);
            }
        }
    }, [currentItems, linkPath]);

    const handleCreate = () => {
        if (!linkPath || !sourcePath) {
            addNotification("Create Symlink", "All fields are required.", "error");
            return false;
        }
        if (error) {
            addNotification("Create Symlink", "alredy exists", "error");
            return false;
        }
        const createSymlink = async () => {
            setIsCreating(true);
            try {
                await setSymlink(sourcePath, linkPath);
            } catch (err) {
                console.error("setSymlink failed:", err);
                addNotification("Create Symlink", `${err.name} : ${err.message}`, "error");
            }
            refresh();
            setIsCreating(false);
            setVisible(false);
        };
        createSymlink();
        return true;
    };

    return (
        <div>
            <ModalWindow
                testid="newsym-modal"
                show={visible}
                onCancel={() => {
                    setLinkName("");
                    setLinkPath("");
                    setSourcePath("");
                    setUploadDir("");
                    setVisible(false);
                }}
                onConfirm={handleCreate}
                comfirmText="Create"
                title={<h5 className="modal-title">New Symlink</h5>}
            >
                <div>
                    <div className="mb-3">
                        <label htmlFor="symlink-linkname-input" className="form-label fw-bold">
                            Link Name
                        </label>
                        <SuggestInput
                            id="symlink-linkname-input"
                            value={linkName}
                            onChange={(value) => setLinkName(value)}
                            suggestions={suggestionDirs.map((item) => ({
                                name: item.path,
                                value: item.path,
                            }))}
                            placeholder="Enter link path"
                        />
                        {error && <div className="form-text alert-danger">{error}</div>}
                    </div>
                    <div className="mt-3">
                        <label htmlFor="symlink-target-input" className="form-label fw-bold">
                            Target
                        </label>
                        {targetItem ? (
                            <input
                                id="symlink-target-input"
                                type="text"
                                className="form-control"
                                value={sourcePath}
                                disabled
                            />
                        ) : (
                            <SuggestInput
                                id="symlink-target-input"
                                value={sourcePath}
                                onChange={(value) => setSourcePath(value)}
                                suggestions={suggestions.map((item) => ({
                                    name: item.path,
                                    value: item.path,
                                }))}
                            />
                        )}
                    </div>
                </div>
            </ModalWindow>
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
    setShowModal: PropTypes.func,
    currentDir: PropTypes.string,
    targetItem: PropTypes.object,
    refresh: PropTypes.func,
};
