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
    BsArchive,
    BsCardChecklist,
    BsShieldLock,
    BsLink45Deg,
} from "react-icons/bs";
import PropTypes from "prop-types";

function FileActionMenu({ actions, selectedItems }) {
    if (selectedItems.length === 0) return null;

    return (
        <div className="d-flex align-items-center">
            {/* Inline buttons on md+ screens */}
            <div className="d-none d-md-flex btn-group" role="group">
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => actions.download(selectedItems)}
                >
                    <BsDownload className="me-2" /> Download
                </button>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => actions.remove(selectedItems)}
                >
                    <BsTrash className="me-2" /> Delete
                </button>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => actions.move(selectedItems)}
                >
                    <BsArrowRightSquare className="me-2" /> Move
                </button>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => actions.archive()}
                >
                    <BsArchive className="me-2" /> gfptar
                </button>
            </div>

            {/* Dropdown on small screens */}
            <div className="dropdown d-md-none">
                <button
                    className="btn btn-outline-primary btn-sm dropdown-toggle"
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
                            onClick={() => actions.download(selectedItems)}
                        >
                            <BsDownload className="me-2" /> Download
                        </button>
                    </li>
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => actions.remove(selectedItems)}
                        >
                            <BsTrash className="me-2" /> Delete
                        </button>
                    </li>
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => actions.move(selectedItems)}
                        >
                            <BsArrowRightSquare className="me-2" /> Move
                        </button>
                    </li>
                    <li>
                        <button className="dropdown-item" onClick={() => actions.archive()}>
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

function ItemMenu({ item, actions }) {
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
                    <button className="dropdown-item" onClick={() => actions.showDetail(item)}>
                        <BsInfoCircle className="me-2" /> Detail
                    </button>
                </li>
                {item.is_file && (
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => actions.display(item.path)}
                        >
                            <BsEye className="me-2" /> View
                        </button>
                    </li>
                )}
                <li>
                    <button className="dropdown-item" onClick={() => actions.rename(item)}>
                        <BsPencil className="me-2" /> Rename
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => actions.move([item])}>
                        <BsArrowRightSquare className="me-2" /> Move
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => actions.copy(item)}>
                        <BsFiles className="me-2" /> Copy
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => actions.download([item])}>
                        <BsDownload className="me-2" /> Download
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => actions.create_symlink(item)}>
                        <BsLink45Deg className="me-2" /> Create Symlink
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => actions.permission(item)}>
                        <BsShieldLock className="me-2" /> Permissions
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => actions.accessControl(item)}>
                        <BsCardChecklist className="me-2" /> ACL
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => actions.share(item)}>
                        <BsLink45Deg className="me-2" /> URL
                    </button>
                </li>
                <li>
                    <button className="dropdown-item" onClick={() => actions.remove([item])}>
                        <BsTrash className="me-2" /> Delete
                    </button>
                </li>
            </ul>
        </div>
    );
}

export { FileActionMenu, ItemMenu };

FileActionMenu.propTypes = {
    selectedItems: PropTypes.array,
    actions: PropTypes.array,
};

ItemMenu.propTypes = {
    item: PropTypes.object,
    actions: PropTypes.array,
};
