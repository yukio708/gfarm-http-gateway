import React, { useState, useEffect } from "react";
import ModalWindow from "@components/Modal/Modal";
import { useNotifications } from "@context/NotificationContext";
import removeItems from "@utils/remove";
import PropTypes from "prop-types";

function DeleteModal({ setShowModal, itemsToDelete, setItemsToDelete, refresh }) {
    const [visible, setVisible] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (!visible && !isDeleting) {
            setShowModal(false);
        }
    }, [visible, isDeleting]);

    const handleDelete = () => {
        const deleteFile = async () => {
            setVisible(false);
            setIsDeleting(true);
            const error = await removeItems(itemsToDelete, refresh);
            setIsDeleting(false);
            if (error) addNotification("Delete", error, "error");
            setItemsToDelete([]);
        };
        deleteFile();
        return true;
    };

    return (
        <div>
            <ModalWindow
                show={visible}
                onCancel={() => {
                    setItemsToDelete([]);
                    setVisible(false);
                }}
                onConfirm={handleDelete}
                comfirmText="Delete"
                title={
                    <div>
                        <p className="modal-title">
                            Are you sure you want to permanently delete the following files?
                        </p>
                    </div>
                }
            >
                <div data-testid="delete-modal">
                    <ul>
                        {itemsToDelete.map((file, idx) => (
                            <li key={idx}>
                                &quot;{file.name}&quot; {file.is_dir && "and its contents"}
                            </li>
                        ))}
                    </ul>
                </div>
            </ModalWindow>
            {isDeleting && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50"
                    style={{ zIndex: 1050 }}
                    data-testid="delete-overlay"
                >
                    <div className="spinner-border text-danger" role="status"></div>
                    <div>Deleting files... please wait</div>
                </div>
            )}
        </div>
    );
}

export default DeleteModal;

DeleteModal.propTypes = {
    setShowModal: PropTypes.func,
    itemsToDelete: PropTypes.array,
    setItemsToDelete: PropTypes.func,
    refresh: PropTypes.func,
};
