import React, { useState, useEffect } from "react";
import ModalWindow from "./Modal";
import { getParentPath, checkFileName } from "../utils/func";
import moveItems from "../utils/move";
import PropTypes from "prop-types";

function RenameModal({ showModal, setShowModal, renameItem, setError, refresh }) {
    const [newName, setNewName] = useState("");

    useEffect(() => {
        if (showModal) {
            if (renameItem) {
                setNewName(renameItem.name);
            }
        }
    }, [showModal]);

    const handleRename = async () => {
        if (!renameItem) return;
        if (!newName) return;
        const trimmedName = newName.trim();

        if (!checkFileName(trimmedName)) {
            setError('Invalid name. Avoid characters like <>:"/\\|?* or ending with space/dot.');
            setShowModal(false);
            setNewName("");
            return;
        }

        const destpath = `${getParentPath(renameItem.path)}${trimmedName}`.replace(/\/+/, "/");

        const item = {
            ...renameItem,
            destPath: destpath,
        };

        const error = await moveItems([item]);
        setShowModal(false);
        setNewName("");
        setError(error);
        refresh();
    };

    return (
        showModal && (
            <ModalWindow
                onCancel={() => {
                    setShowModal(false);
                    setNewName("");
                }}
                onConfirm={handleRename}
                comfirmText="Rename"
                title={<h5 className="modal-title">Rename</h5>}
                text={
                    <div>
                        <input
                            type="text"
                            className="form-control"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="Enter name"
                        />
                    </div>
                }
            />
        )
    );
}

export default RenameModal;

RenameModal.propTypes = {
    showModal: PropTypes.bool,
    setShowModal: PropTypes.func,
    renameItem: PropTypes.object,
    setError: PropTypes.func,
    refresh: PropTypes.func,
};
