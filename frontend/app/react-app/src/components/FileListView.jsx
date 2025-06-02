import React, { useState, useRef, useEffect } from 'react';
import { formatFileSize } from '../utils/func';
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

function FileListView({ 
    files, 
    selectedFiles,
    handleSelectFile,
    handleSelectAll,
    jumpDirectory, 
    downloadFiles, 
    displayFile, 
    Move, 
    deleteFile, 
    showDetail, 
    Permission 
}) {
    const [sortDirection, setSortDirection] = useState({ column: 'name', order: 'asc' });
    const headerCheckboxRef = useRef(null);

    const sortFilesByName = (a, b, sortDirection) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        if (a.isfile !== b.isfile) {
            return a.isfile ? 1 : -1;
        }
    
        if (sortDirection === 'asc') {
            return nameA.localeCompare(nameB);
        } else {
            return nameB.localeCompare(nameA);
        }
    };

    const sortFilesBySize = (a, b, sortDirection) => {
        if (a.isfile !== b.isfile) {
            return a.isfile ? 1 : -1;
        }
        if (sortDirection === 'asc') {
            return a.size - b.size;
        } else {
            return b.size - a.size;
        }
    };

    const sortFilesByUpdateDate = (a, b, sortDirection) => {
        if (a.isfile !== b.isfile) {
            return a.isfile ? 1 : -1;
        }
        if (sortDirection === 'asc') {
            return new Date(a.mtime_str) - new Date(b.mtime_str);
        } else {
            return new Date(b.mtime_str) - new Date(a.mtime_str);
        }

    }

    const sortedFiles = [...files].sort((a, b) => {
        if (sortDirection.column === 'name') {
            return sortFilesByName(a, b, sortDirection.order);
        } else if (sortDirection.column === 'size') {
            return sortFilesBySize(a, b, sortDirection.order);
        } else if (sortDirection.column === 'updatedate') {
            return sortFilesByUpdateDate(a, b, sortDirection.order);
        }
        return 0;
    });

    //  別ファイルにする
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
            // if (prevSort.column === column && prevSort.order === 'desc') {
            //     return {column:'null', order:null};
            // }
            return {
                column,
                order: prevSort.column === column && prevSort.order === 'asc' ? 'desc' : 'asc',
            };
        });
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

    const getSize = (filesize) => {
        return (<>{formatFileSize(filesize)}</>);
    }
  
    return (
        <div>
            <table className="file-table">
            <thead>
                <tr>
                <th>
                    <input type="checkbox"
                           className="form-check-input"
                           ref={headerCheckboxRef}
                           onChange={handleSelectAll}
                           checked={selectedFiles.length === files.length && files.length > 0} />
                </th>
                {/* <th onClick={() => toggleSortDirection('name')}></th> */}
                <th colSpan={2} onClick={() => toggleSortDirection('name')}>
                    Name {sortDirection.column === 'name' && getSortIcon()}
                </th>
                <th onClick={() => toggleSortDirection('size')}>
                    Size {sortDirection.column === 'size' && getSortIcon()}
                </th>
                <th onClick={() => toggleSortDirection('updatedate')}>
                    Updated Date {sortDirection.column === 'updatedate' && getSortIcon()}
                </th>
                <th></th>
                </tr>
            </thead>
            <tbody>
                {sortedFiles.map(file => (
                <tr key={file.path}>
                    <td>
                        <input type="checkbox"
                               className="form-check-input"
                               onChange={(event) => handleSelectFile(event, file)}
                               checked={selectedFiles.includes(file)} />
                    </td>
                    <td>{getFileIcon(file)}</td>
                    <td onClick={() => handleNameCick(file.path, file.isfile)}>{file.name}</td>
                    <td>{getSize(file.size)}</td>
                    <td>{file.mtime_str}</td>
                    <td>
                        <div className="dropdown">
                            <button type="button" className="btn p-0 border-0"
                               data-bs-toggle="dropdown" aria-expanded="false">
                                <BsThreeDots />
                            </button>
                            <ul className="dropdown-menu">
                                <li><button className="dropdown-item" onClick={() => showDetail(file.name, file.path)}>Detail</button></li>
                                {file.type === 'file' &&
                                    <li><button className="dropdown-item" onClick={() => displayFile(file.path)}>View</button></li>
                                }
                                <li><button className="dropdown-item" onClick={() => Move(file.path)}>Rename</button></li>
                                <li><button className="dropdown-item" onClick={() => Move(file.path)}>Move</button></li>
                                <li><button className="dropdown-item" onClick={() => Move(file.path)}>Copy</button></li>
                                <li><button className="dropdown-item" onClick={() => downloadFiles([file.path])}>Download</button></li>
                                <li><button className="dropdown-item" onClick={() => deleteFile(file)}>Delete</button></li>
                                <li><button className="dropdown-item" onClick={() => Permission(file.path)}>Change Permissions</button></li>
                            </ul>
                        </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
    );
}

export default FileListView;