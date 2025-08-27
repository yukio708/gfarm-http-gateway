import React, { useRef, useEffect } from "react";
import FileIcon from "@components/FileListView/FileIcon";
import { ItemMenu } from "@components/FileListView/FileActionMenu";
import SortDropDownMenu from "@components/FileListView/SortDropDownMenu";
import { formatFileSize, getTimeStr } from "@utils/func";
import { useViewMode } from "@context/ViewModeContext";
import { useDateFormat } from "@context/DateFormatContext";
import "@css/FileListView.css";
import { BsListTask, BsGridFill, BsGrid3X3GapFill } from "react-icons/bs";
import PropTypes from "prop-types";

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

export default IconView;

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
