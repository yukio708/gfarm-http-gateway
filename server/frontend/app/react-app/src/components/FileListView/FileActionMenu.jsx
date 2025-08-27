import React, { useRef, useEffect } from "react";
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

    const rawButtons = [
        {
            label: (
                <>
                    <BsDownload className="me-2" /> Download
                </>
            ),
            onClick: () => actions.download(selectedItems),
            testid: "download",
        },
        {
            label: (
                <>
                    <BsTrash className="me-2" /> Delete
                </>
            ),
            onClick: () => actions.remove(selectedItems),
            testid: "delete",
        },
        {
            label: (
                <>
                    <BsArrowRightSquare className="me-2" /> Move
                </>
            ),
            onClick: () => actions.move(selectedItems),
            testid: "move",
        },
        {
            label: (
                <>
                    <BsArchive className="me-2" /> gfptar
                </>
            ),
            onClick: () => actions.archive(),
            testid: "gfptar",
        },
    ];

    return (
        <div className="d-flex align-items-center" data-testid="action-menu">
            <div className="d-none d-md-flex btn-group" role="group">
                {rawButtons.map(({ label, onClick, testid }) => (
                    <button
                        key={testid}
                        className="btn btn-outline-primary btn-sm"
                        onClick={onClick}
                        data-testid={`action-menu-${testid}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

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
                    {rawButtons.map(({ label, onClick, testid }) => (
                        <li key={testid}>
                            <button
                                className="dropdown-item"
                                onClick={onClick}
                                data-testid={`action-menu-${testid}-sm`}
                            >
                                {label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <span className="badge bg-light text-dark ms-2">{selectedItems.length} selected</span>
        </div>
    );
}

function ItemMenu({ item, actions }) {
    const menuItems = [
        {
            label: "Detail",
            icon: <BsInfoCircle />,
            action: () => actions.showDetail(item),
            testid: "detail",
        },
        item.is_file && {
            label: "View",
            icon: <BsEye />,
            action: () => actions.display(item.path),
            testid: "view",
        },
        {
            label: "Rename",
            icon: <BsPencil />,
            action: () => actions.rename(item),
            testid: "rename",
        },
        {
            label: "Move",
            icon: <BsArrowRightSquare />,
            action: () => actions.move([item]),
            testid: "move",
        },
        item.is_file && {
            label: "Copy",
            icon: <BsFiles />,
            action: () => actions.copy(item),
            testid: "copy",
        },
        {
            label: "Download",
            icon: <BsDownload />,
            action: () => actions.download([item]),
            testid: "download",
        },
        {
            label: "Create Symlink",
            icon: <BsFileEarmarkPlus />,
            action: () => actions.create_symlink(item),
            testid: "symlink",
        },
        {
            label: "Permissions",
            icon: <BsShieldLock />,
            action: () => actions.permission(item),
            testid: "permissions",
        },
        {
            label: "ACL",
            icon: <BsCardChecklist />,
            action: () => actions.accessControl(item),
            testid: "acl",
        },
        { label: "URL", icon: <BsLink45Deg />, action: () => actions.share(item), testid: "url" },
        {
            label: "Delete",
            icon: <BsTrash />,
            action: () => actions.remove([item]),
            testid: "delete",
        },
    ].filter(Boolean);

    return (
        <div className="dropdown">
            <button
                type="button"
                className="btn p-0 border-0"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                data-testid="item-menu"
            >
                <BsThreeDots />
            </button>
            <ul className="dropdown-menu">
                {menuItems.map(({ label, icon, action, testid }) => (
                    <li key={testid}>
                        <button
                            className="dropdown-item"
                            onClick={action}
                            data-testid={`${testid}-menu-${item.name}`}
                        >
                            {icon} <span className="ms-2">{label}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ContextMenu({ x, y, item, onClose, actions }) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        window.addEventListener("click", handleClickOutside);
        return () => {
            window.removeEventListener("click", handleClickOutside);
        };
    }, [onClose]);

    const menuItems = [
        {
            label: "Detail",
            onClick: () => {
                onClose?.();
                actions.showDetail(item);
            },
        },
        item.is_file && {
            label: "View",
            onClick: () => {
                onClose?.();
                actions.display(item.path);
            },
        },
        {
            label: "Rename",
            onClick: () => {
                onClose?.();
                actions.rename(item);
            },
        },
        {
            label: "Move",
            onClick: () => {
                onClose?.();
                actions.move([item]);
            },
        },
        item.is_file && {
            label: "Copy",
            onClick: () => {
                onClose?.();
                actions.copy(item);
            },
        },
        {
            label: "Download",
            onClick: () => {
                onClose?.();
                actions.download([item]);
            },
        },
        {
            label: "Create Symlink",
            onClick: () => {
                onClose?.();
                actions.create_symlink(item);
            },
        },
        {
            label: "Permissions",
            onClick: () => {
                onClose?.();
                actions.permission(item);
            },
        },
        {
            label: "ACL",
            onClick: () => {
                onClose?.();
                actions.accessControl(item);
            },
        },
        {
            label: "URL",
            onClick: () => {
                onClose?.();
                actions.share(item);
            },
        },
        {
            label: "Delete",
            onClick: () => {
                onClose?.();
                actions.remove([item]);
            },
        },
    ].filter(Boolean);

    return (
        <ul
            ref={menuRef}
            className="dropdown-menu show position-absolute"
            style={{ top: y, left: x, zIndex: 1050, display: "block" }}
        >
            {menuItems.map((menuItem, idx) => (
                <li key={idx}>
                    <button className="dropdown-item" onClick={menuItem.onClick}>
                        {menuItem.label}
                    </button>
                </li>
            ))}
        </ul>
    );
}

export { FileActionMenu, ItemMenu, ContextMenu };

FileActionMenu.propTypes = {
    selectedItems: PropTypes.array,
    actions: PropTypes.array,
};

ItemMenu.propTypes = {
    item: PropTypes.object,
    actions: PropTypes.array,
};

ContextMenu.propTypes = {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    item: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
};
