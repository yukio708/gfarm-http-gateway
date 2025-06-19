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
import MoveModal from "../components/MoveModel";
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
    const { currentFiles, listGetError } = useFileList(currentDir, refreshKey);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [filesToDelete, setFilesToDelete] = useState([]);
    const [filesToMove, setFilesToMove] = useState([]);
    const [detailContent, setDetailContent] = useState(null);
    const [tasks, setTasks] = useState([]);
    const uploadQueueRef = useRef([]);
    const [isUploading, setIsUploading] = useState(false);
    const downloadQueueRef = useRef([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showProgressView, setShowProgressView] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
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
            setSelectedFiles(currentFiles);
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

    const addFilesToDownload = (files) => {
        console.debug("addFilesToDownload: files:", files);
        downloadQueueRef.current.push(files);
        setIsDownloading(true);
    };

    const addFilesToUpload = (newFiles) => {
        uploadQueueRef.current.push(newFiles);
        setIsUploading(true);
    };

    const handleUpload = async () => {
        const concurrency = 3;
        const worker = async () => {
            setTasks((prev) => prev.filter((t) => !t.done));
            while (uploadQueueRef.current.length) {
                const uploadFiles = uploadQueueRef.current.shift();
                setShowProgressView(true);
                await upload(uploadFiles, setTasks, () => {
                    setRefreshKey((prev) => !prev);
                });
            }
        };
        const workers = Array(concurrency).fill().map(worker);
        await Promise.all(workers);

        setIsUploading(false);
    };

    useEffect(() => {
        if (isUploading) {
            handleUpload();
        }
    }, [isUploading]);

    const handleDownload = async () => {
        const concurrency = 3;
        const worker = async () => {
            setTasks((prev) => prev.filter((t) => !t.done));
            while (downloadQueueRef.current.length) {
                const files = downloadQueueRef.current.shift();
                console.debug("files", files);
                setShowProgressView(true);
                await download(files, setTasks);
            }
        };
        const workers = Array(concurrency).fill().map(worker);
        await Promise.all(workers);

        setIsDownloading(false);
    };

    useEffect(() => {
        if (isDownloading) {
            handleDownload();
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

    const addFilesToMove = (files) => {
        setFilesToMove(files);
        setShowMoveModal(true);
    };

    const handleMove = (files, destPath) => {
        moveFile(files, destPath, () => {
            setRefreshKey((prev) => !prev);
        });
        setSelectedFiles(
            selectedFiles.filter((file) => files.some((movedFile) => movedFile.name !== file.name))
        );
        setFilesToMove("");
        setRefreshKey((prev) => !prev);
    };

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
                                uploadDir={currentDir}
                                currentFiles={currentFiles}
                            />
                            <FileActionMenu
                                selectedFiles={selectedFiles}
                                removeFiles={setFilesToDelete}
                                downloadFiles={addFilesToDownload}
                                moveFiles={addFilesToMove}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="row">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="col">
                    <FileListView
                        currentFiles={currentFiles}
                        selectedFiles={selectedFiles}
                        handleSelectFile={handleSelectFile}
                        handleSelectAll={handleSelectAll}
                        jumpDirectory={jumpDirectory}
                        download={addFilesToDownload}
                        showDetail={showDetail}
                        display={displayFile}
                        remove={setFilesToDelete}
                        move={addFilesToMove}
                    />
                </div>
            </div>
            {detailContent && <DetailView detail={detailContent} onHide={closeDetail} />}
            <ProgressView
                show={showProgressView}
                onHide={() => {
                    setShowProgressView(false);
                }}
                tasks={tasks}
                setTasks={setTasks}
            />
            {!showProgressView && tasks.length > 0 && (
                <button
                    className="btn btn-primary position-fixed end-0 bottom-0 m-3"
                    onClick={() => {
                        setShowProgressView(true);
                    }}
                >
                    <i className="bi bi-arrow-repeat me-2"></i> Show Progress
                </button>
            )}
            <UploadDropZone
                onUpload={addFilesToUpload}
                uploadDir={currentDir}
                currentFiles={currentFiles}
            />
            <DeleteModal
                deletefiles={filesToDelete}
                setDeleteFiles={setFilesToDelete}
                setError={setError}
                refrech={() => {
                    setSelectedFiles(
                        selectedFiles.filter((file) =>
                            filesToDelete.some((deletedfile) => deletedfile.path !== file.path)
                        )
                    );
                    setFilesToDelete([]);
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
            <MoveModal
                showModal={showMoveModal}
                setShowModal={setShowMoveModal}
                currentDir={currentDir}
                handleMove={handleMove}
                filesToMove={filesToMove}
                setFilesToMove={setFilesToMove}
            />
        </div>
    );
}

export default HomePage;

HomePage.propTypes = {
    user: PropTypes.string,
};
