import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FileListView from "../components/FileListView";
import CurrentDirView from "../components/CurrentDirView";
import DetailView from "../components/DetailView";
import ProgressView from "../components/ProgressView";
import ModalWindow from "../components/Modal";
import UploadDropZone from "../components/UploadDropZone";
import UploadMenu from "../components/UploadMenu";
import FileActionMenu from "../components/FileActionMenu";
import UserMenu from "../components/UserMenu";
import useFileList from "../hooks/useFileList";
import upload from "../utils/upload";
import download from "../utils/download";
import displayFile from "../utils/displayFile";
import deleteFiles from "../utils/deleteFile";
import moveFile from "../utils/moveFile";
import getAttribute from "../utils/getAttribute";
import setPermission from "../utils/setPermission";
import { createDir } from "../utils/dircommon";
import ErrorPage from "./ErrorPage";

import PropTypes from "prop-types";

function HomePage({ user }) {
    const location = useLocation();
    const navigate = useNavigate();
    const currentDir = decodeURIComponent(location.pathname);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(false);
    const { files, listGetError } = useFileList(currentDir, refreshKey);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [detailContent, setDetailContent] = useState(null);
    const [tasks, setTasks] = useState([]);
    const uploadQueueRef = useRef([]);
    const [isUploading, setIsUploading] = useState(false);
    const [destPath, setDestPath] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalContent, setModalContent] = useState("");
    const [modalConfirmAction, setModalConfirmAction] = useState(null);

    const jumpDirectory = (newdir) => {
        if (currentDir === newdir) {
            setRefreshKey((prev) => !prev);
        } else {
            navigate(newdir);
        }
        setSelectedFiles([]);
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedFiles(files);
        } else {
            setSelectedFiles([]);
        }
    };

    const handleSelectFile = (event, file) => {
        if (event.target.checked) {
            setSelectedFiles([...selectedFiles, file]);
        } else {
            setSelectedFiles(selectedFiles.filter((path) => path !== file));
        }
    };

    const downloadFiles = async (files) => {
        console.log("downloadFiles: filepath:", files);
        try {
            await download(files, setTasks);
        } catch (err) {
            console.error("Download failed:", err);
        }
        setTimeout(() => {
            setTasks((prev) => prev.filter((t) => !t.done && Date.now() - t.updateTime < 10));
        }, 10000);
    };

    const addFilesToUpload = async (newFiles, uploaddirs) => {
        for (let dirpath of uploaddirs) {
            await createDir(currentDir + "/" + dirpath, "p=on");
        }
        for (let newfile of newFiles) {
            uploadQueueRef.current.push(newfile);
        }
        setIsUploading(true);
    };

    const uploadFiles = async () => {
        const concurrency = 3;
        const worker = async () => {
            while (uploadQueueRef.current.length) {
                const file = uploadQueueRef.current.shift();
                // 現在位置が変わると違う場所にアップロードされてしまう
                await upload(currentDir, file, setTasks, () => {
                    setRefreshKey((prev) => !prev);
                });
                setTimeout(() => {
                    setTasks((prev) =>
                        prev.filter((t) => !t.done && Date.now() - t.updateTime < 10)
                    );
                }, 10000);
            }
        };
        const workers = Array(concurrency).fill().map(worker);
        await Promise.all(workers);

        setIsUploading(false);
    };

    useEffect(() => {
        if (isUploading) {
            uploadFiles();
        }
    }, [isUploading]);

    const showDetail = async (name, filepath) => {
        try {
            const detail = await getAttribute(filepath);
            console.log("detail:", detail);
            detail.Name = name;
            setDetailContent(detail);
        } catch (err) {
            console.error("getAttribute failed:", err);
        }
    };

    const closeDetail = () => {
        setDetailContent(null);
    };

    const deleteFile = async (files) => {
        const deletefiles = Array.isArray(files) ? files : [files];
        setModalTitle(
            <p className="modal-title">Are you sure you want to delete the following file(s)?</p>
        );
        setModalContent(
            <div>
                <ul>
                    {deletefiles.map((file, idx) => (
                        <li key={idx}>{file.name}</li>
                    ))}
                </ul>
            </div>
        );
        setModalConfirmAction(() => async () => {
            const error = await deleteFiles(deletefiles, null, () => {
                setRefreshKey((prev) => !prev);
            });
            setError(error);
        });
        setShowModal(true);
    };

    const moveFiles = () => {
        setShowModal(true);
    };

    const handleMove = (files) => {
        console.log("files", files);
        setShowModal(false);
        moveFile(files, destPath);
        setDestPath(""); // Reset after move
        setRefreshKey((prev) => !prev);
    };

    const createDirectory = async (dirname) => {
        await createDir(currentDir + "/" + dirname);
    };

    if (listGetError) {
        return <ErrorPage error={listGetError} />;
    }

    return (
        <div>
            <div className="row">
                <div className="col">
                    <nav className="navbar bg-body-tertiary">
                        <div className="container-fluid">
                            <span className="navbar-brand mb-0 h1">Title</span>
                            <div className="ms-2">
                                <UserMenu user={user} />
                            </div>
                        </div>
                    </nav>
                </div>
            </div>
            <div className="row">
                <div className="col">
                    <div className="d-flex">
                        <div className="mx-3">
                            <CurrentDirView currentDir={currentDir} onNavigate={jumpDirectory} />
                        </div>
                        <div className="d-flex gap-2">
                            <UploadMenu onUpload={addFilesToUpload} onCreate={createDirectory} />
                            <FileActionMenu
                                selectedFiles={selectedFiles}
                                deleteFile={deleteFile}
                                downloadFiles={downloadFiles}
                                moveFiles={moveFiles}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="row">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="col">
                    <FileListView
                        files={files}
                        selectedFiles={selectedFiles}
                        handleSelectFile={handleSelectFile}
                        handleSelectAll={handleSelectAll}
                        jumpDirectory={jumpDirectory}
                        downloadFiles={downloadFiles}
                        showDetail={showDetail}
                        displayFile={displayFile}
                        deleteFile={deleteFile}
                    />
                </div>
            </div>
            {detailContent && <DetailView detail={detailContent} onHide={closeDetail} />}
            <ProgressView tasks={tasks} />
            <UploadDropZone onUpload={addFilesToUpload} />
            {showModal && (
                <ModalWindow
                    onCancel={() => {
                        setModalConfirmAction(null);
                        setShowModal(false);
                    }}
                    onConfirm={modalConfirmAction}
                    title={modalTitle}
                    text={modalContent}
                />
            )}
        </div>
    );
}

export default HomePage;

HomePage.propTypes = {
    user: PropTypes.string,
};
