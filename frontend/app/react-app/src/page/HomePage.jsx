import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FileListView from "../components/FileListView";
import CurrentDirView from "../components/CurrentDirView";
import SidePanel from "../components/SidePanel";
import ProgressView from "../components/ProgressView";
import DeleteModal from "../components/DeleteModal";
import NewDirModal from "../components/NewDirModal";
import RenameModal from "../components/RenameModal";
import UploadDropZone from "../components/UploadDropZone";
import UserMenu from "../components/UserMenu";
import MoveModal from "../components/MoveModel";
import ArchiveModal from "../components/ArchiveModal";
import useFileList from "../hooks/useFileList";
import useProgressTasks from "../hooks/useProgressTasks";
import { useNotifications } from "../context/NotificationContext";
import displayFile from "../utils/display";
import getSymlink from "../utils/getSymlink";
import ErrorPage from "./ErrorPage";
import PropTypes from "prop-types";

function HomePage({ user }) {
    const location = useLocation();
    const navigate = useNavigate();
    const currentDir = decodeURIComponent(location.pathname);
    const [refreshKey, setRefreshKey] = useState(false);
    const { currentItems, listGetError } = useFileList(currentDir, refreshKey);
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
    } = useProgressTasks(setRefreshKey);
    const [showNewDirModal, setShowNewDirModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showGfptarModal, setShowGfptarModal] = useState(false);
    const [showSidePanel, setShowSidePanel] = useState({ show: false, tab: "detail" });
    const { addNotification } = useNotifications();

    useEffect(() => {
        setSelectedItems((prev) =>
            prev.filter((selected) => currentItems.some((item) => item.path === selected.path))
        );
    }, [currentItems]);

    const jumpDirectory = (newdir) => {
        if (currentDir === newdir) {
            setRefreshKey((prev) => !prev);
        } else {
            navigate(newdir);
        }
    };

    const handleDisplayFile = (path) => {
        displayFile(path);
    };

    const handleSymlink = async (symlink) => {
        console.debug("handleSymlink", symlink);
        try {
            const info = await getSymlink(symlink);
            if (info.is_file) {
                handleDisplayFile(info.path);
            } else if (info.is_sym) {
                addNotification(info.name, `Link not found`, "warning");
            } else {
                jumpDirectory(info.linkname);
            }
        } catch (err) {
            addNotification(`${err.name} : ${err.message}`);
        }
    };

    const handleItemClick = (path, is_file, is_dir) => {
        if (is_file) {
            handleDisplayFile(path);
        } else if (is_dir) {
            jumpDirectory(path);
        } else {
            handleSymlink(path);
        }
    };

    const handleShowDetail = (item, tab) => {
        setLastSelectedItem(item);
        setShowSidePanel({ show: true, tab });
    };

    const handleRename = (item) => {
        setLastSelectedItem(item);
        setShowRenameModal(true);
    };

    if (listGetError) {
        return <ErrorPage error={listGetError} />;
    }

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col">
                    <nav className="navbar bg-body-tertiary">
                        <div className="container-fluid">
                            <img
                                src="./assets/Gfarm_logo_tate_color.svg"
                                alt="Logo"
                                width="30"
                                height="30"
                                className="d-inline-block align-text-top"
                            />
                            <div className="ms-2 d-flex gap-2">
                                <UserMenu user={user} />
                            </div>
                        </div>
                    </nav>
                </div>
            </div>
            <div className="row">
                <div className="col">
                    <div className="d-flex">
                        <div className="mx-3">
                            <CurrentDirView currentDir={currentDir} onNavigate={jumpDirectory} />
                        </div>
                    </div>
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
                        handleItemClick={handleItemClick}
                        download={addItemsToDownload}
                        upload={addItemsToUpload}
                        showDetail={(item) => {
                            handleShowDetail(item, "detail");
                        }}
                        display={handleDisplayFile}
                        remove={setItemsToDelete}
                        move={setItemsToMove}
                        rename={handleRename}
                        permission={(item) => {
                            handleShowDetail(item, "acl");
                        }}
                        share={(item) => {
                            handleShowDetail(item, "share");
                        }}
                        showSidePanel={showSidePanel}
                        createNewDir={() => {
                            setShowNewDirModal(true);
                        }}
                        gfptar={() => {
                            setShowGfptarModal(true);
                        }}
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
                setTasks={setTasks}
                refresh={() => {
                    setRefreshKey((prev) => !prev);
                }}
            />
        </div>
    );
}

export default HomePage;

HomePage.propTypes = {
    user: PropTypes.string,
};
