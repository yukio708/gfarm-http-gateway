import React, { useState, useRef, useEffect } from 'react';
import './css/App.css';
import Login from './Login';
import FileListView from './components/FileListView';
import CurrentDirView from './components/CurrentDirView';
import DetailView from './components/DetailView';
import ProgressView from './components/ProgressView';
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
import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

function App() {
    const [user, setUser] = useState(null);
    const [currentDir, setCurrentDir] = useState("");
    const [refreshKey, setRefreshKey] = useState(false);
    const { files, error } = useFileList(currentDir, refreshKey);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [detailContent, setDetailContent] = useState(null);
    const [tasks, setTasks] = useState([]);
    const uploadQueueRef = useRef([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        checkLoginStatus().then(user => {
            setUser(user);
            console.log("user:", user);
            // setAuthChecked(true);
        });
    }, []);

    const jumpDirectory = (newdir) => {
        if (currentDir === newdir) {
            setRefreshKey(prev => !prev);
        }
        else {
            setCurrentDir(newdir);
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
        for ( let newfile of newFiles ) {
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

    if (user === null) {
        return <Login onLogin={() => window.location.reload()} />;
    }

    return (
        <div>
            <Container fluid className="App">
                <Row>
                    <CurrentDirView currentDir={currentDir} onNavigate={jumpDirectory}/>
                </Row>
                <Row>
                    <nav className="navbar bg-body-tertiary">
                        <div className="container-fluid">
                            <div className="d-flex gap-2">
                                <UploadButton onUpload={addFilesToUpload} />
                                <MenuButton text='Download' onClick={downloadFiles} selectedFiles={selectedFiles}/>
                                <MenuButton text='Detele' onClick={deleteFile} selectedFiles={selectedFiles}/>
                            </div>
                        </div>
                    </nav>
                </Row>
                <Row>
                    <Col>
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
                    </Col>
                    {detailContent &&
                    <Col md={3}>
                        <DetailView detail={detailContent} onClose={closeDetail}/>
                    </Col>
                    }
                </Row>
                <Row>
                    <UploadDropZone onUpload={addFilesToUpload}/>
                </Row>
                <ProgressView tasks={tasks} />

            </Container>
        </div>
        );
}

export default App;
