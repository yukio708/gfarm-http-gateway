import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import FileIcon from "../components/FileIcon";
import FileTypeFilter from "../components/FileTypeFilter";
import DateFilter from "../components/DateFilter";
import UploadMenu from "../components/UploadMenu";
import { ItemMenu, FileActionMenu, ContextMenu } from "../components/FileActionMenu";
import {
    filterItems,
    getFileTypes,
    sortItemsByName,
    sortItemsBySize,
    sortItemsByUpdateDate,
    formatFileSize,
    getTimeStr,
    hasTouchScreen,
} from "../utils/func";
import { useViewMode } from "../context/ViewModeContext";
import { useUserInfo } from "../context/UserInfoContext";
import { useDateFormat } from "../context/DateFormatContext";
import "../css/FileListView.css";
import {
    BsArrowUpShort,
    BsArrowDownShort,
    BsListTask,
    BsGridFill,
    BsGrid3X3GapFill,
    BsHouse,
} from "react-icons/bs";
import PropTypes from "prop-types";

function SortDropDownMenu({ sortDirection, setSortDirection }) {
    const changeSortDirection = ({ column, order }) => {
        setSortDirection((prevSort) => {
            return {
                column: column ?? prevSort.column,
                order: order ?? prevSort.order,
            };
        });
    };

    const getSortIcon = (col) => {
        if (sortDirection.column !== col) return null;
        return sortDirection.order === "asc" ? (
            <BsArrowUpShort size="1.1rem" className="ms-1" data-testid="sort-icon-asc" />
        ) : (
            <BsArrowDownShort size="1.1rem" className="ms-1" data-testid="sort-icon-desc" />
        );
    };

    return (
        <div className="dropdown">
            <button
                className="btn btn-sm dropdown-toggle fw-bold"
                type="button"
                id="action-menu-dropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                data-testid="sort-menu-dropdown"
            >
                Sort by {sortDirection.column}
                {getSortIcon(sortDirection.column)}
            </button>
            <ul className="dropdown-menu" aria-labelledby="action-menu-dropdown">
                <li className="text-muted">
                    <h1 className="dropdown-header">Sort by</h1>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => changeSortDirection({ column: "Name" })}
                        data-testid="action-menu-download-sm"
                    >
                        Name
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => changeSortDirection({ column: "Size" })}
                        data-testid="action-menu-delete-sm"
                    >
                        Size
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => changeSortDirection({ column: "Modified" })}
                        data-testid="action-menu-move-sm"
                    >
                        Modified
                    </button>
                </li>
                <li>
                    <hr className="dropdown-divider" />
                </li>
                <li className="text-muted">
                    <h1 className="dropdown-header">Order</h1>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => changeSortDirection({ order: "asc" })}
                        data-testid="action-menu-gfptar-sm"
                    >
                        Asc
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => changeSortDirection({ order: "desc" })}
                        data-testid="action-menu-gfptar-sm"
                    >
                        Desc
                    </button>
                </li>
            </ul>
        </div>
    );
}

function ListView({
    sortedItems,
    selectedItems,
    active,
    lastSelectedItem,
    ItemMenuActions,
    handleDoubleClick,
    handleClick,
    handleSelectItem,
    handleSelectAll,
    sortDirection,
    setSortDirection,
    setContextMenu,
}) {
    const headerCheckboxRef = useRef(null);
    const { viewMode, setViewMode } = useViewMode();
    const { dateFormat } = useDateFormat();

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

    const toggleSortDirection = (column) => {
        setSortDirection((prevSort) => {
            return {
                column,
                order: prevSort.column === column && prevSort.order === "asc" ? "desc" : "asc",
            };
        });
    };

    const toggleViewMode = (mode) => {
        if (mode === "list") {
            return "icon_rg";
        } else if (mode === "icon_rg") {
            return "icon_sm";
        } else {
            return "list";
        }
    };

    const toggleViewModeIcon = (mode) => {
        if (mode === "list") {
            return <BsGridFill />;
        } else if (mode === "icon_rg") {
            return <BsGrid3X3GapFill />;
        } else {
            return <BsListTask />;
        }
    };

    const getSortIcon = (col) => {
        if (sortDirection.column !== col) return null;
        return sortDirection.order === "asc" ? (
            <BsArrowUpShort size="1.1rem" className="ms-1" data-testid="sort-icon-asc" />
        ) : (
            <BsArrowDownShort size="1.1rem" className="ms-1" data-testid="sort-icon-desc" />
        );
    };

    return (
        <>
            <div className="d-none d-sm-block">
                <table className="table file-table table-hover">
                    <thead className="bg-body sticky-top">
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
                                    data-testid="header-checkbox"
                                />
                            </th>
                            {/* <th onClick={() => toggleSortDirection("name")}></th> */}
                            <th
                                className="text-nowrap"
                                colSpan={2}
                                onClick={() => toggleSortDirection("Name")}
                                data-testid="header-name"
                            >
                                Name {getSortIcon("Name")}
                            </th>
                            <th
                                className="text-nowrap"
                                onClick={() => toggleSortDirection("Size")}
                                data-testid="header-size"
                            >
                                Size {getSortIcon("Size")}
                            </th>
                            <th
                                className="text-nowrap"
                                onClick={() => toggleSortDirection("Modified")}
                                data-testid="header-date"
                            >
                                Modified {getSortIcon("Modified")}
                            </th>
                            <th
                                onClick={() => setViewMode(toggleViewMode(viewMode))}
                                data-testid="header-viewmode"
                            >
                                {toggleViewModeIcon(viewMode)}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((item) => {
                            const isSelected = selectedItems.some(
                                (selected) => selected.path === item.path
                            );
                            const isLastSelected = active && lastSelectedItem?.path === item.path;
                            return (
                                <tr
                                    key={item.path}
                                    className={`align-middle ${isLastSelected ? "table-active" : ""}`}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setContextMenu({
                                            show: true,
                                            x: e.pageX,
                                            y: e.pageY,
                                            item,
                                        });
                                    }}
                                >
                                    <td>
                                        <input
                                            type="checkbox"
                                            id={"checkbox-" + item.name}
                                            className="form-check-input"
                                            onChange={(event) =>
                                                handleSelectItem(event.target.checked, item)
                                            }
                                            checked={isSelected}
                                        />
                                    </td>
                                    <td
                                        onClick={() => handleClick(!isSelected, item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
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
                                        onClick={() => handleClick(!isSelected, item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
                                    >
                                        <div className="text-break">{item.name}</div>
                                    </td>
                                    <td
                                        onClick={() => handleClick(!isSelected, item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
                                    >
                                        {formatFileSize(item.size, item.is_dir)}
                                    </td>
                                    <td
                                        onClick={() => handleClick(!isSelected, item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
                                    >
                                        {getTimeStr(item.mtime, dateFormat)}
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

            <div className="d-block d-sm-none">
                <table className="table file-table table-hover">
                    <thead className="bg-body sticky-top">
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
                                    id="header-checkbox-sm"
                                    data-testid="header-checkbox-sm"
                                />
                            </th>
                            <th data-testid="header-name-sm">
                                <SortDropDownMenu
                                    sortDirection={sortDirection}
                                    setSortDirection={setSortDirection}
                                />
                            </th>
                            <th
                                onClick={() => setViewMode(toggleViewMode(viewMode))}
                                data-testid="header-viewmode-sm"
                            >
                                {toggleViewModeIcon(viewMode)}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((item) => {
                            const isSelected = selectedItems.some(
                                (selected) => selected.path === item.path
                            );
                            const isLastSelected = active && lastSelectedItem?.path === item.path;
                            return (
                                <tr
                                    key={item.path}
                                    className={`align-middle ${isLastSelected ? "table-active" : ""}`}
                                >
                                    <td>
                                        <input
                                            type="checkbox"
                                            id={"checkbox-" + item.name + "-sm"}
                                            className="form-check-input"
                                            onChange={(event) =>
                                                handleSelectItem(event.target.checked, item)
                                            }
                                            checked={isSelected}
                                        />
                                    </td>
                                    <td
                                        onClick={() => handleClick(!isSelected, item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
                                    >
                                        <div className="d-flex">
                                            <span className="me-2">
                                                <FileIcon
                                                    filename={item.name}
                                                    is_dir={item.is_dir}
                                                    is_sym={item.is_sym}
                                                    size={"1.8rem"}
                                                />
                                            </span>
                                            <div>
                                                <div className="text-break">{item.name}</div>
                                                <div className="small-info">
                                                    <div
                                                        className="text-muted"
                                                        style={{ fontSize: "0.8rem" }}
                                                    >
                                                        {formatFileSize(item.size, item.is_dir)}
                                                        {item.is_dir ? " " : " | "}
                                                        {getTimeStr(item.mtime, dateFormat)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
        </>
    );
}

function IconView({
    sortedItems,
    selectedItems,
    active,
    lastSelectedItem,
    ItemMenuActions,
    handleDoubleClick,
    handleClick,
    handleSelectItem,
    iconSize,
    handleSelectAll,
    sortDirection,
    setSortDirection,
    setContextMenu,
}) {
    const headerCheckboxRef = useRef(null);
    const { viewMode, setViewMode } = useViewMode();
    const { dateFormat } = useDateFormat();
    let iconPixelSize = "3rem";

    let gridContainerClass = "grid-container grid-regular";
    if (iconSize === "small") {
        gridContainerClass = "grid-container grid-small";
        iconPixelSize = "1.5rem";
    }

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

    const toggleViewMode = (mode) => {
        if (mode === "list") {
            return "icon_rg";
        } else if (mode === "icon_rg") {
            return "icon_sm";
        } else {
            return "list";
        }
    };

    const toggleViewModeIcon = (mode) => {
        if (mode === "list") {
            return <BsGridFill />;
        } else if (mode === "icon_rg") {
            return <BsGrid3X3GapFill />;
        } else {
            return <BsListTask />;
        }
    };

    return (
        <div className="d-flex flex-column h-100">
            <div className="px-2 border-bottom">
                <div className="bg-body sticky-top">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            <input
                                type="checkbox"
                                className="form-check-input me-2"
                                ref={headerCheckboxRef}
                                onChange={handleSelectAll}
                                checked={
                                    selectedItems.length === sortedItems.length &&
                                    sortedItems.length > 0
                                }
                            />
                            <SortDropDownMenu
                                sortDirection={sortDirection}
                                setSortDirection={setSortDirection}
                            />
                        </div>

                        <div
                            onClick={() => setViewMode(toggleViewMode(viewMode))}
                            className="ms-2 pe-3"
                        >
                            {toggleViewModeIcon(viewMode)}
                        </div>
                    </div>
                    <hr className="my-2" />
                </div>
                <div className={`${gridContainerClass}`}>
                    {sortedItems.map((item) => {
                        const isSelected = selectedItems.some(
                            (selected) => selected.path === item.path
                        );
                        const isLastSelected = active && lastSelectedItem?.path === item.path;

                        return (
                            <div
                                key={item.path}
                                className={`col file-item position-relative ${isLastSelected ? "file-item-active" : ""} ${
                                    iconSize === "small" ? "grid-item-sm" : "grid-item"
                                }`}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({
                                        show: true,
                                        x: e.pageX,
                                        y: e.pageY,
                                        item,
                                    });
                                }}
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
                                    onClick={() => handleClick(!isSelected, item)}
                                    onDoubleClick={() => handleDoubleClick(item)}
                                >
                                    <FileIcon
                                        filename={item.name}
                                        is_dir={item.is_dir}
                                        is_sym={item.is_sym}
                                        size={iconPixelSize}
                                    />
                                </div>
                                <div
                                    className="file-name text-center mt-1"
                                    onClick={() => handleClick(!isSelected, item)}
                                    onDoubleClick={() => handleDoubleClick(item)}
                                >
                                    {item.name}
                                </div>
                                <div
                                    className="text-muted text-center text-break px-3"
                                    style={{ fontSize: "0.8rem" }}
                                    onClick={() => handleClick(!isSelected, item)}
                                    onDoubleClick={() => handleDoubleClick(item)}
                                >
                                    {formatFileSize(item.size, item.is_dir)}
                                    {item.is_dir ? " " : " | "}
                                    {getTimeStr(item.mtime, dateFormat)}
                                </div>
                                <div className="position-absolute bottom-0 end-0 m-1">
                                    <ItemMenu item={item} actions={ItemMenuActions} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function FileListView({
    parentName,
    currentDir,
    currentItems,
    selectedItems,
    setSelectedItems,
    active,
    lastSelectedItem,
    setLastSelectedItem,
    ItemMenuActions,
    UploadMenuActions,
    SelectedMenuActions,
    handleItemClick,
}) {
    const { viewMode } = useViewMode();
    const { userInfo } = useUserInfo();
    const isTouchDevice = hasTouchScreen();
    const [sortDirection, setSortDirection] = useState({ column: "Name", order: "asc" });
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
                if (sortDirection.column === "Name") {
                    return sortItemsByName(a, b, sortDirection.order);
                } else if (sortDirection.column === "Size") {
                    return sortItemsBySize(a, b, sortDirection.order);
                } else if (sortDirection.column === "Modified") {
                    return sortItemsByUpdateDate(a, b, sortDirection.order);
                }
                return 0;
            }),
        [filteredItems, sortDirection]
    );
    const [contextMenu, setContextMenu] = useState({
        show: false,
        x: 0,
        y: 0,
        item: null,
    });

    useEffect(() => {
        setSelectedItems([]);
    }, [filterTypes, dateFilter]);

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

    const handleClick = useCallback(
        (checked, item) => {
            if (isTouchDevice) {
                handleItemClick(item.path, item.is_file, item.is_dir);
            } else {
                handleSelectItem(checked, item);
            }
        },
        [isTouchDevice, handleItemClick, handleSelectItem]
    );

    const handleDoubleClick = useCallback(
        (item) => {
            if (!isTouchDevice) {
                handleItemClick(item.path, item.is_file, item.is_dir);
            }
        },
        [isTouchDevice, handleItemClick]
    );

    useEffect(() => {
        const handleKeyDownWithSortedItems = (e) => {
            if (e.key === "a" || e.key === "A") {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    setSelectedItems(sortedItems);
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                setSelectedItems([]);
            }
        };

        window.addEventListener("keydown", handleKeyDownWithSortedItems);
        return () => {
            window.removeEventListener("keydown", handleKeyDownWithSortedItems);
        };
    }, [sortedItems]);

    useEffect(() => {
        const handleKeyDownWithSelectedItems = (e) => {
            if (e.key === "Delete") {
                e.preventDefault();
                SelectedMenuActions.remove(selectedItems);
            }
        };

        window.addEventListener("keydown", handleKeyDownWithSelectedItems);
        return () => {
            window.removeEventListener("keydown", handleKeyDownWithSelectedItems);
        };
    }, [selectedItems]);

    useEffect(() => {
        const handleKeyDownWithLastSelectedItem = (e) => {
            if (e.key === "F2") {
                e.preventDefault();
                if (lastSelectedItem) {
                    ItemMenuActions.rename(lastSelectedItem);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDownWithLastSelectedItem);
        return () => {
            window.removeEventListener("keydown", handleKeyDownWithLastSelectedItem);
        };
    }, [lastSelectedItem]);

    return (
        <div className="d-flex flex-column h-100">
            <div className="flex-shrink-0">
                <div className="d-flex mb-1">
                    <button
                        className="btn btn-sm me-2"
                        type="button"
                        onClick={() => handleItemClick(userInfo.home_directory, false, true)}
                        data-testid="home-button"
                    >
                        <BsHouse size={"1.1rem"} />
                    </button>
                    <div className="d-flex flex-wrap">
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
                            <FileActionMenu
                                selectedItems={selectedItems}
                                actions={SelectedMenuActions}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-grow-1 overflow-auto" style={{ zIndex: 0 }}>
                {viewMode === "list" ? (
                    <ListView
                        sortedItems={sortedItems}
                        selectedItems={selectedItems}
                        active={active}
                        lastSelectedItem={lastSelectedItem}
                        ItemMenuActions={ItemMenuActions}
                        handleClick={handleClick}
                        handleDoubleClick={handleDoubleClick}
                        handleSelectItem={handleSelectItem}
                        handleSelectAll={handleSelectAll}
                        sortDirection={sortDirection}
                        setSortDirection={setSortDirection}
                        setContextMenu={setContextMenu}
                    />
                ) : (
                    <IconView
                        sortedItems={sortedItems}
                        selectedItems={selectedItems}
                        active={active}
                        lastSelectedItem={lastSelectedItem}
                        ItemMenuActions={ItemMenuActions}
                        handleClick={handleClick}
                        handleDoubleClick={handleDoubleClick}
                        handleSelectItem={handleSelectItem}
                        iconSize={viewMode === "icon_rg" ? "regular" : "small"}
                        handleSelectAll={handleSelectAll}
                        sortDirection={sortDirection}
                        setSortDirection={setSortDirection}
                        setContextMenu={setContextMenu}
                    />
                )}
            </div>
            {contextMenu.show && contextMenu.item && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    item={contextMenu.item}
                    actions={ItemMenuActions} // or whatever actions you pass
                    onClose={() => setContextMenu((prev) => ({ ...prev, show: false }))}
                />
            )}
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
    active: PropTypes.bool,
    lastSelectedItem: PropTypes.object,
    setLastSelectedItem: PropTypes.func,
    ItemMenuActions: PropTypes.array,
    UploadMenuActions: PropTypes.array,
    SelectedMenuActions: PropTypes.array,
    handleItemClick: PropTypes.func,
};

ListView.propTypes = {
    sortedItems: PropTypes.array,
    selectedItems: PropTypes.array,
    active: PropTypes.bool,
    lastSelectedItem: PropTypes.object,
    ItemMenuActions: PropTypes.array,
    handleClick: PropTypes.func,
    handleDoubleClick: PropTypes.func,
    handleSelectItem: PropTypes.func,
    handleSelectAll: PropTypes.func,
    sortDirection: PropTypes.object,
    setSortDirection: PropTypes.func,
    setContextMenu: PropTypes.func,
};

IconView.propTypes = {
    sortedItems: PropTypes.array,
    selectedItems: PropTypes.array,
    active: PropTypes.bool,
    lastSelectedItem: PropTypes.object,
    ItemMenuActions: PropTypes.array,
    handleClick: PropTypes.func,
    handleDoubleClick: PropTypes.func,
    handleSelectItem: PropTypes.func,
    iconSize: PropTypes.string,
    handleSelectAll: PropTypes.func,
    sortDirection: PropTypes.object,
    setSortDirection: PropTypes.func,
    setContextMenu: PropTypes.func,
};

SortDropDownMenu.propTypes = {
    sortDirection: PropTypes.object,
    setSortDirection: PropTypes.func,
};
