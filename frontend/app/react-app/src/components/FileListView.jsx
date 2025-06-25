import React, { useState, useRef, useEffect } from "react";
import FileIcon from "../components/FileIcon";
import FileTypeFilter from "../components/FileTypeFilter";
import DateFilter from "../components/DateFilter";
import { ItemMenu } from "../components/FileActionMenu";
import {
    filterItems,
    getFileTypes,
    sortItemsByName,
    sortItemsBySize,
    sortItemsByUpdateDate,
    formatFileSize,
} from "../utils/func";
import "../css/FileListView.css";
import { BsArrowUpShort, BsArrowDownShort } from "react-icons/bs";
import PropTypes from "prop-types";

function FileListView({
    currentItems,
    selectedItems,
    handleSelectItem,
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
    const fileTypes = getFileTypes(currentItems);
    const filteredItems = filterItems(currentItems, filterTypes, dateFilter);

    const sortedItems = [...filteredItems].sort((a, b) => {
        if (sortDirection.column === "name") {
            return sortItemsByName(a, b, sortDirection.order);
        } else if (sortDirection.column === "size") {
            return sortItemsBySize(a, b, sortDirection.order);
        } else if (sortDirection.column === "updatedate") {
            return sortItemsByUpdateDate(a, b, sortDirection.order);
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
            if (selectedItems.length === 0) {
                headerCheckboxRef.current.indeterminate = false;
                headerCheckboxRef.current.checked = false;
            } else if (selectedItems.length === filteredItems.length) {
                headerCheckboxRef.current.indeterminate = false;
                headerCheckboxRef.current.checked = true;
            } else {
                headerCheckboxRef.current.indeterminate = true;
            }
        }
    }, [selectedItems, currentItems]);

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

    const handleNameCick = (path, is_file, is_dir) => {
        if (is_file) {
            display(path);
        } else if (is_dir) {
            jumpDirectory(path);
        } else {
            handleSym(path);
        }
    };

    const getSize = (filesize, is_dir) => {
        return <>{formatFileSize(filesize, is_dir)}</>;
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
                                    selectedItems.length === currentItems.length &&
                                    currentItems.length > 0
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
                    {sortedItems.map((item) => (
                        <tr key={item.path}>
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id={"checkbox-" + item.name}
                                    onChange={(event) => handleSelectItem(event, item)}
                                    checked={selectedItems.includes(item)}
                                />
                            </td>
                            <td>
                                <FileIcon
                                    filename={item.name}
                                    is_dir={item.is_dir}
                                    is_sym={item.is_sym}
                                    size={"1.8rem"}
                                    onClick={() =>
                                        handleSelectItem(
                                            {
                                                target: { checked: !selectedItems.includes(item) },
                                            },
                                            item
                                        )
                                    }
                                    onDoubleClick={() =>
                                        handleNameCick(item.path, item.is_file, item.is_dir)
                                    }
                                />
                            </td>
                            <td
                                onClick={() =>
                                    handleSelectItem(
                                        {
                                            target: { checked: !selectedItems.includes(item) },
                                        },
                                        item
                                    )
                                }
                                onDoubleClick={() =>
                                    handleNameCick(item.path, item.is_file, item.is_dir)
                                }
                            >
                                {item.name}
                            </td>
                            <td>{getSize(item.size, item.is_dir)}</td>
                            <td>{item.mtime_str}</td>
                            <td>
                                <ItemMenu
                                    item={item}
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
    currentItems: PropTypes.array,
    selectedItems: PropTypes.array,
    handleSelectItem: PropTypes.func,
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
