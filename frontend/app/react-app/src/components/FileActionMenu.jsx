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
    BsFileEarmarkPlus,
} from "react-icons/bs";
import PropTypes from "prop-types";

function FileActionMenu({ actions, selectedItems }) {
    if (selectedItems.length === 0) return null;

    return (
        <div className="d-flex align-items-center" data-testid="action-menu">
            {/* Inline buttons on md+ screens */}
            <div className="d-none d-md-flex btn-group" role="group">
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => actions.download(selectedItems)}
                    data-testid="action-menu-download"
                >
                    <BsDownload className="me-2" /> Download
                </button>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => actions.remove(selectedItems)}
                    data-testid="action-menu-delete"
                >
                    <BsTrash className="me-2" /> Delete
                </button>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => actions.move(selectedItems)}
                    data-testid="action-menu-move"
                >
                    <BsArrowRightSquare className="me-2" /> Move
                </button>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => actions.archive()}
                    data-testid="action-menu-gfptar"
                >
                    <BsArchive className="me-2" /> gfptar
                </button>
            </div>

            {/* Dropdown on small screens */}
            <div className="dropdown d-md-none">
                <button
                    className="btn btn-outline-primary btn-sm dropdown-toggle"
                    type="button"
                    id="action-menu-dropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    data-testid="action-menu-dropdown"
                >
                    Actions
                </button>
                <ul className="dropdown-menu" aria-labelledby="action-menu-dropdown">
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => actions.download(selectedItems)}
                            data-testid="action-menu-download-sm"
                        >
                            <BsDownload className="me-2" /> Download
                        </button>
                    </li>
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => actions.remove(selectedItems)}
                            data-testid="action-menu-delete-sm"
                        >
                            <BsTrash className="me-2" /> Delete
                        </button>
                    </li>
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => actions.move(selectedItems)}
                            data-testid="action-menu-move-sm"
                        >
                            <BsArrowRightSquare className="me-2" /> Move
                        </button>
                    </li>
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => actions.archive()}
                            data-testid="action-menu-gfptar-sm"
                        >
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
                    <button
                        className="dropdown-item"
                        onClick={() => actions.showDetail(item)}
                        data-testid={`detail-menu-${item.name}`}
                    >
                        <BsInfoCircle className="me-2" /> Detail
                    </button>
                </li>
                {item.is_file && (
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => actions.display(item.path)}
                            data-testid={`view-menu-${item.name}`}
                        >
                            <BsEye className="me-2" /> View
                        </button>
                    </li>
                )}
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => actions.rename(item)}
                        data-testid={`rename-menu-${item.name}`}
                    >
                        <BsPencil className="me-2" /> Rename
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => actions.move([item])}
                        data-testid={`move-menu-${item.name}`}
                    >
                        <BsArrowRightSquare className="me-2" /> Move
                    </button>
                </li>
                {item.is_file && (
                    <li>
                        <button
                            className="dropdown-item"
                            onClick={() => actions.copy(item)}
                            data-testid={`copy-menu-${item.name}`}
                        >
                            <BsFiles className="me-2" /> Copy
                        </button>
                    </li>
                )}
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => actions.download([item])}
                        data-testid={`download-menu-${item.name}`}
                    >
                        <BsDownload className="me-2" /> Download
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => actions.create_symlink(item)}
                        data-testid={`symlink-menu-${item.name}`}
                    >
                        <BsFileEarmarkPlus className="me-2" /> Create Symlink
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => actions.permission(item)}
                        data-testid={`permissions-menu-${item.name}`}
                    >
                        <BsShieldLock className="me-2" /> Permissions
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => actions.accessControl(item)}
                        data-testid={`acl-menu-${item.name}`}
                    >
                        <BsCardChecklist className="me-2" /> ACL
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => actions.share(item)}
                        data-testid={`url-menu-${item.name}`}
                    >
                        <BsLink45Deg className="me-2" /> URL
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => actions.remove([item])}
                        data-testid={`delete-menu-${item.name}`}
                    >
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
