import React, { useEffect, useRef } from "react";
import Modal from "bootstrap/js/dist/modal";
import PropTypes from "prop-types";

function ModalWindow({
    show,
    onCancel,
    onConfirm,
    title,
    children,
    cancelText,
    comfirmText,
    size,
}) {
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
        }
    }, []);

    useEffect(() => {
        if (!modalInstance.current) return;

        if (show) {
            modalInstance.current.show();
            console.debug("Modal show");
        } else {
            modalInstance.current.hide();
            console.debug("Modal hide");
        }
    }, [show]);

    const handleConfirm = () => {
        if (onConfirm) {
            const res = onConfirm?.();
            console.debug("handleConfirm", res);
        }
    };

    const handleCancel = () => {
        onCancel?.();
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1">
            <div className={`modal-dialog ${size_class}`} role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        {title}
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleCancel}
                            data-bs-dismiss="modal"
                        ></button>
                    </div>
                    <div className="modal-body">{children}</div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleCancel}
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
    show: PropTypes.bool,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    title: PropTypes.string,
    children: PropTypes.node,
    cancelText: PropTypes.string,
    comfirmText: PropTypes.string,
    size: PropTypes.string,
};
