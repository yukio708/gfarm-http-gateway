import React, { useState, useEffect } from "react";
import ModalWindow from "../components/Modal";
import { getDeepestDirs, CollectPathsFromItems, formatFileSize } from "../utils/func";
import "../css/DropZone.css";
import PropTypes from "prop-types";

function UploadDropZone({ onUpload }) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState(null);
    const [selectedDirs, setSelectedDirs] = useState(null);
    const [modalText, setModalText] = useState(null);

    useEffect(() => {
        const handleDragEnter = async (e) => {
            e.preventDefault();

            // const items = e.dataTransfer.items;
            // console.log(items);
            // const data = await CollectPathsFromItems(items);
            // console.log("data", data);
            // console.log("data", data.files.length);
            // console.log("data", data.dirSet.size);
            // if (data.files.length === 0 && data.dirSet.size === 0) {
            //     return;
            // }

            setIsDragActive(true);
        };

        const handleDragOver = (e) => {
            e.preventDefault();
        };

        const handleDragLeave = (e) => {
            if (e.relatedTarget === null) {
                setIsDragActive(false);
            }
        };

        const handleDrop = (e) => {
            e.preventDefault();
            setIsDragActive(false);
        };

        window.addEventListener("dragenter", handleDragEnter);
        window.addEventListener("dragover", handleDragOver);
        window.addEventListener("dragleave", handleDragLeave);
        window.addEventListener("drop", handleDrop);

        return () => {
            window.removeEventListener("dragenter", handleDragEnter);
            window.removeEventListener("dragover", handleDragOver);
            window.removeEventListener("dragleave", handleDragLeave);
            window.removeEventListener("drop", handleDrop);
        };
    }, []);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        setIsDragActive(false);
        // const files = Array.from(e.dataTransfer.files);
        const items = e.dataTransfer.items;
        const data = await CollectPathsFromItems(items);
        console.log("Collected files:", data.files);
        if (data.files.length === 0 && data.dirSet.size === 0) {
            return;
        }

        setSelectedDirs(getDeepestDirs(data.dirSet));
        setSelectedFiles(data.files);
        setModalText(
            <ul className="modal-body">
                {data.files !== null &&
                    data.files.map((file, idx) => (
                        <li key={idx}>
                            <strong>{file.dirPath + file.name}</strong> —{" "}
                            {formatFileSize(file.size)} KB
                        </li>
                    ))}
            </ul>
        );
        setShowConfirm(true);
    };

    const confirmUpload = () => {
        setIsDragActive(false);
        setShowConfirm(false);
        if (selectedFiles.length > 0) {
            console.log("selectedFiles:", selectedFiles);
            onUpload(selectedFiles, selectedDirs); // pass to upload function
        }
    };

    const cancelUpload = () => {
        setIsDragActive(false);
        setShowConfirm(false);
    };

    return (
        <div>
            {isDragActive && (
                <div
                    className={`drop-zone ${dragging ? "dragging" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <p>Drag and drop files here to upload</p>
                </div>
            )}
            {showConfirm && (
                <ModalWindow
                    onHide={cancelUpload}
                    onConfirm={confirmUpload}
                    title={<p>Are you sure you want to upload the following file(s)?</p>}
                    text={modalText}
                />
            )}
        </div>
    );
}

export default UploadDropZone;

UploadDropZone.propTypes = {
    onUpload: PropTypes.func,
};
