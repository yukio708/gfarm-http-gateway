import React, { useState, useRef, useEffect } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/FileListView.css'
import { 
    BsFolder, 
    BsFileEarmark, 
    BsFileEarmarkPdf, 
    BsFileEarmarkImage, 
    BsFileEarmarkPlay, 
    BsFileEarmarkMusic, 
    BsFileEarmarkCode, 
    BsArrowUpShort, 
    BsArrowDownShort,
    BsThreeDots,
 } from 'react-icons/bs';

function FileListView({ files, jumpDirectory, downloadFile, displayFile, Move, Delete, showDetail, Permission }) {
    const filteredFiles = files.filter(file => file.name !== '.' && file.name !== '..');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [sortDirection, setSortDirection] = useState({ column: '', order: 'asc' });
    const headerCheckboxRef = useRef(null);

    const sortFilesByName = (a, b, sortDirection) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
    
        if (sortDirection === 'asc') {
            return nameA.localeCompare(nameB);
        } else {
            return nameB.localeCompare(nameA);
        }
    };

    const sortFilesBySize = (a, b, sortOrder) => {
        if (sortOrder === 'asc') {
            return a.size - b.size;
        } else {
            return b.size - a.size;
        }
    };

    const sortedFiles = [...filteredFiles].sort((a, b) => {
        if (sortDirection.column === 'name') {
            return sortFilesByName(a, b, sortDirection.order);
        } else if (sortDirection.column === 'size') {
            return sortFilesBySize(a, b, sortDirection.order);
        }
        return 0; // Default: no sorting
    });

    const getFileIcon = (file) => {
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (!file.isfile) {
            return <BsFolder />
        }

        switch (extension) {
            case 'pdf':
            return <BsFileEarmarkPdf />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            return <BsFileEarmarkImage />;
            case 'mp4':
            case 'webm':
            return <BsFileEarmarkPlay />;
            case 'mp3':
            case 'wav':
            return <BsFileEarmarkMusic />;
            case 'js':
            case 'py':
            case 'html':
            case 'css':
            return <BsFileEarmarkCode />;
            default:
            return <BsFileEarmark />; // Default file icon
        }
    };

    const getSortIcon = () => {
        if (sortDirection.order === 'asc') {
            return <BsArrowUpShort style={{ marginLeft: '5px' }} />;
        } else {
            return <BsArrowDownShort style={{ marginLeft: '5px' }} />;
        }
    };
    
    useEffect(() => {
        if (headerCheckboxRef.current) {
            if (selectedFiles.length === 0) {
                headerCheckboxRef.current.indeterminate = false;
                headerCheckboxRef.current.checked = false;
            } else if (selectedFiles.length === files.length) {
                headerCheckboxRef.current.indeterminate = false;
                headerCheckboxRef.current.checked = true;
            } else {
                headerCheckboxRef.current.indeterminate = true;
            }
        }
    }, [selectedFiles, files]);

    const toggleSortDirection = (column) => {
        setSortDirection((prevSort) => {
            if (prevSort.column === column && prevSort.order === 'desc') {
                return {column:'null', order:null};
            }
            return {
                column,
                order: prevSort.column === column && prevSort.order === 'asc' ? 'desc' : 'asc',
            };
        });
    };

    
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedFiles(files.map(file => file.path));
        } else {
            setSelectedFiles([]);
        }
    };

    const handleSelectFile = (event, filePath) => {
        if (event.target.checked) {
          setSelectedFiles([...selectedFiles, filePath]);
        } else {
          setSelectedFiles(selectedFiles.filter(path => path !== filePath));
        }
    };

    const handleNameCick = (filepath, isfile) => {
        if(isfile) {
            displayFile(filepath)
        }
        else{
            console.log("handleNameCick: filepath", filepath);
            jumpDirectory(filepath);
        }
    };

    const formatFileSize = (filesize) => {
        if (filesize === 0) {
            return (<></>);
        }
    
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(filesize) / Math.log(k));
    
        const sizestr =  parseFloat((filesize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        return (
            <>{sizestr}</>
        )
    }
  
    return (
        <div>
            <table className="file-table">
            <thead>
                <tr>
                <th>
                    <Form.Check type='checkbox' 
                                ref={headerCheckboxRef}
                                onChange={handleSelectAll} 
                                checked={selectedFiles.length === files.length && files.length > 0} />
                </th>
                <th colSpan={2} onClick={() => toggleSortDirection('name')} style={{ cursor: 'pointer' }}>
                    Name {sortDirection.column === 'name' && getSortIcon()}
                </th>
                <th onClick={() => toggleSortDirection('size')}>
                    Size {sortDirection.column === 'size' && getSortIcon()}
                </th>
                <th>Updated Date</th>
                <th></th>
                </tr>
            </thead>
            <tbody>
                {sortedFiles.map(file => (
                <tr key={file.path}>
                    <td>
                        <Form.Check type='checkbox' 
                                    onChange={(event) => handleSelectFile(event, file.path)}
                                    checked={selectedFiles.includes(file.path)}/>
                    </td>
                    <td>{getFileIcon(file)}</td>
                    <td onClick={() => handleNameCick(file.path, file.isfile)}>{file.name}</td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>{file.mtime_str}</td>
                    <td>
                    <Dropdown>
                        <Dropdown.Toggle variant="success" id="dropdown-basic" as={BsThreeDots} />
                        <Dropdown.Menu>
                        <Dropdown.Item onClick={() => showDetail(file.name, file.path)}>Detail</Dropdown.Item>
                        {file.type === 'file' &&
                        <Dropdown.Item onClick={() => displayFile(file.path) }>View</Dropdown.Item>
                        }
                        <Dropdown.Item onClick={() => Move(file.path)}>Rename</Dropdown.Item>
                        <Dropdown.Item onClick={() => Move(file.path)}>Move</Dropdown.Item>
                        <Dropdown.Item onClick={() => Move(file.path)}>Copy</Dropdown.Item>
                        <Dropdown.Item onClick={() => downloadFile(file.path)}>Download</Dropdown.Item>
                        <Dropdown.Item onClick={() => Delete(file.path)}>Delete</Dropdown.Item>
                        <Dropdown.Item onClick={() => Permission(file.path)}>Change Permissions</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
    );
}

export default FileListView;