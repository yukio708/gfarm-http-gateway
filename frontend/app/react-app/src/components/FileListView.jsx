import React, { useState, useRef, useEffect } from "react";
import FileTypeFilter from "../components/FileTypeFilter";
import FileIcon from "../components/FileIcon";
import { getIconCSS } from "../utils/getFileCategory";
import { formatFileSize, loadExternalCss } from "../utils/func";
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
    const headerCheckboxRef = useRef(null);

    useEffect(() => {
        const loadCSS = async () => {
            const css = await getIconCSS();
            loadExternalCss(css);
        };
        loadCSS();
    }, []);

    const getFileTypes = (files) => {
        const types = new Set();

        files.forEach((file) => {
            if (file.type === "directory") {
                types.add("folder");
            } else {
                const parts = file.name.split(".");
                if (parts.length > 1) {
                    types.add(parts.pop().toLowerCase());
                }
            }
        });

        return Array.from(types);
    };

    const fileTypes = getFileTypes(files);

    const sortFilesByName = (a, b, sortDirection) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }

        if (sortDirection === "asc") {
            return nameA.localeCompare(nameB);
        } else {
            return nameB.localeCompare(nameA);
        }
    };

    const sortFilesBySize = (a, b, sortDirection) => {
        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        if (sortDirection === "asc") {
            return a.size - b.size;
        } else {
            return b.size - a.size;
        }
    };

    const sortFilesByUpdateDate = (a, b, sortDirection) => {
        if (a.is_file !== b.is_file) {
            return a.is_file ? 1 : -1;
        }
        if (sortDirection === "asc") {
            return new Date(a.mtime_str) - new Date(b.mtime_str);
        } else {
            return new Date(b.mtime_str) - new Date(a.mtime_str);
        }
    };

    const filteredFiles = files.filter((file) => {
        if (filterTypes.length === 0) return true;

        if (filterTypes.includes("folder") && file.type === "directory") return true;

        const ext = file.name.split(".").pop().toLowerCase();
        return filterTypes.includes(ext);
    });

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
            return <BsArrowUpShort size="1.1rem" style={{ marginLeft: "5px" }} />;
        } else {
            return <BsArrowDownShort size="1.1rem" style={{ marginLeft: "5px" }} />;
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
            <FileTypeFilter
                fileTypes={fileTypes}
                filterTypes={filterTypes}
                setFilterTypes={setFilterTypes}
            />
            <table className="file-table">
                <thead>
                    <tr>
                        <th>
                            <input
                                type="checkbox"
                                className="form-check-input"
                                ref={headerCheckboxRef}
                                onChange={handleSelectAll}
                                checked={selectedFiles.length === files.length && files.length > 0}
                            />
                        </th>
                        {/* <th onClick={() => toggleSortDirection('name')}></th> */}
                        <th colSpan={2} onClick={() => toggleSortDirection("name")}>
                            Name {sortDirection.column === "name" && getSortIcon()}
                        </th>
                        <th onClick={() => toggleSortDirection("size")}>
                            Size {sortDirection.column === "size" && getSortIcon()}
                        </th>
                        <th onClick={() => toggleSortDirection("updatedate")}>
                            Updated Date {sortDirection.column === "updatedate" && getSortIcon()}
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
                                    onChange={(event) => handleSelectFile(event, file)}
                                    checked={selectedFiles.includes(file)}
                                />
                            </td>
                            <td>
                                <FileIcon
                                    filename={file.name}
                                    is_file={file.is_file}
                                    size={"1.8rem"}
                                />
                            </td>
                            <td
                                onClick={() =>
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
                                        {file.type === "file" && (
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
