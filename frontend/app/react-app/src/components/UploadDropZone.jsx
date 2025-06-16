import React, { useState, useEffect } from "react";
import ModalWindow from "./Modal";
import { CollectPathsFromItems, formatFileSize } from "../utils/func";
import "../css/DropZone.css";
import PropTypes from "prop-types";

function UploadDropZone({ onUpload, files }) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showReConfirm, setShowReConfirm] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState(null);
    const [modalText, setModalText] = useState(null);

    useEffect(() => {
        const handleDragEnter = async (e) => {
            e.preventDefault();

            const isFileDrag = Array.from(e.dataTransfer.types).includes("Files");

            if (isFileDrag) {
                setIsDragActive(true);
            }
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
        console.debug("Collected files:", data.files);
        if (data.files.length === 0) {
            return;
        }

        setSelectedFiles(data.files);
        setModalText(
            <ul className="modal-body">
                {data.files !== null &&
                    data.files.map((file, idx) => (
                        <li key={idx}>
                            <strong>{file.dirPath + file.name}</strong> —{" "}
                            {formatFileSize(file.size)}
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
            const duplicates = files.filter((file) =>
                selectedFiles.some((selectedfile) => {
                    if (file.is_file && file.name === selectedfile.name) return true;
                    else if (file.name === selectedfile.dirPath.split("/", 2)[0]) {
                        return true;
                    }
                    return false;
                })
            );

            if (duplicates.length > 0) {
                setModalText(
                    <ul className="modal-body">
                        <p>The following files/directories already exist:</p>
                        {duplicates.map((file, idx) => (
                            <li key={idx}>
                                <strong>{file.name}</strong>
                            </li>
                        ))}
                    </ul>
                );
                setShowReConfirm(true);
                return;
            }
            re_confirmUpload();
        }
    };

    const re_confirmUpload = () => {
        setShowReConfirm(false);
        if (selectedFiles.length > 0) {
            console.debug("selectedFiles:", selectedFiles);
            onUpload(selectedFiles); // pass to upload function
        }
    };

    const cancelUpload = () => {
        setIsDragActive(false);
        setShowConfirm(false);
        if (showReConfirm) {
            setShowReConfirm(false);
        }
    };

    return (
        <div>
            {isDragActive && (
                <div
                    style={{ position: "fixed", top: 0, left: 0, zIndex: 1000, width: "100%" }}
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
                    onCancel={cancelUpload}
                    onConfirm={confirmUpload}
                    title={
                        <p className="modal-title">
                            Are you sure you want to upload the following files?
                        </p>
                    }
                    text={modalText}
                />
            )}
            {showReConfirm && (
                <ModalWindow
                    onCancel={cancelUpload}
                    onConfirm={re_confirmUpload}
                    title={
                        <p className="modal-title">
                            Are you sure you want to overwrite the following files?
                        </p>
                    }
                    text={modalText}
                />
            )}
        </div>
    );
}

export default UploadDropZone;

UploadDropZone.propTypes = {
    onUpload: PropTypes.func,
    files: PropTypes.array,
};
