import React from "react";
import {
    BsThreeDots,
    BsInfoCircle,
    BsEye,
    BsPencil,
    BsArrowRightSquare,
    BsFiles,
    BsDownload,
    BsTrash,
    BsShare,
    BsArchive,
} from "react-icons/bs";
import PropTypes from "prop-types";

function FileActionMenu({ downloadItems, removeItems, moveItems, selectedItems, gfptar }) {
    if (selectedItems.length === 0) return null;

    return (
        <div className="dropdown">
            <button
                className="btn btn-primary btn-sm dropdown-toggle"
                type="button"
                id="fileActionsDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                Actions
            </button>
            <ul className="dropdown-menu" aria-labelledby="fileActionsDropdown">
                <li>
                    <button className="dropdown-item" onClick={() => downloadItems(selectedItems)}>
                        <BsDownload className="me-2" /> Download
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => removeItems(selectedItems)}>
                        <BsTrash className="me-2" /> Delete
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => moveItems(selectedItems)}>
                        <BsArrowRightSquare className="me-2" /> Move
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => gfptar()}>
                        <BsArchive className="me-2" /> gfptar
                    </button>
                </li>
            </ul>
        </div>
    );
}

function ItemMenu({ item, download, display, move, remove, showDetail, permission }) {
    return (
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
                    <button className="dropdown-item" onClick={() => showDetail(item)}>
                        <BsInfoCircle className="me-2" /> Detail
                    </button>
                </li>
                {item.is_file && (
                    <li>
                        <button className="dropdown-item" onClick={() => display(item.path)}>
                            <BsEye className="me-2" /> View
                        </button>
                    </li>
                )}
                <li>
                    <button className="dropdown-item" onClick={() => move(item.path)}>
                        <BsPencil className="me-2" /> Rename
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => move([item])}>
                        <BsArrowRightSquare className="me-2" /> Move
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => {}}>
                        <BsFiles className="me-2" /> Copy
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => download([item])}>
                        <BsDownload className="me-2" /> Download
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => remove([item])}>
                        <BsTrash className="me-2" /> Delete
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => permission(item)}>
                        <BsShare className="me-2" /> Share
                    </button>
                </li>
            </ul>
        </div>
    );
}

export { FileActionMenu, ItemMenu };

FileActionMenu.propTypes = {
    downloadItems: PropTypes.func,
    removeItems: PropTypes.func,
    moveItems: PropTypes.func,
    selectedItems: PropTypes.array,
};

ItemMenu.propTypes = {
    item: PropTypes.object,
    download: PropTypes.func,
    display: PropTypes.func,
    move: PropTypes.func,
    remove: PropTypes.func,
    showDetail: PropTypes.func,
    permission: PropTypes.func,
};
