import React, { useState, useEffect } from "react";
import ModalWindow from "./Modal";
import deleteFiles from "../utils/deleteFile";
import PropTypes from "prop-types";

function DeleteModal({ deletefiles, setDeleteFiles, setError, refrech }) {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (deletefiles.length > 0) {
            setShowModal(true);
        }
    }, [deletefiles]);

    const deleteFile = async () => {
        const error = await deleteFiles(deletefiles, null, refrech);
        setError(error);
    };

    return (
        showModal && (
            <ModalWindow
                onCancel={() => {
                    setDeleteFiles([]);
                    setShowModal(false);
                }}
                onConfirm={deleteFile}
                title={
                    <p className="modal-title">
                        Are you sure you want to delete the following file(s)?
                    </p>
                }
                text={
                    <div>
                        <ul>
                            {deletefiles.map((file, idx) => (
                                <li key={idx}>{file.name}</li>
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
    deletefiles: PropTypes.array,
    setDeleteFiles: PropTypes.func,
    setError: PropTypes.func,
    refrech: PropTypes.func,
};
