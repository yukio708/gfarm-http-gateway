import React, { useState, useRef, useEffect } from "react";
import FileIcon from "../components/FileIcon";
import FileTypeFilter from "../components/FileTypeFilter";
import DateFilter from "../components/DateFilter";
import { FileMenu } from "../components/FileActionMenu";
import {
    filterFiles,
    getFileTypes,
    sortFilesByName,
    sortFilesBySize,
    sortFilesByUpdateDate,
    formatFileSize,
} from "../utils/func";
import "../css/FileListView.css";
import { BsArrowUpShort, BsArrowDownShort } from "react-icons/bs";
import PropTypes from "prop-types";

function FileListView({
    currentFiles,
    selectedFiles,
    handleSelectFile,
    handleSelectAll,
    jumpDirectory,
    handleSym,
    download,
    display,
    move,
    remove,
    showDetail,
    permission,
}) {
    const [sortDirection, setSortDirection] = useState({ column: "name", order: "asc" });
    const [filterTypes, setFilterTypes] = useState("");
    const [dateFilter, setDateFilter] = useState("all");
    const headerCheckboxRef = useRef(null);
    const fileTypes = getFileTypes(currentFiles);
    const filteredFiles = filterFiles(currentFiles, filterTypes, dateFilter);

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
    }, [selectedFiles, currentFiles]);

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

    const handleNameCick = (filepath, is_file, is_sym, linkname, file) => {
        console.debug("handleNameCick", filepath, is_file, is_sym, linkname);
        console.debug("handleNameCick", file);
        if (is_file) {
            display(filepath);
        } else {
            if (is_sym) {
                handleSym(linkname);
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
                                checked={
                                    selectedFiles.length === currentFiles.length &&
                                    currentFiles.length > 0
                                }
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
                                    is_dir={file.is_dir}
                                    is_sym={file.is_sym}
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
                                        handleNameCick(
                                            file.path,
                                            file.is_file,
                                            file.is_sym,
                                            file.linkname
                                        )
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
                                    handleNameCick(
                                        file.path,
                                        file.is_file,
                                        file.is_sym,
                                        file.linkname
                                    )
                                }
                            >
                                {file.name}
                            </td>
                            <td>{getSize(file.size)}</td>
                            <td>{file.mtime_str}</td>
                            <td>
                                <FileMenu
                                    file={file}
                                    download={download}
                                    display={display}
                                    move={move}
                                    remove={remove}
                                    showDetail={showDetail}
                                    permission={permission}
                                />
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
    currentFiles: PropTypes.array,
    selectedFiles: PropTypes.array,
    handleSelectFile: PropTypes.func,
    handleSelectAll: PropTypes.func,
    jumpDirectory: PropTypes.func,
    handleSym: PropTypes.func,
    download: PropTypes.func,
    display: PropTypes.func,
    move: PropTypes.func,
    remove: PropTypes.func,
    showDetail: PropTypes.func,
    permission: PropTypes.func,
};
