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
    getTimeStr,
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
    activeItem,
    setLastSelectedItem,
    ItemMenuActions,
    UploadMenuActions,
    SelectedMenuActions,
    handleItemClick,
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
                    {selectedItems.length === 0 && (
                        <UploadMenu
                            actions={UploadMenuActions}
                            uploadDir={currentDir}
                            currentItems={currentItems}
                        />
                    )}
                    <FileActionMenu selectedItems={selectedItems} actions={SelectedMenuActions} />
                </div>
            </div>
            <table className="table table-hover file-table">
                <thead style={{ position: "sticky", top: 0 }}>
                    <tr>
                        <th className="align-middle">
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
                    {sortedItems.map((item) => {
                        const isSelected = selectedItems.some(
                            (selected) => selected.path === item.path
                        );
                        const isLastSelected = activeItem && activeItem.path === item.path;
                        return (
                            <tr
                                key={item.path}
                                className={`align-middle ${isLastSelected ? "table-active" : ""}`}
                            >
                                <td>
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id={"checkbox-" + item.name}
                                        onChange={(event) =>
                                            handleSelectItem(event.target.checked, item)
                                        }
                                        checked={isSelected}
                                    />
                                </td>
                                <td>
                                    <span className="me-2">
                                        <FileIcon
                                            filename={item.name}
                                            is_dir={item.is_dir}
                                            is_sym={item.is_sym}
                                            size={"1.8rem"}
                                            onClick={() => handleSelectItem(!isSelected, item)}
                                            onDoubleClick={() =>
                                                handleItemClick(
                                                    item.path,
                                                    item.is_file,
                                                    item.is_dir
                                                )
                                            }
                                        />
                                    </span>
                                </td>
                                <td
                                    onClick={() => handleSelectItem(!isSelected, item)}
                                    onDoubleClick={() =>
                                        handleItemClick(item.path, item.is_file, item.is_dir)
                                    }
                                >
                                    {item.name}
                                </td>
                                <td
                                    onClick={() => handleSelectItem(!isSelected, item)}
                                    onDoubleClick={() =>
                                        handleItemClick(item.path, item.is_file, item.is_dir)
                                    }
                                >
                                    {getSize(item.size, item.is_dir)}
                                </td>
                                <td
                                    onClick={() => handleSelectItem(!isSelected, item)}
                                    onDoubleClick={() =>
                                        handleItemClick(item.path, item.is_file, item.is_dir)
                                    }
                                >
                                    {getTimeStr(item.mtime)}
                                </td>
                                <td>
                                    <ItemMenu item={item} actions={ItemMenuActions} />
                                </td>
                            </tr>
                        );
                    })}
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
    activeItem: PropTypes.object,
    setLastSelectedItem: PropTypes.func,
    ItemMenuActions: PropTypes.array,
    UploadMenuActions: PropTypes.array,
    SelectedMenuActions: PropTypes.array,
    handleItemClick: PropTypes.func,
};
