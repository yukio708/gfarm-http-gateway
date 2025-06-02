import React from 'react';

function ModalWindow({show, onHide, handleMove, destPath, setDestPath, selectedFiles}) {
    if (!show) return null;

    return (
        <div className="modal show d-block" tabIndex="-1" role="dialog" 
             style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Move Files</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter destination path"
                            value={destPath}
                            onChange={(e) => setDestPath(e.target.value)}
                        />
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onHide}>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => handleMove(selectedFiles)}>
                            Move
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ModalWindow;