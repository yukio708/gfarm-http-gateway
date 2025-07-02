import React, { useState, useRef, useEffect, useMemo } from "react";
import FileIcon from "../components/FileIcon";
import FileTypeFilter from "../components/FileTypeFilter";
import DateFilter from "../components/DateFilter";
import UploadMenu from "../components/UploadMenu";
import { ItemMenu, FileActionMenu } from "../components/FileActionMenu";
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
    parentName,
    currentDir,
    currentItems,
    selectedItems,
    setSelectedItems,
    setLastSelectedItem,
    handleItemClick,
    download,
    upload,
    display,
    move,
    rename,
    remove,
    showDetail,
    permission,
    share,
    gfptar,
    createNewDir,
}) {
    const [sortDirection, setSortDirection] = useState({ column: "name", order: "asc" });
    const [filterTypes, setFilterTypes] = useState("");
    const [dateFilter, setDateFilter] = useState("all");
    const headerCheckboxRef = useRef(null);
    const fileTypes = getFileTypes(currentItems);
    const filteredItems = useMemo(
        () => filterItems(currentItems, filterTypes, dateFilter),
        [currentItems, filterTypes, dateFilter]
    );
    const sortedItems = useMemo(
        () =>
            [...filteredItems].sort((a, b) => {
                if (sortDirection.column === "name") {
                    return sortItemsByName(a, b, sortDirection.order);
                } else if (sortDirection.column === "size") {
                    return sortItemsBySize(a, b, sortDirection.order);
                } else if (sortDirection.column === "updatedate") {
                    return sortItemsByUpdateDate(a, b, sortDirection.order);
                }
                return 0;
            }),
        [filteredItems, sortDirection]
    );

    useEffect(() => {
        setSelectedItems([]);
    }, [filterTypes, dateFilter]);

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
            } else if (selectedItems.length === sortedItems.length) {
                headerCheckboxRef.current.indeterminate = false;
                headerCheckboxRef.current.checked = true;
            } else {
                headerCheckboxRef.current.indeterminate = true;
            }
        }
    }, [selectedItems, sortedItems]);

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedItems(sortedItems);
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (checked, item) => {
        console.debug("handleSelectItem item", item);
        if (checked) {
            setSelectedItems([...selectedItems, item]);
        } else {
            setSelectedItems((prev) => prev.filter((selected) => selected.path !== item.path));
        }
        setLastSelectedItem(item);
    };

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

    const getSize = (filesize, is_dir) => {
        return <>{formatFileSize(filesize, is_dir)}</>;
    };

    return (
        <div>
            <div className="d-flex flex-wrap  mb-1">
                <div className="btn-group me-4" role="group">
                    <FileTypeFilter
                        parentName={parentName}
                        fileTypes={fileTypes}
                        filterTypes={filterTypes}
                        setFilterTypes={setFilterTypes}
                    />
                    <DateFilter dateFilter={dateFilter} setDateFilter={setDateFilter} />
                </div>

                <div className="d-flex gap-2">
                    <UploadMenu
                        onUpload={upload}
                        onCreate={createNewDir}
                        uploadDir={currentDir}
                        currentItems={currentItems}
                    />
                    <FileActionMenu
                        selectedItems={selectedItems}
                        removeItems={remove}
                        downloadItems={download}
                        moveItems={move}
                        archiveItems={gfptar}
                    />
                </div>
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
                                    selectedItems.length === sortedItems.length &&
                                    sortedItems.length > 0
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
                                    onChange={(event) =>
                                        handleSelectItem(event.target.checked, item)
                                    }
                                    checked={selectedItems.some(
                                        (selected) => selected.path === item.path
                                    )}
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
                                            !selectedItems.some(
                                                (selected) => selected.path === item.path
                                            ),
                                            item
                                        )
                                    }
                                    onDoubleClick={() =>
                                        handleItemClick(item.path, item.is_file, item.is_dir)
                                    }
                                />
                            </td>
                            <td
                                onClick={() =>
                                    handleSelectItem(
                                        !selectedItems.some(
                                            (selected) => selected.path === item.path
                                        ),
                                        item
                                    )
                                }
                                onDoubleClick={() =>
                                    handleItemClick(item.path, item.is_file, item.is_dir)
                                }
                            >
                                {item.name}
                            </td>
                            <td
                                onClick={() =>
                                    handleSelectItem(
                                        !selectedItems.some(
                                            (selected) => selected.path === item.path
                                        ),
                                        item
                                    )
                                }
                                onDoubleClick={() =>
                                    handleItemClick(item.path, item.is_file, item.is_dir)
                                }
                            >
                                {getSize(item.size, item.is_dir)}
                            </td>
                            <td
                                onClick={() =>
                                    handleSelectItem(
                                        !selectedItems.some(
                                            (selected) => selected.path === item.path
                                        ),
                                        item
                                    )
                                }
                                onDoubleClick={() =>
                                    handleItemClick(item.path, item.is_file, item.is_dir)
                                }
                            >
                                {item.mtime_str}
                            </td>
                            <td>
                                <ItemMenu
                                    item={item}
                                    download={download}
                                    display={display}
                                    move={move}
                                    rename={rename}
                                    remove={remove}
                                    showDetail={showDetail}
                                    permission={permission}
                                    share={share}
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
    parentName: PropTypes.string,
    currentDir: PropTypes.string,
    currentItems: PropTypes.array,
    selectedItems: PropTypes.array,
    setSelectedItems: PropTypes.func,
    setLastSelectedItem: PropTypes.func,
    handleItemClick: PropTypes.func,
    download: PropTypes.func,
    upload: PropTypes.func,
    display: PropTypes.func,
    move: PropTypes.func,
    rename: PropTypes.func,
    remove: PropTypes.func,
    showDetail: PropTypes.func,
    permission: PropTypes.func,
    share: PropTypes.func,
    gfptar: PropTypes.func,
    createNewDir: PropTypes.func,
};
