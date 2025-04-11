import React, { useState } from 'react';
import '../css/DropZone.css'

function DropZone({ onUpload }) {
    const [dragging, setDragging] = useState(false);

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
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            onUpload(files); // pass to upload function
        }
    };

    return (
        <div
            className={`drop-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <p>Drag and drop files here to upload</p>
        </div>
    );
}

export default DropZone;
