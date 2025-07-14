import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import FileListView from "../components/FileListView";
import CurrentDirView from "../components/CurrentDirView";
import SidePanel from "../components/SidePanel";
import ProgressView from "../components/ProgressView";
import DeleteModal from "../components/DeleteModal";
import NewDirModal from "../components/NewDirModal";
import NewSymlinkModal from "../components/NewSymlinkModal";
import RenameModal from "../components/RenameModal";
import UploadDropZone from "../components/UploadDropZone";
import UserMenu from "../components/UserMenu";
import MoveModal from "../components/MoveModel";
import ArchiveModal from "../components/ArchiveModal";
import SettingsModal from "../components/SettingsModal";
import useFileList from "../hooks/useFileList";
import useProgressTasks from "../hooks/useProgressTasks";
import useGetPath from "../hooks/useGetPath";
import { useUserInfo } from "../context/UserInfoContext";
import { useShowHidden } from "../context/ShowHiddenContext";
import { useNotifications } from "../context/NotificationContext";
import { ROUTE_STORAGE } from "../utils/config";
import displayFile from "../utils/display";
import { getSymlink } from "../utils/symlink";
import { getParentPath } from "../utils/func";
import LoginPage from "./LoginPage";
import ErrorPage from "./ErrorPage";
import PropTypes from "prop-types";

function HomePage() {
    const { userInfo, loading } = useUserInfo();
    const { showHidden } = useShowHidden();
    const navigate = useNavigate();
    const { pathHead, gfarmPath: currentDir } = useGetPath(ROUTE_STORAGE);
    const [refreshKey, setRefreshKey] = useState(false);
    const { currentItems, listGetError } = useFileList(currentDir, refreshKey, showHidden);
    const { addNotification } = useNotifications();
    const [selectedItems, setSelectedItems] = useState([]);
    const [lastSelectedItem, setLastSelectedItem] = useState(null);
    const {
        tasks,
        showProgressView,
        itemsToMove,
        itemsToDelete,
        setTasks,
        setShowProgressView,
        addItemsToUpload,
        addItemsToDownload,
        setItemsToMove,
        setItemsToDelete,
        setItemToCopy,
        setItemForGfptar,
    } = useProgressTasks(setRefreshKey, addNotification);
    const [showNewDirModal, setShowNewDirModal] = useState(false);
    const [showSymlinkModal, setShowSymlinkModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showGfptarModal, setShowGfptarModal] = useState(false);
    const [showSidePanel, setShowSidePanel] = useState({ show: false, tab: "detail" });

    useEffect(() => {
        setSelectedItems((prev) =>
            prev.filter((selected) => currentItems.some((item) => item.path === selected.path))
        );
        if (currentItems.length === 1) {
            if (currentDir === currentItems[0].path) {
                setLastSelectedItem(currentItems[0]);
                setSelectedItems([currentItems[0]]);
                navigate(pathHead + getParentPath(currentDir));
                setShowSidePanel({ show: true, tab: "detail" });
            }
        }
    }, [currentItems]);

    const jumpDirectory = useCallback(
        (newdir) => {
            if (currentDir === newdir) {
                setRefreshKey((prev) => !prev);
            } else {
                navigate(pathHead + newdir);
            }
        },
        [currentDir, pathHead, navigate]
    );

    const handleDisplayFile = useCallback((path) => {
        displayFile(path);
    }, []);

    const handleSymlink = useCallback(
        async (symlink) => {
            console.debug("handleSymlink", symlink);
            try {
                const info = await getSymlink(symlink);
                if (info.is_file) {
                    handleDisplayFile(info.path);
                } else if (info.is_sym) {
                    addNotification(info.name, `Link not found`, "warning");
                } else {
                    jumpDirectory(info.path);
                }
            } catch (err) {
                addNotification(symlink, `${err.name} : ${err.message}`, "error");
            }
        },
        [handleDisplayFile, jumpDirectory, addNotification]
    );

    const handleItemClick = useCallback(
        (path, is_file, is_dir) => {
            if (is_file) {
                handleDisplayFile(path);
            } else if (is_dir) {
                jumpDirectory(path);
            } else {
                handleSymlink(path);
            }
        },
        [handleDisplayFile, jumpDirectory, handleSymlink]
    );

    const handleShowDetail = useCallback((item, tab) => {
        setLastSelectedItem(item);
        setShowSidePanel({ show: true, tab });
    }, []);

    const handleRename = useCallback((item) => {
        setLastSelectedItem(item);
        setShowRenameModal(true);
    }, []);

    const handleCopy = useCallback(
        async (item) => {
            setItemToCopy(
                item,
                currentItems.map((item) => item.name)
            );
        },
        [currentItems, setItemToCopy]
    );

    const ItemMenuActions = useMemo(
        () => ({
            download: addItemsToDownload,
            showDetail: (item) => {
                handleShowDetail(item, "detail");
            },
            display: handleDisplayFile,
            remove: setItemsToDelete,
            move: setItemsToMove,
            rename: handleRename,
            copy: handleCopy,
            permission: (item) => {
                handleShowDetail(item, "perms");
            },
            accessControl: (item) => {
                handleShowDetail(item, "acl");
            },
            share: (item) => {
                handleShowDetail(item, "url");
            },
            create_symlink: (item) => {
                setLastSelectedItem(item);
                setShowSymlinkModal(true);
            },
        }),
        [
            addItemsToDownload,
            handleShowDetail,
            handleDisplayFile,
            setItemsToDelete,
            setItemsToMove,
            handleRename,
            handleCopy,
        ]
    );

    const UploadMenuActions = useMemo(
        () => ({
            upload: addItemsToUpload,
            create: () => {
                setShowNewDirModal(true);
            },
            create_symlink: () => {
                setLastSelectedItem(null);
                setShowSymlinkModal(true);
            },
        }),
        [addItemsToUpload]
    );

    const SelectedMenuActions = useMemo(
        () => ({
            download: addItemsToDownload,
            remove: setItemsToDelete,
            move: setItemsToMove,
            archive: () => {
                setShowGfptarModal(true);
            },
        }),
        [addItemsToDownload, setItemsToDelete, setItemsToMove]
    );

    if (loading) return <p>...</p>;
    if (!userInfo) return <LoginPage />;
    if (listGetError) return <ErrorPage error={listGetError} />;

    return (
        <div className="container-fluid bg-body">
            <div className="row">
                <div className="col">
                    <nav className={`navbar`}>
                        <div className="container-fluid">
                            <CurrentDirView currentDir={currentDir} onNavigate={jumpDirectory} />
                            <div className="ms-2 d-flex gap-2">
                                <UserMenu />
                            </div>
                        </div>
                    </nav>
                </div>
            </div>
            <div className="row">
                <div className="col">
                    <FileListView
                        parentName="HomePage"
                        currentDir={currentDir}
                        currentItems={currentItems}
                        selectedItems={selectedItems}
                        setSelectedItems={setSelectedItems}
                        setLastSelectedItem={setLastSelectedItem}
                        activeItem={showSidePanel.show ? lastSelectedItem : null}
                        handleItemClick={handleItemClick}
                        ItemMenuActions={ItemMenuActions}
                        UploadMenuActions={UploadMenuActions}
                        SelectedMenuActions={SelectedMenuActions}
                    />
                </div>
            </div>
            <SidePanel
                show={showSidePanel.show}
                showTab={showSidePanel.tab}
                item={lastSelectedItem}
                onHide={() => {
                    setShowSidePanel({ show: false, tab: "" });
                }}
            />
            <ProgressView
                show={showProgressView}
                onHide={() => {
                    setShowProgressView(false);
                }}
                tasks={tasks}
                setTasks={setTasks}
            />
            {!showProgressView && tasks.length > 0 && (
                <button
                    className="btn btn-primary position-fixed end-0 bottom-0 m-3"
                    onClick={() => {
                        setShowProgressView(true);
                    }}
                >
                    <i className="bi bi-arrow-repeat me-2"></i> Show Progress
                </button>
            )}
            <UploadDropZone
                onUpload={addItemsToUpload}
                uploadDir={currentDir}
                currentItems={currentItems}
            />
            <DeleteModal
                itemsToDelete={itemsToDelete}
                setItemsToDelete={setItemsToDelete}
                refresh={() => {
                    setSelectedItems((prev) =>
                        prev.filter((item) =>
                            itemsToDelete.some((deletedItem) => deletedItem.path !== item.path)
                        )
                    );
                    setItemsToDelete([]);
                    setRefreshKey((prev) => !prev);
                }}
            />
            <NewDirModal
                showModal={showNewDirModal}
                setShowModal={setShowNewDirModal}
                currentDir={currentDir}
                refresh={() => {
                    setRefreshKey((prev) => !prev);
                }}
            />
            <NewSymlinkModal
                showModal={showSymlinkModal}
                setShowModal={setShowSymlinkModal}
                currentDir={currentDir}
                targetItem={lastSelectedItem}
                refresh={() => setRefreshKey((prev) => !prev)}
            />
            <RenameModal
                showModal={showRenameModal}
                setShowModal={setShowRenameModal}
                renameItem={lastSelectedItem}
                refresh={() => {
                    setSelectedItems((prev) =>
                        prev.filter((item) => lastSelectedItem.path !== item.path)
                    );
                    setLastSelectedItem(null);
                    setRefreshKey((prev) => !prev);
                }}
            />
            <MoveModal
                itemsToMove={itemsToMove}
                setItemsToMove={setItemsToMove}
                currentDir={currentDir}
                refresh={() => {
                    setSelectedItems((prev) =>
                        prev.filter((file) =>
                            itemsToMove.some((movedItem) => movedItem.path !== file.path)
                        )
                    );
                    setItemsToMove([]);
                    setRefreshKey((prev) => !prev);
                }}
            />
            <ArchiveModal
                showModal={showGfptarModal}
                setShowModal={setShowGfptarModal}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                lastSelectedItem={lastSelectedItem}
                currentDirItems={currentItems}
                currentDir={currentDir}
                setItemForGfptar={setItemForGfptar}
                refresh={() => {
                    setRefreshKey((prev) => !prev);
                }}
            />
            <SettingsModal />
        </div>
    );
}

export default HomePage;

HomePage.propTypes = {
    user: PropTypes.string,
    home_directory: PropTypes.string,
};
