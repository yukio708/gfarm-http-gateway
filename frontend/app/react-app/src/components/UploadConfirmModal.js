import React from 'react';
import { Modal, Button } from 'react-bootstrap';

function UploadConfirmModal({ show, onHide, onConfirm, files }) {
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Confirm Upload</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Are you sure you want to upload the following file(s)?</p>
                <ul>
                    {files && files.map((file, idx) => (
                        <li key={idx}>
                            <strong>{file.name}</strong> — {Math.round(file.size / 1024)} KB
                        </li>
                    ))}
                </ul>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={onConfirm}>Upload</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default UploadConfirmModal;
