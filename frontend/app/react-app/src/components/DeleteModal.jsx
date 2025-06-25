import React, { useState, useEffect } from "react";
import ModalWindow from "./Modal";
import removeFiles from "../utils/removeFile";
import PropTypes from "prop-types";

function DeleteModal({ itemsToDelete, setItemsToDelete, setError, refrech }) {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (itemsToDelete.length > 0) {
            setShowModal(true);
        }
    }, [itemsToDelete]);

    const deleteFile = async () => {
        const error = await removeFiles(itemsToDelete, refrech);
        setError(error);
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
    setError: PropTypes.func,
    refrech: PropTypes.func,
};
