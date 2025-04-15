import React, { useState, useRef, useEffect } from 'react';
import './css/App.css';
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
import { createDir, removeDir } from './utils/dircommon';
import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Navbar from 'react-bootstrap/Navbar';

function App() {
    const [currentDir, setCurrentDir] = useState("");
    const [refreshKey, setRefreshKey] = useState(false);
    const { files, error } = useFileList(currentDir, refreshKey);
    const [detailContent, setDetailContent] = useState(null);
    const [tasks, setTasks] = useState([]);

    const jumpDirectory = (newdir) => {
        if (currentDir == newdir) {
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
            setTasks([]);
        }, 3000);
    };

    const uploadFiles = async (uploadfiles, concurrency = 3) => {
        const uploadQueue = [...uploadfiles];

        const worker = async () => {
            while (uploadQueue.length) {
                const file = uploadQueue.shift();
                await upload(currentDir, file, setTasks);
            }
        };
        const workers = Array(concurrency).fill().map(worker);
        await Promise.all(workers);
        setTimeout(()=>{
            setTasks([]);
            setRefreshKey(prev => !prev);
        }, 3000);
    };

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


    return (
        <div>
            <Container fluid className="App">
                <Row>
                    <header className="App-header">
                        <h1>Hello!</h1>
                    </header>
                </Row>
                <Row>
                    <CurrentDirView currentDir={currentDir} onNavigate={jumpDirectory}/>
                </Row>
                <Row>
                    <Navbar bg="dark" data-bs-theme="dark">
                        <Navbar.Collapse>
                            <UploadButton onUpload={uploadFiles} />
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
                    <UploadDropZone onUpload={uploadFiles}/>
                </Row>
                <ProgressView tasks={tasks} />

            </Container>
        </div>
        );
}

export default App;
