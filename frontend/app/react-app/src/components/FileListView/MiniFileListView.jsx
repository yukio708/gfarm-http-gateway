import React, { useMemo } from "react";
import FileIcon from "@components/FileListView/FileIcon";
import PropTypes from "prop-types";

function MiniFileListView({ currentItems, selectedItems, setSelectedItems }) {
    const sortedItems = useMemo(() => {
        return [...currentItems].sort((a, b) => {
            const aSelected = selectedItems.some((item) => item.path === a.path);
            const bSelected = selectedItems.some((item) => item.path === b.path);

            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return 0;
        });
    }, [currentItems]);

    return (
        <div>
            <ul className="list-group small">
                {sortedItems.map((item, i) => {
                    const isSelected = selectedItems.some(
                        (selectedItem) => selectedItem.path === item.path
                    );
                    return (
                        <li
                            key={i}
                            className={`list-group-item list-group-item-action text-break ${isSelected ? "active" : ""}`}
                            onClick={() => {
                                setSelectedItems((prev) =>
                                    isSelected
                                        ? prev.filter((selectedItem) => selectedItem !== item)
                                        : [...prev, item]
                                );
                            }}
                            style={{ cursor: "pointer" }}
                        >
                            <span className="me-2">
                                <FileIcon
                                    filename={item.name}
                                    is_dir={item.is_dir}
                                    is_sym={item.is_sym}
                                    size={"1.0em"}
                                />
                            </span>
                            <span>{item.name}</span>
                        </li>
                    );
                })}
            </ul>
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
