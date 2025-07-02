import React, { useState, useEffect } from "react";
import ModalWindow from "./Modal";
import { useNotifications } from "../context/NotificationContext";
import removeItems from "../utils/remove";
import PropTypes from "prop-types";

function DeleteModal({ itemsToDelete, setItemsToDelete, refresh }) {
    const [showModal, setShowModal] = useState(false);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (itemsToDelete.length > 0) {
            setShowModal(true);
        }
    }, [itemsToDelete]);

    const deleteFile = async () => {
        const error = await removeItems(itemsToDelete, refresh);
        if (error) addNotification(error);
        setItemsToDelete([]);
        setShowModal(false);
    };

    return (
        showModal && (
            <ModalWindow
                onCancel={() => {
                    setItemsToDelete([]);
                    setShowModal(false);
                }}
                onConfirm={deleteFile}
                comfirmText="Delete"
                title={
                    <div>
                        <p className="modal-title">
                            Are you sure you want to permanently delete the following files?
                        </p>
                    </div>
                }
                text={
                    <div>
                        <ul>
                            {itemsToDelete.map((file, idx) => (
                                <li key={idx}>
                                    &quot;{file.name}&quot; {file.is_dir && "and its contents"}
                                </li>
                            ))}
                        </ul>
                    </div>
                }
            />
        )
    );
}

export default DeleteModal;

DeleteModal.propTypes = {
    itemsToDelete: PropTypes.array,
    setItemsToDelete: PropTypes.func,
    refresh: PropTypes.func,
};
