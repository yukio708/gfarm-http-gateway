import React, { useEffect, useState } from "react";
import ModalWindow from "./Modal";
import { useNotifications } from "../context/NotificationContext";
import useFileList from "../hooks/useFileList";
import SuggestInput from "./SuggestInput";
import { checkConflicts } from "../utils/func";
import { setSymlink } from "../utils/symlink";
import PropTypes from "prop-types";

function NewSymlinkModal({ showModal, setShowModal, currentDir, targetItem, refresh }) {
    const [linkName, setLinkName] = useState("");
    const [sourcePath, setSourcePath] = useState("");
    const [uploadDir, setUploadDir] = useState(currentDir);
    const [suggestDir, setSuggestDir] = useState("");
    const { currentItems: suggestions } = useFileList(suggestDir, suggestDir);
    const suggestionDirs = suggestions.filter((file) => file.is_dir);
    const [isCreating, setIsCreating] = useState(false);
    const [canCreate, setCanCreate] = useState(false);
    const { addNotification } = useNotifications();

    useEffect(() => {
        setSuggestDir(currentDir);
        if (targetItem) {
            setUploadDir(currentDir);
            setSourcePath(targetItem.path);
            setLinkName(targetItem.path.split("/").pop());
        } else {
            setUploadDir(currentDir);
            setLinkName("");
        }
    }, [showModal, targetItem, currentDir]);

    useEffect(() => {
        if (uploadDir.endsWith("/")) {
            setSuggestDir(uploadDir);
        }
    }, [uploadDir]);

    useEffect(() => {
        if (linkName && sourcePath && uploadDir) {
            setCanCreate(true);
        }
        setCanCreate(false);
    }, [linkName, sourcePath, uploadDir]);

    const handleCreate = async () => {
        if (!linkName || !sourcePath || !uploadDir) {
            addNotification("Create Symlink", "All fields are required.", "error");
            return false;
        }
        const res = checkConflicts([{ name: linkName }], suggestions);
        if (res.hasConflict) {
            addNotification("Create Symlink", "The same name exists alredy", "error");
            return false;
        }
        const symlinkPath = uploadDir.replace(/\/$/, "") + "/" + linkName;
        setIsCreating(true);
        const error = await setSymlink(sourcePath, symlinkPath);
        if (error) addNotification("Create Symlink", error, "error");
        refresh();
        return true;
    };

    return (
        <div>
            {showModal && (
                <ModalWindow
                    onCancel={() => {
                        setShowModal(false);
                        setLinkName("");
                        setSourcePath("");
                        setUploadDir("");
                    }}
                    onConfirm={handleCreate}
                    comfirmText="Create"
                    confirmDisabled={canCreate}
                    title={<h5 className="modal-title">New Symlink</h5>}
                    text={
                        <div>
                            <div className="mb-3">
                                <label className="form-label fw-bold">Link Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={linkName}
                                    onChange={(e) => setLinkName(e.target.value)}
                                    placeholder="my_symlink"
                                />
                            </div>
                            {targetItem ? (
                                <div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Create In Directory
                                        </label>
                                        <SuggestInput
                                            value={uploadDir}
                                            onChange={(value) => setUploadDir(value)}
                                            suggestions={suggestionDirs.map((item) => item.path)}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Target Path</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={sourcePath}
                                            disabled
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Create In Directory
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={uploadDir}
                                            disabled
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Target Path</label>
                                        <SuggestInput
                                            value={sourcePath}
                                            onChange={(value) => setSourcePath(value)}
                                            suggestions={suggestions.map((item) => item.path)}
                                        />
                                    </div>
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
                    <div>Moving files... please wait</div>
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
