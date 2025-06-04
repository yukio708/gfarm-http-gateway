import React from "react";
import PropTypes from "prop-types";

function MoveModal({ onHide, onConfirm, title, text, cancelText, comfirmText }) {
    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            role="dialog"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h1 className="modal-title">{title}</h1>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">{text}</div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onHide}>
                            {cancelText || "Cancel"}
                        </button>
                        <button type="button" className="btn btn-primary" onClick={onConfirm}>
                            {comfirmText || "Confirm"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MoveModal;

MoveModal.propTypes = {
    onHide: PropTypes.func,
    onConfirm: PropTypes.func,
    title: PropTypes.string,
    text: PropTypes.string,
    cancelText: PropTypes.string,
    comfirmText: PropTypes.string,
};
