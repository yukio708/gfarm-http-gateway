import React, { useEffect, useRef, useCallback } from "react";
import Modal from "bootstrap/js/dist/modal";
import PropTypes from "prop-types";

function ModalWindow({ onCancel, onConfirm, title, children, cancelText, comfirmText, size }) {
    const modalRef = useRef(null);
    const modalInstance = useRef(null);
    const size_class = size == "large" ? "modal-lg" : "";

    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstance.current) {
            modalInstance.current = new Modal(modalRef.current, {
                backdrop: "static",
                keyboard: false,
            });
            modalInstance.current.show();
            console.debug("Modal show");
        }
    }, []);

    const handleConfirm = useCallback(() => {
        if (onConfirm) {
            const res = onConfirm();
            console.debug("handleConfirm", res);
            if (res === true || res === undefined) {
                modalInstance.current.hide();
            }
        }
    }, [onConfirm]);

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1">
            <div className={`modal-dialog ${size_class}`} role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        {title}
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onCancel}
                            data-bs-dismiss="modal"
                        ></button>
                    </div>
                    <div className="modal-body">{children}</div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onCancel}
                            data-bs-dismiss="modal"
                            data-testid="modal-button-cancel"
                        >
                            {cancelText || "Cancel"}
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleConfirm}
                            data-testid="modal-button-confirm"
                        >
                            {comfirmText || "Confirm"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ModalWindow;

ModalWindow.propTypes = {
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    title: PropTypes.string,
    children: PropTypes.node,
    cancelText: PropTypes.string,
    comfirmText: PropTypes.string,
    size: PropTypes.string,
};
