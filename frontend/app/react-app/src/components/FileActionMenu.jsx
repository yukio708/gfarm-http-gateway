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
    BsKey,
    BsShare,
    BsArchive,
} from "react-icons/bs";
import PropTypes from "prop-types";

function FileActionMenu({ downloadItems, removeItems, moveItems, selectedItems, archiveItems }) {
    if (selectedItems.length === 0) return null;

    return (
        <div className="d-flex align-items-center">
            {/* Inline buttons on md+ screens */}
            <div className="d-none d-md-flex btn-group" role="group">
                <button
                    className="btn btn-info btn-sm"
                    onClick={() => downloadItems(selectedItems)}
                >
                    <BsDownload className="me-2" /> Download
                </button>
                <button className="btn btn-info btn-sm" onClick={() => removeItems(selectedItems)}>
                    <BsTrash className="me-2" /> Delete
                </button>
                <button className="btn btn-info btn-sm" onClick={() => moveItems(selectedItems)}>
                    <BsArrowRightSquare className="me-2" /> Move
                </button>
                <button className="btn btn-info btn-sm" onClick={() => archiveItems()}>
                    <BsArchive className="me-2" /> gfptar
                </button>
            </div>

            {/* Dropdown on small screens */}
            <div className="dropdown d-md-none">
                <button
                    className="btn btn-info btn-sm dropdown-toggle"
                    type="button"
                    id="fileActionsDropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    Actions
                </button>
                <ul className="dropdown-menu" aria-labelledby="fileActionsDropdown">
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => downloadItems(selectedItems)}
                        >
                            <BsDownload className="me-2" /> Download
                        </button>
                    </li>
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => removeItems(selectedItems)}
                        >
                            <BsTrash className="me-2" /> Delete
                        </button>
                    </li>
                    <li>
                        <button className="dropdown-item" onClick={() => moveItems(selectedItems)}>
                            <BsArrowRightSquare className="me-2" /> Move
                        </button>
                    </li>
                    <li>
                        <button className="dropdown-item" onClick={() => archiveItems()}>
                            <BsArchive className="me-2" /> gfptar
                        </button>
                    </li>
                </ul>
            </div>

            {selectedItems.length > 0 && (
                <span className="badge bg-light text-dark ms-2">
                    {selectedItems.length} selected
                </span>
            )}
        </div>
    );
}

function ItemMenu({
    item,
    download,
    display,
    move,
    rename,
    remove,
    showDetail,
    permission,
    share,
}) {
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
                    <button className="dropdown-item" onClick={() => rename(item)}>
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
                        <BsKey className="me-2" /> Access Control
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => share(item)}>
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
    archiveItems: PropTypes.func,
    selectedItems: PropTypes.array,
};

ItemMenu.propTypes = {
    item: PropTypes.object,
    download: PropTypes.func,
    display: PropTypes.func,
    move: PropTypes.func,
    rename: PropTypes.func,
    remove: PropTypes.func,
    showDetail: PropTypes.func,
    permission: PropTypes.func,
    share: PropTypes.func,
};
