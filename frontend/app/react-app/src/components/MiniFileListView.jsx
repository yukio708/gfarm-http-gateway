import React, { useState, useRef, useEffect } from "react";
import FileTypeFilter from "../components/FileTypeFilter";
import DateFilter from "../components/DateFilter";
import {
    filterItems,
    getFileTypes,
    sortItemsByName,
    sortItemsBySize,
    sortItemsByUpdateDate,
    formatFileSize,
} from "../utils/func";
import { BsArrowUpShort, BsArrowDownShort } from "react-icons/bs";
import PropTypes from "prop-types";

function MiniFileListView({ parentName, currentItems, selectedItems, setSelectedItems }) {
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

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedItems(currentItems);
        } else {
            setSelectedItems([]);
        }
    };

    const handleClick = (item) => {
        if (!selectedItems.includes(item)) {
            setSelectedItems([...selectedItems, item]);
        } else {
            setSelectedItems(selectedItems.filter((path) => path !== item));
        }
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
            <div className="d-flex flex-wrap align-items-center gap-2 m-2">
                <FileTypeFilter
                    parentName={parentName}
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
                        <th onClick={() => toggleSortDirection("name")} data-testid="header-name">
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
                                    onChange={() => handleClick(item)}
                                    checked={selectedItems.includes(item)}
                                />
                            </td>
                            <td onClick={() => handleClick(item)}>{item.name}</td>
                            <td onClick={() => handleClick(item)}>
                                {getSize(item.size, item.is_dir)}
                            </td>
                            <td onClick={() => handleClick(item)}>{item.mtime_str}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default MiniFileListView;

MiniFileListView.propTypes = {
    parentName: PropTypes.string,
    currentItems: PropTypes.array,
    selectedItems: PropTypes.array,
    setSelectedItems: PropTypes.func,
};
