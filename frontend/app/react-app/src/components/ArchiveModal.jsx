import React, { useEffect, useState } from "react";
import ModalWindow from "./Modal";
import SuggestInput from "./SuggestInput";
import MiniFileListView from "./MiniFileListView";
import useFileList from "../hooks/useFileList";
import { BsArrowBarUp, BsFolder } from "react-icons/bs";
import { getParentPath } from "../utils/func";
import gfptar from "../utils/archive";
import PropTypes from "prop-types";

function ArchiveModal({
    showModal,
    setShowModal,
    currentDir,
    selectedItems,
    lastSelectedItem,
    currentDirItems,
    setTasks,
    refresh,
}) {
    const [activeTab, setActiveTab] = useState("compress");
    const [suggestDir, setSuggestDir] = useState("");
    const [destDir, setDestDir] = useState("");
    const { currentItems, listGetError } = useFileList(suggestDir, suggestDir);
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState("Loading suggestions...");

    const [targetDir, setTargetDir] = useState("");
    const [targetItems, setTargetItems] = useState([]);

    const [options, setOptions] = useState([]);
    const [listStatus, setListStatus] = useState([]);
    const [indirList, setIndirList] = useState([]);
    const [selectedFromList, setSelectedFromList] = useState([]);

    const suggestions = currentItems.filter((file) => file.is_dir);

    useEffect(() => {
        setTargetItems(selectedItems);
    }, [selectedItems]);

    useEffect(() => {
        if (listGetError) {
            setLoadingText(listGetError);
        } else {
            setLoadingText("Loading suggestions...");
            setLoading(false);
        }
    }, [currentItems]);

    useEffect(() => {
        setTargetDir(currentDir);
        setSuggestDir(currentDir);
    }, [showModal]);

    useEffect(() => {
        if (targetDir.endsWith("/")) {
            setLoading(true);
            setSuggestDir(targetDir);
            setLoading(true);
        }
    }, [targetDir]);

    useEffect(() => {
        if (listStatus.length > 0) {
            if (listStatus.message) {
                setIndirList((prev) => [...prev, listStatus.message]);
            }
        }
    }, [listStatus]);

    const handleChange = (input) => {
        setDestDir(input);
    };

    const handleSelectSuggestion = (path) => {
        console.debug("handleSelectSuggestion", path);
        if (path === "..") {
            const parent = getParentPath(suggestDir);
            setDestDir(parent);
            setSuggestDir(parent);
        } else {
            setDestDir(path);
            setSuggestDir(path);
        }
        setLoading(true);
    };

    const handleGfptar = async (command) => {
        await gfptar(
            command,
            command === "compress" ? targetDir : lastSelectedItem.path,
            command === "compress" ? targetItems : selectedFromList,
            destDir,
            options,
            command === "list" ? setListStatus : setTasks
        );
        // refresh();
        setListStatus([]);
    };

    const handleConfirm = () => {
        setShowModal(false);
        handleGfptar(activeTab);
    };

    const handleCancel = () => {
        setTargetDir("");
        setDestDir("");
        setTargetItems([]);
        setListStatus([]);
        setShowModal(false);
    };

    return (
        <div>
            {showModal && (
                <ModalWindow
                    onCancel={() => handleCancel()}
                    onConfirm={() => handleConfirm()}
                    comfirmText="Run"
                    size="large"
                    title={<h5 className="modal-title">Gfptar</h5>}
                    text={
                        <div>
                            <div className="mb-3">
                                <ul className="nav nav-tabs">
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === "compress" ? "active" : ""}`}
                                            onClick={() => setActiveTab("compress")}
                                        >
                                            Compress
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === "extract" ? "active" : ""}`}
                                            onClick={() => setActiveTab("extract")}
                                        >
                                            Extract
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold">Export Directory</label>
                                <SuggestInput
                                    value={destDir}
                                    onChange={(val) => handleChange(val)}
                                    suggestions={suggestions.map((item) => item.path)}
                                />
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
                                    currentItems.length > 0 && (
                                        <div
                                            className="mb-3 overflow-auto"
                                            style={{
                                                minHeight: "100px",
                                                maxHeight: "100px",
                                            }}
                                        >
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
                                                {suggestions.map((item, i) => (
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
                                                ))}
                                            </ul>
                                        </div>
                                    )
                                )}
                            </div>
                            {activeTab === "compress" && (
                                <div>
                                    <div className="mb-3 d-flex">
                                        <label className="form-label fw-bold me-4">
                                            Target Directory
                                        </label>
                                        <div className="form-text">{targetDir}</div>
                                    </div>

                                    <label className="form-label fw-bold">Target Items</label>
                                    <div
                                        className="mb-3 overflow-auto"
                                        style={{
                                            minHeight: "calc(30vh - 100px)",
                                            maxHeight: "calc(30vh - 100px)",
                                        }}
                                    >
                                        <MiniFileListView
                                            parentName="GfptarModal"
                                            currentItems={currentDirItems}
                                            selectedItems={targetItems}
                                            setSelectedItems={setTargetItems}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === "extract" && (
                                <div>
                                    <div className="mb-3 d-flex">
                                        <label className="form-label fw-bold me-4">
                                            Target File
                                        </label>
                                        <div className="form-text">{lastSelectedItem.name}</div>
                                    </div>

                                    <div className="mb-2">
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={async () => {
                                                await handleGfptar("list");
                                            }}
                                        >
                                            List Contents
                                        </button>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Archive Contents
                                        </label>
                                        {indirList.length > 0 && (
                                            <div
                                                className="mb-3 overflow-auto"
                                                style={{
                                                    minHeight: "calc(30vh - 100px)",
                                                    maxHeight: "calc(30vh - 100px)",
                                                }}
                                            >
                                                <ul className="list-group small">
                                                    {indirList.map((line, i) => {
                                                        const isSelected =
                                                            selectedFromList.includes(line);
                                                        return (
                                                            <li
                                                                key={i}
                                                                className={`list-group-item list-group-item-action ${isSelected ? "active" : ""}`}
                                                                onClick={() => {
                                                                    setSelectedFromList((prev) =>
                                                                        isSelected
                                                                            ? prev.filter(
                                                                                  (item) =>
                                                                                      item !== line
                                                                              )
                                                                            : [...prev, line]
                                                                    );
                                                                }}
                                                                style={{ cursor: "pointer" }}
                                                            >
                                                                {line}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="mb-3">
                                <label className="form-label fw-bold">Options</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={options}
                                    onChange={(e) => setOptions(e.target.value)}
                                    placeholder="e.g. --jobs=4"
                                />
                            </div>
                        </div>
                    }
                />
            )}
        </div>
    );
}

export default ArchiveModal;

ArchiveModal.propTypes = {
    showModal: PropTypes.bool,
    setShowModal: PropTypes.func,
    handleMove: PropTypes.func,
    currentDir: PropTypes.string,
    selectedItems: PropTypes.array,
    lastSelectedItem: PropTypes.object,
    currentDirItems: PropTypes.array,
    setTasks: PropTypes.func,
    refresh: PropTypes.func,
};
