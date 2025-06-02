import React from 'react';
import { formatFileSize } from '../utils/func';

function UploadConfirmModal({ show, onHide, onConfirm, files }) {
    if (!show) return null;
    return (
        <div className="modal show d-block" tabIndex="-1" role="dialog" aria-hidden="true"
             style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <p>Are you sure you want to upload the following file(s)?</p>
                    </div>
                    <div className="modal-body">
                        <ul>
                        {files !== null && files.map((file, idx) => (
                            <li key={idx}>
                            <strong>{file.name}</strong> — {formatFileSize(file.size)} KB
                            </li>
                        ))}
                        </ul>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className='btn btn-secondary' onClick={onHide}>
                            Cancel
                        </button>
                        <button type="button" className='btn btn-primary' onClick={onConfirm}>
                            Upload
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UploadConfirmModal;
