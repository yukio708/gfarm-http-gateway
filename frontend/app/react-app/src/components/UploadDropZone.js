import React, { useState, useEffect } from 'react';
import UploadConfirmModal from './UploadConfirmModal';
import { getDeepestDirs, CollectPathsFromItems } from '../utils/func';
import '../css/DropZone.css'

function UploadDropZone({ onUpload }) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState(null);
    const [selectedDirs, setSelectedDirs] = useState(null);

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

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        // const files = Array.from(e.dataTransfer.files);
        const items = e.dataTransfer.items;
        const data = await CollectPathsFromItems(items);
        console.log("Collected files:", data.files);

        setSelectedDirs(getDeepestDirs(data.dirSet));
        setSelectedFiles(data.files);
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
