import React, { useState, useRef, useEffect } from 'react';
import './css/App.css';
import Login from './Login';
import FileListView from './components/FileListView';
import CurrentDirView from './components/CurrentDirView';
import DetailView from './components/DetailView';
import ProgressView from './components/ProgressView';
import UploadDropZone from './components/UploadDropZone';
import UploadButton from './components/UploadButton';
import useFileList from './hooks/useFileList';
import upload from './utils/upload';
import download from './utils/download';
import displayFile from './utils/displayFile';
import deleteFile from './utils/deleteFile';
import moveFile from './utils/moveFile';
import getAttribute from './utils/getAttribute';
import setPermission from './utils/setPermission';
import { checkLoginStatus } from './utils/login';
import { createDir, removeDir } from './utils/dircommon';
import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Navbar from 'react-bootstrap/Navbar';

function App() {
    const [user, setUser] = useState(null);
    const [currentDir, setCurrentDir] = useState("");
    const [refreshKey, setRefreshKey] = useState(false);
    const { files, error } = useFileList(currentDir, refreshKey);
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
    };

    const downloadFile = async (filepath) => {
        console.log("downloadFile: filepath:", filepath);
        try {
            await download(filepath, setTasks);
        } catch (err) {
            console.error('Download failed:', err);
        }
        setTimeout(()=>{
            setTasks(prev => prev.filter(t => t.path !== filepath));
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
                const fullpath = currentDir + '/' + file.dirPath + file.name; // 現在位置が変わると違う場所にアップロードされてしまう
                await upload(currentDir, file, setTasks);
                setTimeout(()=>{
                    setTasks(prev => prev.filter(t => t.path !== fullpath));
                }, 10000);
            }
        };
        const workers = Array(concurrency).fill().map(worker);
        await Promise.all(workers);
        setIsUploading(false);
        setRefreshKey(prev => !prev);
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
                    <Navbar bg="dark" data-bs-theme="dark">
                        <Navbar.Collapse>
                            <UploadButton onUpload={addFilesToUpload} />
                        </Navbar.Collapse>
                    </Navbar>
                </Row>
                <Row>
                    <Col>
                        <FileListView 
                            files={files} 
                            jumpDirectory={jumpDirectory}
                            downloadFile={downloadFile}
                            showDetail={showDetail}
                            displayFile={displayFile}
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
