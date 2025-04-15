import React, { useRef } from 'react';
import { getDeepestDirs, CollectPathsFromFiles } from '../utils/func';
import Dropdown from 'react-bootstrap/Dropdown';
import ButtonGroup from 'react-bootstrap/ButtonGroup'

function UploadButton({ onUpload }) {
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const data = CollectPathsFromFiles(files);
        if (data.files) {
            console.log("Collected files:", data.files);
            onUpload(data.files, getDeepestDirs(data.dirSet));
        }
    };

    return (
        <div>
            <Dropdown as={ButtonGroup}>
                <Dropdown.Toggle variant="primary" size="sm">
                    Upload
                </Dropdown.Toggle>

                <Dropdown.Menu>
                    <Dropdown.Item onClick={() => fileInputRef.current?.click()}>
                        Upload Files
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => folderInputRef.current?.click()}>
                        Upload a Folder
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>

            <input
                type="file"
                multiple
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            <input
                type="file"
                webkitdirectory="true" 
                multiple
                style={{ display: 'none' }}
                ref={folderInputRef}
                onChange={handleFileChange}
            />
        </div>
        
    );
}

export default UploadButton;
