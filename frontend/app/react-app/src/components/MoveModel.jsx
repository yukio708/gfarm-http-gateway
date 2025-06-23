import React, { useEffect, useState } from "react";
import ModalWindow from "./Modal";
import ConflictResolutionModal from "./ConflictResolutionModal";
import useFileList from "../hooks/useFileList";
import { getParentPath, checkConflicts } from "../utils/func";
import { BsArrowBarUp, BsFolder } from "react-icons/bs";
import PropTypes from "prop-types";

function MoveModal({
    showModal,
    setShowModal,
    handleMove,
    currentDir,
    filesToMove,
    setFilesToMove,
}) {
    const [suggestDir, setSuggestDir] = useState("");
    const [targetPath, setTargetPath] = useState("");
    const { currentFiles, listGetError } = useFileList(suggestDir, suggestDir);
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState("Loading suggestions...");
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [pendingConfirm, setPendingConfirm] = useState(false);
    const suggestions = currentFiles.filter((file) => file.is_dir);

    useEffect(() => {
        if (listGetError) {
            setLoadingText(listGetError);
        } else {
            setLoadingText("Loading suggestions...");
            setLoading(false);
        }
    }, [currentFiles]);

    useEffect(() => {
        setTargetPath(currentDir);
        setSuggestDir(currentDir);
    }, []);

    useEffect(() => {
        if (targetPath.endsWith("/")) {
            setLoading(true);
            setSuggestDir(targetPath);
            setLoading(true);
        }
    }, [targetPath]);

    useEffect(() => {
        if (targetPath.endsWith("/")) {
            setLoading(true);
            setSuggestDir(targetPath);
            setLoading(true);
        }
    }, [targetPath]);

    useEffect(() => {
        if (!loading && pendingConfirm) {
            setPendingConfirm(false);
            const res = checkConflicts(filesToMove, currentFiles);
            console.debug("res", res);
            if (res.hasConflict) {
                setFilesToMove(res.incomingFiles);
                setShowConflictModal(true);
                return;
            }
            handleMove(filesToMove, targetPath);
        }
    }, [loading, pendingConfirm]);

    const handleChange = (e) => {
        const input = e.target.value;
        setTargetPath(input);
    };

    const handleSelectSuggestion = (path) => {
        console.debug("handleSelectSuggestion", path);
        if (path === "..") {
            const parent = getParentPath(suggestDir);
            setTargetPath(parent);
            setSuggestDir(parent);
        } else {
            setTargetPath(path);
            setSuggestDir(path);
        }
        setLoading(true);
    };

    const handleConfirm = () => {
        setShowModal(false);
        // if (targetPath === currentDir) return;
        if (suggestDir !== targetPath) {
            setSuggestDir(targetPath);
            setLoading(true);
        }

        const files = filesToMove.map((file) => {
            return {
                ...file,
                destPath: targetPath.replace(/\/$/, "") + "/" + file.name,
                uploadDir: targetPath.replace(/\/$/, ""),
            };
        });

        setFilesToMove(files);
        setPendingConfirm(true);
    };

    return (
        <div>
            {showModal && (
                <ModalWindow
                    onCancel={() => setShowModal(false)}
                    onConfirm={() => handleConfirm()}
                    comfirmText="Move"
                    size="large"
                    title={<h5 className="modal-title">Move File</h5>}
                    text={
                        <div>
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Destination path:</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={targetPath}
                                    onChange={handleChange}
                                    placeholder="/destination/path"
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label text-muted">Choose destination:</label>
                                <div className="form-text">{suggestDir}</div>
                                {loading ? (
                                    <div className="d-flex align-items-center gap-2">
                                        <div
                                            className="spinner-border spinner-border-sm text-secondary"
                                            role="status"
                                        />
                                        <span className="text-secondary">{loadingText}</span>
                                    </div>
                                ) : (
                                    currentFiles.length > 0 && (
                                        <ul className="list-group mt-2 shadow-sm">
                                            {suggestDir !== "/" && (
                                                <li
                                                    className="list-group-item list-group-item-action"
                                                    onClick={() => handleSelectSuggestion("..")}
                                                >
                                                    <BsArrowBarUp className="me-2" />
                                                    ..
                                                </li>
                                            )}
                                            {suggestions.map(
                                                (file, i) =>
                                                    file.is_dir && (
                                                        <li
                                                            key={i}
                                                            className="list-group-item list-group-item-action"
                                                            onClick={() =>
                                                                handleSelectSuggestion(file.path)
                                                            }
                                                        >
                                                            <BsFolder className="me-2" />
                                                            {file.name}
                                                        </li>
                                                    )
                                            )}
                                        </ul>
                                    )
                                )}
                            </div>
                        </div>
                    }
                />
            )}
            {showConflictModal && (
                <ConflictResolutionModal
                    incomingFiles={filesToMove}
                    setIncomingFiles={setFilesToMove}
                    existingNames={currentFiles.map((file) => file.name)}
                    onCancel={() => {
                        setShowConflictModal(false);
                    }}
                    onConfirm={(files) => handleMove(files, targetPath)}
                />
            )}
        </div>
    );
}

export default MoveModal;

MoveModal.propTypes = {
    showModal: PropTypes.bool,
    setShowModal: PropTypes.func,
    handleMove: PropTypes.func,
    currentDir: PropTypes.string,
    filesToMove: PropTypes.array,
    setFilesToMove: PropTypes.func,
};
