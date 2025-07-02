import React, { useState, useEffect } from "react";
import ModalWindow from "./Modal";
import { useNotifications } from "../context/NotificationContext";
import { getParentPath, checkFileName } from "../utils/func";
import moveItems from "../utils/move";
import PropTypes from "prop-types";

function RenameModal({ showModal, setShowModal, renameItem, refresh }) {
    const [newName, setNewName] = useState("");
    const [error, setError] = useState(null);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (showModal) {
            if (renameItem) {
                setNewName(renameItem.name);
            }
        }
    }, [showModal]);

    useEffect(() => {
        if (error) {
            console.debug("error", error);
            addNotification(error, "error");
        }
    }, [error]);

    const handleRename = async () => {
        if (!renameItem) return;
        if (!newName) return;
        const trimmedName = newName.trim();

        if (!checkFileName(trimmedName)) {
            addNotification(
                'Invalid name. Avoid characters like <>:"/\\|?* or ending with space/dot.'
            );
            setShowModal(false);
            setNewName("");
            return;
        }

        const destpath = `${getParentPath(renameItem.path)}${trimmedName}`.replace(/\/+/, "/");

        const item = {
            ...renameItem,
            destPath: destpath,
        };

        await moveItems([item], setError);
        setShowModal(false);
        setNewName("");
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
    refresh: PropTypes.func,
};
