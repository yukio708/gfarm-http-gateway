import React, { useRef } from 'react';

function DownloadButton({ onDownload, selectedFiles }) {
    
    return (
        <div>
            <button className="btn btn-primary btn-sm" onClick={() => onDownload(selectedFiles)}>
                Download
            </button>
        </div>
    )
}

export default DownloadButton;