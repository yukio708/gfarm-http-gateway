import React, { useEffect, useState } from "react";
import ModalWindow from "./Modal";
import SuggestInput from "./SuggestInput";
import ConflictResolutionModal from "./ConflictResolutionModal";
import useFileList from "../hooks/useFileList";
import { useNotifications } from "../context/NotificationContext";
import { getParentPath, checkConflicts } from "../utils/func";
import moveItems from "../utils/move";
import { BsArrowBarUp, BsFolder } from "react-icons/bs";
import PropTypes from "prop-types";

function MoveModal({ currentDir, itemsToMove, setItemsToMove, refresh }) {
    const [showModal, setShowModal] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [suggestDir, setSuggestDir] = useState("");
    const [targetPath, setTargetPath] = useState("");
    const { currentItems, listGetError } = useFileList(suggestDir, suggestDir);
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState("Loading suggestions...");
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [pendingItems, setPendingItems] = useState([]);
    const suggestions = currentItems.filter((file) => file.is_dir);
    const [error, setError] = useState(null);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (itemsToMove.length > 0) {
            setShowModal(true);
        }
    }, [itemsToMove]);

    useEffect(() => {
        if (listGetError) {
            setLoadingText(listGetError);
        } else {
            setLoadingText("Loading suggestions...");
            setLoading(false);
        }
    }, [currentItems]);

    useEffect(() => {
        if (showModal) {
            setTargetPath(currentDir);
            setSuggestDir(currentDir);
        }
    }, [showModal]);

    useEffect(() => {
        if (targetPath.endsWith("/")) {
            setLoading(true);
            setSuggestDir(targetPath);
            setLoading(true);
        }
    }, [targetPath]);

    useEffect(() => {
        if (error) {
            console.debug("error", error);
            addNotification("Move", error, "error");
        }
    }, [error]);

    const handleMove = async (items) => {
        setIsMoving(true);
        await moveItems(items, setError);
        setIsMoving(false);
        setTargetPath("");
        refresh();
    };

    useEffect(() => {
        if (!loading && pendingItems.length > 0) {
            const res = checkConflicts(pendingItems, currentItems);
            console.debug("res", res);
            if (res.hasConflict) {
                setItemsToMove(res.incomingItems);
                setShowConflictModal(true);
                return;
            }
            handleMove(pendingItems);
        }
    }, [loading, pendingItems]);

    const handleChange = (input) => {
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
        if (targetPath === currentDir) {
            setTargetPath("");
            refresh();
            return;
        }
        if (suggestDir !== targetPath) {
            setSuggestDir(targetPath);
            setLoading(true);
        }

        const items = itemsToMove.map((item) => {
            return {
                ...item,
                destPath: targetPath.replace(/\/$/, "") + "/" + item.name,
                uploadDir: targetPath.replace(/\/$/, ""),
            };
        });

        setPendingItems(items);
    };

    const handleCancel = () => {
        if (showConflictModal) {
            setShowConflictModal(false);
        }
        setShowModal(false);
        setTargetPath("");
        setPendingItems([]);
        setItemsToMove([]);
    };

    return (
        <div>
            {showModal && (
                <ModalWindow
                    onCancel={() => handleCancel()}
                    onConfirm={() => handleConfirm()}
                    comfirmText="Move"
                    size="large"
                    title={
                        <div className="d-flex modal-title">
                            <h5 className="">
                                Move{" "}
                                {itemsToMove.length > 1
                                    ? itemsToMove.length + " items"
                                    : '"' + itemsToMove[0].name + '"'}
                            </h5>
                        </div>
                    }
                    text={
                        <div>
                            <div className="mb-3">
                                <label className="form-label fw-semibold">
                                    Enter Destination Path:
                                </label>
                                <SuggestInput
                                    value={targetPath}
                                    onChange={(val) => handleChange(val)}
                                    suggestions={suggestions.map((item) => item.path)}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">or select a directory below:</label>
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
                                        {currentItems.length > 0 &&
                                            suggestions.map(
                                                (item, i) =>
                                                    item.is_dir && (
                                                        <li
                                                            key={i}
                                                            className="list-group-item list-group-item-action"
                                                            onClick={() =>
                                                                handleSelectSuggestion(item.path)
                                                            }
                                                        >
                                                            <BsFolder className="me-2" />
                                                            {item.name}
                                                        </li>
                                                    )
                                            )}
                                    </ul>
                                )}
                            </div>
                        </div>
                    }
                />
            )}
            {showConflictModal && (
                <ConflictResolutionModal
                    incomingItems={itemsToMove}
                    setIncomingItems={setItemsToMove}
                    existingNames={currentItems.map((item) => item.name)}
                    onCancel={() => {
                        handleCancel();
                    }}
                    onConfirm={(items) => {
                        setShowConflictModal(false);
                        handleMove(items);
                    }}
                />
            )}
            {isMoving && (
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

export default MoveModal;

MoveModal.propTypes = {
    showModal: PropTypes.bool,
    setShowModal: PropTypes.func,
    currentDir: PropTypes.string,
    itemsToMove: PropTypes.array,
    setItemsToMove: PropTypes.func,
    refresh: PropTypes.func,
};
