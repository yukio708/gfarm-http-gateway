import React, { useState, useCallback, useEffect } from "react";
import ModalWindow from "./Modal";
import { useNotifications } from "../context/NotificationContext";
import { createDir } from "../utils/dircommon";
import PropTypes from "prop-types";

function NewDirModal({ setShowModal, currentDir, refresh }) {
    const [dirname, setDirname] = useState("");
    const [visible, setVisible] = useState(true);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (!visible) {
            setShowModal(false);
        }
    }, [visible]);

    const handleCreateDir = useCallback(() => {
        console.log("handleCreateDir dirname", dirname);
        if (dirname === "") {
            addNotification("Create", "Directory name is empty", "warning");
            return false;
        }
        const create = async () => {
            const path = currentDir.replace(/\/$/, "") + "/" + dirname;
            const error = await createDir(path);
            setVisible(false);
            setDirname("");
            if (error) addNotification("Create", error, "error");
            refresh();
        };
        create();
        return true;
    }, [dirname]);

    return (
        <ModalWindow
            show={visible}
            onCancel={() => {
                setVisible(false);
                setDirname("");
            }}
            onConfirm={handleCreateDir}
            comfirmText="Create"
            title={<h5 className="modal-title">Create New Directory</h5>}
        >
            <input
                id="create-dir-input"
                type="text"
                className="form-control"
                value={dirname}
                onChange={(e) => {
                    console.log(e.target.value);
                    setDirname(e.target.value);
                    console.log("dirname", dirname);
                }}
                placeholder="Enter directory name"
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateDir();
                    }
                }}
            />
        </ModalWindow>
    );
}

export default NewDirModal;

NewDirModal.propTypes = {
    showModal: PropTypes.bool,
    setShowModal: PropTypes.func,
    currentDir: PropTypes.string,
    refresh: PropTypes.func,
};
