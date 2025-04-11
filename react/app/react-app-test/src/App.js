import React, { useState, useRef, useEffect } from 'react';
import './css/App.css';
import FileListView from './components/FileListView';
import CurrentDirView from './components/CurrentDirView';
import DetailView from './components/DetailView';
import ProgressView from './components/ProgressView';
import UploadDropZone from './components/UploadDropZone';
import UploadConfirmModal from './components/UploadConfirmModal';
import useFileList from './hooks/useFileList';
import upload from './utils/upload';
import download from './utils/download';
import displayFile from './utils/displayFile';
import deleteFile from './utils/deleteFile';
import moveFile from './utils/moveFile';
import getAttribute from './utils/getAttribute';
import setPermission from './utils/setPermission';
import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

function App() {
    const [currentDir, setCurrentDir] = useState("/");
    const [refreshKey, setRefreshKey] = useState(false);
    const { files, loading, error } = useFileList(currentDir, refreshKey);
    const [detailContent, setDetailContent] = useState(null);
    const [progress, setProgress] = useState({value:0, textContent:""});
    const cancelRef = useRef(null);

    const jumpDirectory = (newdir) => {
        setCurrentDir(newdir);
    };

    const downloadFile = async (filepath) => {
        console.log("downloadFile: filepath:", filepath);
        try {
            await download(filepath, setProgress, cancelRef);
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    const uploadFiles = async (uploadfiles) => {
        try {
            for (const file of uploadfiles) {
                await upload(currentDir, file, setProgress, cancelRef);
            }
            setRefreshKey(prev => !prev);
        } catch (err) {
            console.error('Upload failed:', err);
        }
    };

    const handleCancel = () => {
        if(cancelRef.current) {
            cancelRef.current();
        };
        setProgress({value:0, textContent:""});
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
        setDetailContent(null);  // Clear file content when closing DetailView
    };


    return (
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
                {/* menu */}
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
            <UploadDropZone onUpload={uploadFiles}/>
            {progress.value > 0 && (
            <ProgressView 
                now={progress.value} label={progress.textContent} onCancel={handleCancel} />
            )}

        </Container>
        );
}

export default App;
