import React, { useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';

function UploadButton({ onUpload }) {
    const fileInputRef = useRef(null);
    const [selectedFiles, setSelectedFiles] = useState(null);

    const handleButtonClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setSelectedFiles(files);
            // Optional: Show confirm modal here
            onUpload(files); // Or wait for confirm
        }
    };

    return (
        <div>
            <Button variant="primary" size="sm" onClick={handleButtonClick}>Upload files</Button>
            <input
                type="file"
                multiple
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileChange}
            />
        </div>
    );
}

export default UploadButton;
