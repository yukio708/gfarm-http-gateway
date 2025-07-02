import React, { useEffect, useState } from "react";
import ModalWindow from "./Modal";
import SuggestInput from "./SuggestInput";
import MiniFileListView from "./MiniFileListView";
import useFileList from "../hooks/useFileList";
import { useNotifications } from "../context/NotificationContext";
import gfptar from "../utils/archive";
import PropTypes from "prop-types";

function ArchiveModal({
    showModal,
    setShowModal,
    currentDir,
    selectedItems,
    lastSelectedItem,
    currentDirItems,
    setSelectedItems,
    setTasks,
    refresh,
}) {
    const [activeTab, setActiveTab] = useState("compress");
    const [compressMode, setCompressMode] = useState("create");
    const [suggestDir, setSuggestDir] = useState("");
    const [destDir, setDestDir] = useState("");
    const { currentItems } = useFileList(suggestDir, suggestDir);
    const [error, setError] = useState(null);
    const [targetDir, setTargetDir] = useState([]);
    const [targetItems, setTargetItems] = useState([]);
    const [options, setOptions] = useState("");
    const [listStatus, setListStatus] = useState([]);
    const [indirList, setIndirList] = useState([]);
    const [selectedFromList, setSelectedFromList] = useState([]);
    const suggestions = currentItems.filter((file) => file.is_dir);
    const { addNotification } = useNotifications();

    useEffect(() => {
        setTargetItems(selectedItems);
    }, [selectedItems]);

    useEffect(() => {
        setTargetItems(selectedItems);
        setTargetDir(currentDir);
        setDestDir(currentDir.replace(/\/$/, "") + "/");
    }, [showModal]);

    useEffect(() => {
        console.log("destDir", destDir);
        if (
            (compressMode === "create" || activeTab === "extract") &&
            currentItems.some((item) => item.path === destDir)
        ) {
            setError("! already exists !");
        } else {
            setError(null);
        }
        if (destDir.endsWith("/")) {
            setSuggestDir(destDir);
        }
    }, [destDir]);

    useEffect(() => {
        if (listStatus.length > 0) {
            if (listStatus[0].status === "error") {
                addNotification(listStatus[0].message);
            } else if (listStatus[0].message) {
                const [file_type, path] = listStatus[0].message.trim().split(" ", 2);
                setIndirList((prev) => [
                    ...prev,
                    {
                        is_dir: file_type === "D",
                        is_file: file_type === "F",
                        is_sym: file_type === "S",
                        path,
                        name: path,
                    },
                ]);
            }
        }
    }, [listStatus]);

    const handleChange = (input) => {
        setDestDir(input);
    };

    const handleGfptar = async (command) => {
        await gfptar(
            command,
            activeTab === "compress" ? targetDir : lastSelectedItem.path,
            activeTab === "compress"
                ? targetItems.map((item) => item.name)
                : selectedFromList.map((item) => item.path),
            destDir,
            options.split(" ").filter(Boolean),
            command === "list" ? setListStatus : setTasks,
            refresh
        );
        setListStatus([]);
        if (command !== "list") {
            setIndirList([]);
            setSelectedItems([]);
        }
    };

    const handleConfirm = () => {
        setShowModal(false);

        handleGfptar(activeTab === "compress" ? compressMode : activeTab);
    };

    const handleCancel = () => {
        setTargetDir("");
        setDestDir("");
        setTargetItems([]);
        setListStatus([]);
        setIndirList([]);
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
                                {error && <div className="form-text alert-danger">{error}</div>}
                            </div>
                            {activeTab === "compress" && (
                                <div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold me-2">Operation</label>
                                        <div className="form-check form-check-inline">
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                name="compressMode"
                                                id="mode-create"
                                                value="create"
                                                checked={compressMode === "create"}
                                                onChange={() => setCompressMode("create")}
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor="mode-create"
                                            >
                                                Create
                                            </label>
                                        </div>
                                        <div className="form-check form-check-inline">
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                name="compressMode"
                                                id="mode-update"
                                                value="update"
                                                checked={compressMode === "update"}
                                                onChange={() => setCompressMode("update")}
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor="mode-update"
                                            >
                                                Update
                                            </label>
                                        </div>
                                        <div className="form-check form-check-inline">
                                            <input
                                                className="form-check-input"
                                                type="radio"
                                                name="compressMode"
                                                id="mode-append"
                                                value="append"
                                                checked={compressMode === "append"}
                                                onChange={() => setCompressMode("append")}
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor="mode-append"
                                            >
                                                Append
                                            </label>
                                        </div>
                                    </div>
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
                                            currentItems={currentDirItems}
                                            selectedItems={targetItems}
                                            setSelectedItems={setTargetItems}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === "extract" && (
                                <div>
                                    <div className="mb-2 d-flex">
                                        <label className="form-label fw-bold me-4">
                                            Target File
                                        </label>
                                        <div className="form-text">{lastSelectedItem.name}</div>
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label fw-bold me-2">
                                            List of Contents
                                        </label>
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={async () => {
                                                await handleGfptar("list");
                                            }}
                                        >
                                            Get
                                        </button>
                                    </div>

                                    {indirList.length > 0 && (
                                        <div className="mb-3">
                                            <div
                                                className="mb-3 overflow-auto"
                                                style={{
                                                    minHeight: "calc(30vh - 100px)",
                                                    maxHeight: "calc(30vh - 100px)",
                                                }}
                                            >
                                                <MiniFileListView
                                                    currentItems={indirList}
                                                    selectedItems={selectedFromList}
                                                    setSelectedItems={setSelectedFromList}
                                                />
                                            </div>
                                        </div>
                                    )}
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
    setSelectedItems: PropTypes.func,
    setTasks: PropTypes.func,
    refresh: PropTypes.func,
};
