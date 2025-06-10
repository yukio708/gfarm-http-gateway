import React, { useState, useRef, useEffect } from "react";
import FileIcon from "../components/FileIcon";
import FileTypeFilter from "../components/FileTypeFilter";
import DateFilter from "../components/DateFilter";
import {
    filterFiles,
    getFileTypes,
    sortFilesByName,
    sortFilesBySize,
    sortFilesByUpdateDate,
    formatFileSize,
} from "../utils/func";
import "../css/FileListView.css";
import { BsArrowUpShort, BsArrowDownShort, BsThreeDots } from "react-icons/bs";
import PropTypes from "prop-types";

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
    Permission,
}) {
    const [sortDirection, setSortDirection] = useState({ column: "name", order: "asc" });
    const [filterTypes, setFilterTypes] = useState("");
    const [dateFilter, setDateFilter] = useState("all");
    const headerCheckboxRef = useRef(null);
    const fileTypes = getFileTypes(files);
    const filteredFiles = filterFiles(files, filterTypes, dateFilter);

    const sortedFiles = [...filteredFiles].sort((a, b) => {
        if (sortDirection.column === "name") {
            return sortFilesByName(a, b, sortDirection.order);
        } else if (sortDirection.column === "size") {
            return sortFilesBySize(a, b, sortDirection.order);
        } else if (sortDirection.column === "updatedate") {
            return sortFilesByUpdateDate(a, b, sortDirection.order);
        }
        return 0;
    });

    const getSortIcon = () => {
        if (sortDirection.order === "asc") {
            return (
                <BsArrowUpShort
                    size="1.1rem"
                    style={{ marginLeft: "5px" }}
                    data-testid="sort-icon-asc"
                />
            );
        } else {
            return (
                <BsArrowDownShort
                    size="1.1rem"
                    style={{ marginLeft: "5px" }}
                    data-testid="sort-icon-desc"
                />
            );
        }
    };

    useEffect(() => {
        if (headerCheckboxRef.current) {
            if (selectedFiles.length === 0) {
                headerCheckboxRef.current.indeterminate = false;
                headerCheckboxRef.current.checked = false;
            } else if (selectedFiles.length === filteredFiles.length) {
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
                order: prevSort.column === column && prevSort.order === "asc" ? "desc" : "asc",
            };
        });
    };

    const handleNameCick = (filepath, is_file, symlink) => {
        if (is_file) {
            displayFile(filepath);
        } else {
            if (symlink) {
                jumpDirectory(symlink);
            } else {
                jumpDirectory(filepath);
            }
        }
    };

    const getSize = (filesize) => {
        return <>{formatFileSize(filesize)}</>;
    };

    return (
        <div>
            <div className="d-flex flex-wrap align-items-center gap-2 m-2">
                <FileTypeFilter
                    fileTypes={fileTypes}
                    filterTypes={filterTypes}
                    setFilterTypes={setFilterTypes}
                />
                <DateFilter dateFilter={dateFilter} setDateFilter={setDateFilter} />
            </div>
            <table className="file-table">
                <thead style={{ position: "sticky", top: 0 }}>
                    <tr>
                        <th>
                            <input
                                type="checkbox"
                                className="form-check-input"
                                ref={headerCheckboxRef}
                                onChange={handleSelectAll}
                                checked={selectedFiles.length === files.length && files.length > 0}
                                data-testid="header-checkbox"
                            />
                        </th>
                        {/* <th onClick={() => toggleSortDirection("name")}></th> */}
                        <th
                            colSpan={2}
                            onClick={() => toggleSortDirection("name")}
                            data-testid="header-name"
                        >
                            Name {sortDirection.column === "name" && getSortIcon()}
                        </th>
                        <th onClick={() => toggleSortDirection("size")} data-testid="header-size">
                            Size {sortDirection.column === "size" && getSortIcon()}
                        </th>
                        <th
                            onClick={() => toggleSortDirection("updatedate")}
                            data-testid="header-date"
                        >
                            Modified {sortDirection.column === "updatedate" && getSortIcon()}
                        </th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {sortedFiles.map((file) => (
                        <tr key={file.path}>
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id={"checkbox-" + file.name}
                                    onChange={(event) => handleSelectFile(event, file)}
                                    checked={selectedFiles.includes(file)}
                                />
                            </td>
                            <td>
                                <FileIcon
                                    filename={file.name}
                                    is_file={file.is_file}
                                    size={"1.8rem"}
                                    onClick={() =>
                                        handleSelectFile(
                                            {
                                                target: { checked: !selectedFiles.includes(file) },
                                            },
                                            file
                                        )
                                    }
                                    onDoubleClick={() =>
                                        handleNameCick(file.path, file.is_file, file.symlink)
                                    }
                                />
                            </td>
                            <td
                                onClick={() =>
                                    handleSelectFile(
                                        {
                                            target: { checked: !selectedFiles.includes(file) },
                                        },
                                        file
                                    )
                                }
                                onDoubleClick={() =>
                                    handleNameCick(file.path, file.is_file, file.symlink)
                                }
                            >
                                {file.name}
                            </td>
                            <td>{getSize(file.size)}</td>
                            <td>{file.mtime_str}</td>
                            <td>
                                <div className="dropdown">
                                    <button
                                        type="button"
                                        className="btn p-0 border-0"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        <BsThreeDots />
                                    </button>
                                    <ul className="dropdown-menu">
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                onClick={() => showDetail(file.name, file.path)}
                                            >
                                                Detail
                                            </button>
                                        </li>
                                        {file.is_file && (
                                            <li>
                                                <button
                                                    className="dropdown-item"
                                                    onClick={() => displayFile(file.path)}
                                                >
                                                    View
                                                </button>
                                            </li>
                                        )}
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                onClick={() => Move(file.path)}
                                            >
                                                Rename
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                onClick={() => Move(file.path)}
                                            >
                                                Move
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                onClick={() => Move(file.path)}
                                            >
                                                Copy
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                onClick={() => downloadFiles([file.path])}
                                            >
                                                Download
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                onClick={() => deleteFile(file)}
                                            >
                                                Delete
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                onClick={() => Permission(file.path)}
                                            >
                                                Change Permissions
                                            </button>
                                        </li>
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

FileListView.propTypes = {
    files: PropTypes.array,
    selectedFiles: PropTypes.array,
    handleSelectFile: PropTypes.func,
    handleSelectAll: PropTypes.func,
    jumpDirectory: PropTypes.func,
    downloadFiles: PropTypes.func,
    displayFile: PropTypes.func,
    Move: PropTypes.func,
    deleteFile: PropTypes.func,
    showDetail: PropTypes.func,
    Permission: PropTypes.func,
};
