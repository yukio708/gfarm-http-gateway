import React, { useEffect, useState } from "react";
import ModalWindow from "./Modal";
import useFileList from "../hooks/useFileList";
import { getParentPath } from "../utils/func";
import { BsArrowBarUp, BsFolder } from "react-icons/bs";
import PropTypes from "prop-types";

function MoveModal({ showModal, setShowModal, onConfirm, targetPath, setTargetPath, currentDir }) {
    const [suggestDir, setSuggestDir] = useState("");
    const { files, listGetError } = useFileList(suggestDir, suggestDir);
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState("Loading suggestions...");
    const suggestions = files.filter((file) => !file.is_file);

    useEffect(() => {
        if (listGetError) {
            setLoadingText(listGetError);
        } else {
            setLoadingText("Loading suggestions...");
            setLoading(false);
        }
    }, [files]);

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
        setLoading(false);
    }, [files]);

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

    return (
        showModal && (
            <ModalWindow
                onCancel={() => setShowModal(false)}
                onConfirm={onConfirm}
                comfirmText="Move"
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
                                files.length > 0 && (
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
                                                !file.is_file && (
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
        )
    );
}

export default MoveModal;

MoveModal.propTypes = {
    showModal: PropTypes.bool,
    setShowModal: PropTypes.func,
    onConfirm: PropTypes.func,
    targetPath: PropTypes.string,
    setTargetPath: PropTypes.string,
    currentDir: PropTypes.string,
};
