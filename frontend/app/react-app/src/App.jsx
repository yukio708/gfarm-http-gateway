import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import './css/App.css';
import Login from './Login';
import FileListView from './components/FileListView';
import CurrentDirView from './components/CurrentDirView';
import DetailView from './components/DetailView';
import ProgressView from './components/ProgressView';
import ModalWindow from './components/Modal';
import UploadDropZone from './components/UploadDropZone';
import UploadButton from './components/UploadButton';
import MenuButton from './components/MenuButton';
import useFileList from './hooks/useFileList';
import upload from './utils/upload';
import download from './utils/download';
import displayFile from './utils/displayFile';
import deleteFiles from './utils/deleteFile';
import moveFile from './utils/moveFile';
import getAttribute from './utils/getAttribute';
import setPermission from './utils/setPermission';
import { checkLoginStatus } from './utils/login';
import { createDir, removeDir } from './utils/dircommon';

function App() {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [currentDir, setCurrentDir] = useState("");
    const [refreshKey, setRefreshKey] = useState(false);
    const { files, error } = useFileList(currentDir, refreshKey);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [detailContent, setDetailContent] = useState(null);
    const [tasks, setTasks] = useState([]);
    const uploadQueueRef = useRef([]);
    const [isUploading, setIsUploading] = useState(false);
    const [destPath, setDestPath] = useState("");
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        checkLoginStatus().then(user => {
            setUser(user);
            console.log("user:", user);
            // setAuthChecked(true);
        });
    }, []);

    useEffect(() => {
        // Sync the URL path to currentDir
        const path = decodeURIComponent(location.pathname);
        setCurrentDir(path === "/" ? "" : path);
    }, [location]);

    const jumpDirectory = (newdir) => {
        if (currentDir === newdir) {
            setRefreshKey(prev => !prev);
        }
        else {
            // setCurrentDir(newdir);
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
            setSelectedFiles(selectedFiles.filter(path => path !== file));
        }
    };

    const downloadFiles = async (files) => {
        console.log("downloadFiles: filepath:", files);
        try {
            await download(files, setTasks);
        } catch (err) {
            console.error('Download failed:', err);
        }
        setTimeout(()=>{
            setTasks(prev => prev.filter(t => !t.done && Date.now() - t.updateTime < 10));
        }, 10000);
    };

    const addFilesToUpload = async(newFiles, uploaddirs) => {
        for (let dirpath of uploaddirs) {
            await createDir(currentDir + '/' + dirpath);
        }
        for (let newfile of newFiles ) {
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
                await upload(currentDir, file, setTasks, () => {setRefreshKey(prev => !prev)});
                setTimeout(()=>{
                    setTasks(prev => prev.filter(t => !t.done && Date.now() - t.updateTime < 10));
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
            console.error('getAttribute failed:', err);
        }
    }
    
    const closeDetail = () => {
        setDetailContent(null);
    };
    
    const deleteFile = async(files) => {
        // 複数の時削除するか聞く
        await deleteFiles(
            Array.isArray(files) ? files : [files], 
            null, () => {setRefreshKey(prev => !prev)});
    }

    const moveFiles = () => {
        setShowModal(true);
    }

    const handleMove = (files) => {
        console.log("files", files);
        setShowModal(false);
        moveFile(files, destPath);
        setDestPath(""); // Reset after move
        setRefreshKey(prev => !prev);
    }

    if (user === null) {
        return <Login onLogin={() => window.location.reload()} />;
    }

    return (
        <div>
            <div className="container-fluid App">
                <div className="row">
                    <div className="col">
                        <CurrentDirView currentDir={currentDir} onNavigate={jumpDirectory}/>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <nav className="navbar bg-body-tertiary">
                            <div className="container-fluid">
                                <div className="d-flex gap-2">
                                    <UploadButton onUpload={addFilesToUpload} />
                                    <MenuButton text='Download' onClick={downloadFiles} selectedFiles={selectedFiles}/>
                                    <MenuButton text='Detele' onClick={deleteFile} selectedFiles={selectedFiles}/>
                                    <MenuButton text='Move' onClick={moveFiles} selectedFiles={selectedFiles}/>
                                </div>
                            </div>
                        </nav>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <UploadDropZone onUpload={addFilesToUpload}/>
                    </div>
                </div>
                <div className="row">
                    <div className={detailContent ? "col-md-9" : "col"}>
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
                    {detailContent &&
                    <div className="col-md-3">
                        <DetailView detail={detailContent} onClose={closeDetail}/>
                    </div>
                    }
                </div>
                <ProgressView tasks={tasks} />
                <ModalWindow show={showModal} onHide={() => setShowModal(false)}
                       handleMove={handleMove} destPath={destPath} setDestPath={setDestPath} selectedFiles={selectedFiles} />
            </div>
        </div>
        );
}

export default App;
