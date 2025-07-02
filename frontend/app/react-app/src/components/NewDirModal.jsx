import React, { useState } from "react";
import ModalWindow from "./Modal";
import { useNotifications } from "../context/NotificationContext";
import { createDir } from "../utils/dircommon";
import PropTypes from "prop-types";

function NewDirModal({ showModal, setShowModal, currentDir, refresh }) {
    const [dirname, setDirname] = useState("");
    const { addNotification } = useNotifications();

    const handleCreateDir = async () => {
        if (dirname === "") {
            alert("Please input Directory Name");
            return;
        }
        const path = currentDir.replace(/\/$/, "") + "/" + dirname;
        const error = await createDir(path);
        setShowModal(false);
        setDirname("");
        if (error) addNotification(error);
        refresh();
    };

    return (
        showModal && (
            <ModalWindow
                onCancel={() => {
                    setShowModal(false);
                    setDirname("");
                }}
                onConfirm={handleCreateDir}
                comfirmText="Create"
                title={<h5 className="modal-title">Create New Directory</h5>}
                text={
                    <input
                        type="text"
                        className="form-control"
                        value={dirname}
                        onChange={(e) => setDirname(e.target.value)}
                        placeholder="Enter folder name"
                    />
                }
            />
        )
    );
}

export default NewDirModal;

NewDirModal.propTypes = {
    showModal: PropTypes.bool,
    setShowModal: PropTypes.func,
    currentDir: PropTypes.string,
    refresh: PropTypes.func,
};
