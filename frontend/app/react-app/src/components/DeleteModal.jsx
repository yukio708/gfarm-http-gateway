import React, { useState, useEffect } from "react";
import ModalWindow from "./Modal";
import removeFiles from "../utils/removeFile";
import PropTypes from "prop-types";

function DeleteModal({ deletefiles, setDeleteFiles, setError, refrech }) {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (deletefiles.length > 0) {
            setShowModal(true);
        }
    }, [deletefiles]);

    const deleteFile = async () => {
        const error = await removeFiles(deletefiles, refrech);
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
                            {deletefiles.map((file, idx) => (
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
    deletefiles: PropTypes.array,
    setDeleteFiles: PropTypes.func,
    setError: PropTypes.func,
    refrech: PropTypes.func,
};
