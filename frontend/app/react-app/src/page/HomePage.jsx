import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FileListView from "../components/FileListView";
import CurrentDirView from "../components/CurrentDirView";
import DetailView from "../components/DetailView";
import ProgressView from "../components/ProgressView";
import DeleteModal from "../components/DeleteModal";
import NewDirModal from "../components/NewDirModal";
import UploadDropZone from "../components/UploadDropZone";
import UploadMenu from "../components/UploadMenu";
import { FileActionMenu } from "../components/FileActionMenu";
import UserMenu from "../components/UserMenu";
import useFileList from "../hooks/useFileList";
import upload from "../utils/upload";
import download from "../utils/download";
import displayFile from "../utils/displayFile";
import moveFile from "../utils/moveFile";
import getAttribute from "../utils/getAttribute";
import setPermission from "../utils/setPermission";
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
    const [deleteFiles, setDeleteFiles] = useState([]);
    const [detailContent, setDetailContent] = useState(null);
    const [tasks, setTasks] = useState([]);
    const uploadQueueRef = useRef([]);
    const [isUploading, setIsUploading] = useState(false);
    const downloadQueueRef = useRef([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showPogressView, setShowPogressView] = useState(false);
    const [destPath, setDestPath] = useState("");
    const [showNewDirModal, setShowNewDirModal] = useState(false);

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

    const addFilesToDownload = async (files) => {
        console.debug("addFilesToDownload: files:", files);
        downloadQueueRef.current.push(files);
        setIsDownloading(true);
    };

    const addFilesToUpload = async (newFiles) => {
        uploadQueueRef.current.push({ uploadDir: currentDir, newFiles });
        setIsUploading(true);
    };

    const uploadFiles = async () => {
        const concurrency = 3;
        const worker = async () => {
            setTasks((prev) => prev.filter((t) => !t.done));
            while (uploadQueueRef.current.length) {
                const uploadFiles = uploadQueueRef.current.shift();
                await upload(uploadFiles.uploadDir, uploadFiles.newFiles, setTasks, () => {
                    setRefreshKey((prev) => !prev);
                });
                setShowPogressView(true);
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

    const downloadFiles = async () => {
        const concurrency = 3;
        const worker = async () => {
            setTasks((prev) => prev.filter((t) => !t.done));
            while (downloadQueueRef.current.length) {
                const files = downloadQueueRef.current.shift();
                console.debug("files", files);
                await download(files, setTasks);
                setShowPogressView(true);
            }
        };
        const workers = Array(concurrency).fill().map(worker);
        await Promise.all(workers);

        setIsDownloading(false);
    };

    useEffect(() => {
        if (isDownloading) {
            downloadFiles();
        }
    }, [isDownloading]);

    const showDetail = async (name, filepath) => {
        try {
            const detail = await getAttribute(filepath);
            console.debug("detail:", detail);
            detail.Name = name;
            setDetailContent(detail);
        } catch (err) {
            console.error("getAttribute failed:", err);
        }
    };

    const closeDetail = () => {
        setDetailContent(null);
    };

    const moveFiles = () => {
        // setShowModal(true);
    };

    // const handleMove = (files) => {
    //     console.debug("files", files);
    //     setShowModal(false);
    //     moveFile(files, destPath);
    //     setDestPath(""); // Reset after move
    //     setRefreshKey((prev) => !prev);
    // };

    if (listGetError) {
        return <ErrorPage error={listGetError} />;
    }

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col">
                    <nav className="navbar bg-body-tertiary">
                        <div className="container-fluid">
                            <span className="navbar-brand mb-0 h1">Title</span>
                            <div className="ms-2 d-flex gap-2">
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
                            <UploadMenu
                                onUpload={addFilesToUpload}
                                onCreate={() => {
                                    setShowNewDirModal(true);
                                }}
                            />
                            <FileActionMenu
                                selectedFiles={selectedFiles}
                                removeFiles={setDeleteFiles}
                                downloadFiles={addFilesToDownload}
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
                        download={addFilesToDownload}
                        showDetail={showDetail}
                        display={displayFile}
                        remove={setDeleteFiles}
                    />
                </div>
            </div>
            {detailContent && <DetailView detail={detailContent} onHide={closeDetail} />}
            <ProgressView
                show={showPogressView}
                onHide={() => {
                    setShowPogressView(false);
                }}
                tasks={tasks}
                setTasks={setTasks}
            />
            {!showPogressView && tasks.length > 0 && (
                <button
                    className="btn btn-primary position-fixed end-0 bottom-0 m-3"
                    onClick={() => {
                        setShowPogressView(true);
                    }}
                >
                    <i className="bi bi-arrow-repeat me-2"></i> Show Progress
                </button>
            )}
            <UploadDropZone onUpload={addFilesToUpload} />
            <DeleteModal
                deletefiles={deleteFiles}
                setDeleteFiles={setDeleteFiles}
                setError={setError}
                refrech={() => {
                    setDeleteFiles([]);
                    setRefreshKey((prev) => !prev);
                }}
            />
            <NewDirModal
                showModal={showNewDirModal}
                setShowModal={setShowNewDirModal}
                currentDir={currentDir}
                setError={setError}
                refrech={() => {
                    setRefreshKey((prev) => !prev);
                }}
            />
            {/* {showModal && (
                <ModalWindow
                    onCancel={() => {
                        setModalConfirmAction(null);
                        setShowModal(false);
                    }}
                    onConfirm={modalConfirmAction}
                    title={modalTitle}
                    text={modalContent}
                />
            )} */}
        </div>
    );
}

export default HomePage;

HomePage.propTypes = {
    user: PropTypes.string,
};
