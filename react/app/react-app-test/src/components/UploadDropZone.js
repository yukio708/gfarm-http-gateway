import React, { useState, useEffect } from 'react';
import UploadConfirmModal from './UploadConfirmModal';
import '../css/DropZone.css'

function UploadDropZone({ onUpload }) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState(null);

    useEffect(() => {
        const handleDragEnter = (e) => {
            e.preventDefault();
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

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
        window.removeEventListener('dragenter', handleDragEnter);
        window.removeEventListener('dragover', handleDragOver);
        window.removeEventListener('dragleave', handleDragLeave);
        window.removeEventListener('drop', handleDrop);
    };
    }, []); // Empty dependency array: run only once

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

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        // const files = e.dataTransfer.files;
        const files = Array.from(e.dataTransfer.files);
        console.log(files);
        console.log(Array.isArray(files)); // should be true
        setSelectedFiles(files);
        setShowConfirm(true);
    };

    const confirmUpload = () => {
        setIsDragActive(false);
        setShowConfirm(false);
        if (selectedFiles.length > 0) {
            console.log("selectedFiles:", selectedFiles);
            onUpload(selectedFiles); // pass to upload function
        }
    };

    const cancelUpload = () => {
        setIsDragActive(false);
        setShowConfirm(false);
    }

    return (isDragActive &&
        <div className={`drop-zone ${dragging ? 'dragging' : ''}`}
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop} >
            <p>Drag and drop files here to upload</p>
            <UploadConfirmModal
                show={showConfirm}
                onHide={cancelUpload}
                onConfirm={confirmUpload}
                files={selectedFiles} />
        </div>
    );
}

export default UploadDropZone;
