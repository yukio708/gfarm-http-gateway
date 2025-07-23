import React, { useState, useEffect } from "react";
import ModalWindow from "./Modal";
import { useNotifications } from "../context/NotificationContext";
import { getParentPath, checkFileName } from "../utils/func";
import moveItems from "../utils/move";
import PropTypes from "prop-types";

function RenameModal({ setShowModal, renameItem, refresh }) {
    const [newName, setNewName] = useState(renameItem?.name || "");
    const [visible, setVisible] = useState(true);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (!visible) {
            setShowModal(false);
        }
    }, [visible]);

    const setError = (error) => {
        console.debug("error", error);
        addNotification("Rename", error, "error");
    };

    const handleRename = () => {
        if (!renameItem || !newName) {
            setNewName("");
            setVisible(false);
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

            const item = {
                ...renameItem,
                destPath: destpath,
            };

            await moveItems([item], setError);
            setNewName("");
            setVisible(false);
            refresh();
        };
        rename();
    };

    return (
        <ModalWindow
            show={visible}
            onCancel={() => {
                setNewName("");
                setVisible(false);
            }}
            onConfirm={handleRename}
            comfirmText="Rename"
            title={<h5 className="modal-title">Rename</h5>}
        >
            <div>
                <input
                    id="rename-input"
                    type="text"
                    className="form-control"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Enter name"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleRename();
                        }
                    }}
                />
            </div>
        </ModalWindow>
    );
}

export default RenameModal;

RenameModal.propTypes = {
    setShowModal: PropTypes.func,
    renameItem: PropTypes.object,
    refresh: PropTypes.func,
};
