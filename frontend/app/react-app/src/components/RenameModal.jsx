import React, { useState, useEffect } from "react";
import ModalWindow from "./Modal";
import { useNotifications } from "../context/NotificationContext";
import { getParentPath, checkFileName } from "../utils/func";
import moveItems from "../utils/move";
import PropTypes from "prop-types";

function RenameModal({ showModal, setShowModal, renameItem, refresh }) {
    const [newName, setNewName] = useState("");
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (showModal) {
            if (renameItem) {
                setNewName(renameItem.name);
            }
        }
    }, [showModal]);

    const setError = (error) => {
        console.debug("error", error);
        addNotification("Rename", error, "error");
    };

    const handleRename = () => {
        if (!renameItem || !newName) {
            setShowModal(false);
            setNewName("");
            return true;
        }
        const trimmedName = newName.trim();

        if (!checkFileName(trimmedName)) {
            addNotification(
                "Rename",
                'Invalid name. Avoid characters like <>:"/\\|?* or ending with space/dot.',
                "error"
            );
            return false;
        }

        const rename = async () => {
            const destpath =
                getParentPath(renameItem.path).replace(/\/$/, "") +
                "/" +
                trimmedName.replace(/\/+/, "/");
            console.log("destpath", destpath);

            const item = {
                ...renameItem,
                destPath: destpath,
            };

            await moveItems([item], setError);
            setShowModal(false);
            setNewName("");
            refresh();
        };
        rename();
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
                body={
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
