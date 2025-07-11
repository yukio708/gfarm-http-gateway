import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
import { useViewMode } from "../context/ViewModeContext";
import { useUserInfo } from "../context/UserInfoContext";
import "../css/FileListView.css";
import { BsArrowUpShort, BsArrowDownShort, BsListTask, BsGrid, BsHouse } from "react-icons/bs";
import PropTypes from "prop-types";

function ListView({
    sortedItems,
    selectedItems,
    activeItem,
    ItemMenuActions,
    handleItemClick,
    handleSelectItem,
}) {
    return (
        <>
            {sortedItems.map((item) => {
                const isSelected = selectedItems.some((selected) => selected.path === item.path);
                const isLastSelected = activeItem && activeItem.path === item.path;
                return (
                    <tr
                        key={item.path}
                        className={`align-middle ${isLastSelected ? "table-active" : ""}`}
                    >
                        <td>
                            <input
                                type="checkbox"
                                id={"checkbox-" + item.name}
                                className="form-check-input"
                                onChange={(event) => handleSelectItem(event.target.checked, item)}
                                checked={isSelected}
                            />
                        </td>
                        <td
                            onClick={() => handleSelectItem(!isSelected, item)}
                            onDoubleClick={() =>
                                handleItemClick(item.path, item.is_file, item.is_dir)
                            }
                        >
                            <span className="me-2">
                                <FileIcon
                                    filename={item.name}
                                    is_dir={item.is_dir}
                                    is_sym={item.is_sym}
                                    size={"1.8rem"}
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
                            {formatFileSize(item.size, item.is_dir)}
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
        </>
    );
}

function IconView({
    sortedItems,
    selectedItems,
    activeItem,
    ItemMenuActions,
    handleItemClick,
    handleSelectItem,
}) {
    return (
        <tr>
            <td colSpan="5">
                <div className="row row-cols-2 row-cols-md-4 row-cols-lg-6 g-3">
                    {sortedItems.map((item) => {
                        const isSelected = selectedItems.some(
                            (selected) => selected.path === item.path
                        );
                        const isLastSelected = activeItem && activeItem.path === item.path;

                        return (
                            <div
                                key={item.path}
                                className={`file-item position-relative ${isLastSelected ? "bg-primary-subtle" : ""}`}
                            >
                                <input
                                    type="checkbox"
                                    id={"checkbox-" + item.name}
                                    className="form-check-input position-absolute top-0 start-0 m-1"
                                    checked={isSelected}
                                    onChange={(e) => handleSelectItem(e.target.checked, item)}
                                />
                                <div
                                    className="file-icon text-center mt-2"
                                    onClick={() => handleSelectItem(!isSelected, item)}
                                    onDoubleClick={() =>
                                        handleItemClick(item.path, item.is_file, item.is_dir)
                                    }
                                >
                                    <FileIcon
                                        filename={item.name}
                                        is_dir={item.is_dir}
                                        is_sym={item.is_sym}
                                        size="3rem"
                                    />
                                </div>
                                <div className="file-name text-center mt-1">{item.name}</div>
                                <div
                                    className="text-muted text-center"
                                    style={{ fontSize: "0.8rem" }}
                                >
                                    {formatFileSize(item.size, item.is_dir)} |{" "}
                                    {getTimeStr(item.mtime)}
                                </div>
                                <div className="position-absolute bottom-0 end-0 m-1">
                                    <ItemMenu item={item} actions={ItemMenuActions} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </td>
        </tr>
    );
}

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
    const { viewMode, setViewMode } = useViewMode();
    const { userInfo } = useUserInfo();
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

    const getSortIcon = (col) => {
        if (sortDirection.column !== col) return null;
        return sortDirection.order === "asc" ? (
            <BsArrowUpShort size="1.1rem" className="ms-1" data-testid="sort-icon-asc" />
        ) : (
            <BsArrowDownShort size="1.1rem" className="ms-1" data-testid="sort-icon-desc" />
        );
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

    const handleSelectAll = useCallback(
        (event) => {
            if (event.target.checked) {
                setSelectedItems(sortedItems);
            } else {
                setSelectedItems([]);
            }
        },
        [setSelectedItems, sortedItems]
    );

    const handleSelectItem = useCallback(
        (checked, item) => {
            console.debug("handleSelectItem item", item);
            setSelectedItems((prev) => {
                if (checked) {
                    return [...prev, item];
                } else {
                    return prev.filter((selected) => selected.path !== item.path);
                }
            });
            setLastSelectedItem(item);
        },
        [setSelectedItems, setLastSelectedItem]
    );

    const toggleSortDirection = (column) => {
        setSortDirection((prevSort) => {
            return {
                column,
                order: prevSort.column === column && prevSort.order === "asc" ? "desc" : "asc",
            };
        });
    };

    return (
        <div>
            <div className="d-flex flex-wrap  mb-1">
                <button
                    className="btn btn-sm me-2"
                    type="button"
                    onClick={() => handleItemClick(userInfo.home_directory, false, true)}
                >
                    <BsHouse size={"1.1rem"} />
                </button>
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
            <table className={`table file-table ${viewMode === "list" ? "table-hover" : ""}`}>
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
                                id="header-checkbox"
                            />
                        </th>
                        {/* <th onClick={() => toggleSortDirection("name")}></th> */}
                        <th
                            colSpan={2}
                            onClick={() => toggleSortDirection("name")}
                            data-testid="header-name"
                        >
                            Name {getSortIcon("name")}
                        </th>
                        <th onClick={() => toggleSortDirection("size")} data-testid="header-size">
                            Size {getSortIcon("size")}
                        </th>
                        <th
                            onClick={() => toggleSortDirection("updatedate")}
                            data-testid="header-date"
                        >
                            Modified {getSortIcon("updatedate")}
                        </th>
                        <th onClick={() => setViewMode(viewMode === "list" ? "icon" : "list")}>
                            {viewMode === "list" ? <BsGrid /> : <BsListTask />}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {viewMode === "list" ? (
                        <ListView
                            sortedItems={sortedItems}
                            selectedItems={selectedItems}
                            activeItem={activeItem}
                            ItemMenuActions={ItemMenuActions}
                            handleItemClick={handleItemClick}
                            handleSelectItem={handleSelectItem}
                        />
                    ) : (
                        <IconView
                            sortedItems={sortedItems}
                            selectedItems={selectedItems}
                            activeItem={activeItem}
                            ItemMenuActions={ItemMenuActions}
                            handleItemClick={handleItemClick}
                            handleSelectItem={handleSelectItem}
                        />
                    )}
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

ListView.propTypes = {
    sortedItems: PropTypes.array,
    selectedItems: PropTypes.array,
    activeItem: PropTypes.object,
    ItemMenuActions: PropTypes.array,
    handleItemClick: PropTypes.func,
    handleSelectItem: PropTypes.func,
};

IconView.propTypes = {
    sortedItems: PropTypes.array,
    selectedItems: PropTypes.array,
    activeItem: PropTypes.object,
    ItemMenuActions: PropTypes.array,
    handleItemClick: PropTypes.func,
    handleSelectItem: PropTypes.func,
};
