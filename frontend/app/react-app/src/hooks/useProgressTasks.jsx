import { useState, useEffect, useRef } from "react";
import { upload, checkPermissoin } from "../utils/upload";
import download from "../utils/download";
import copyFile from "../utils/copy";
import gfptar from "../utils/archive";
import { getParentPath, suggestNewName } from "../utils/func";

function useProgressTasks(setRefreshKey, addNotification) {
    const [tasks, setTasks] = useState([]);
    const [showProgressView, setShowProgressView] = useState(false);
    const [itemsToDelete, setItemsToDelete] = useState([]);
    const [itemsToMove, setItemsToMove] = useState([]);
    const uploadQueueRef = useRef([]);
    const [uploading, setUploading] = useState(false);
    const downloadQueueRef = useRef([]);
    const [downloading, setDownloading] = useState(false);
    const isUploadingRef = useRef(false);
    const isDownloadingRef = useRef(false);

    const updateTask = (task, updates) => {
        return {
            ...task,
            status: updates.status ?? task.status,
            value: updates.value ?? task.value,
            message: updates.message ?? task.message,
            done: updates.done ?? task.done,
            onCancel: updates.onCancel ?? task.onCancel,
        };
    };

    const addItemsToUpload = (newItems) => {
        setTasks((prev) => prev.filter((t) => !t.done || t.status === "error"));
        const tasks = newItems.map((file) => {
            const fullpath = file.destPath;
            const taskId = fullpath + Date.now();
            const displayname = file.path.length > 20 ? file.path.slice(0, 20) + "..." : file.path;

            const newTask = {
                taskId,
                name: displayname,
                value: 0,
                done: false,
                type: "upload",
                status: "upload",
                message: "waiting to upload...",
                onCancel: () => {},
            };
            uploadQueueRef.current.push({ file, fullpath, taskId });
            return newTask;
        });
        setTasks((prev) => [...prev, ...tasks]);
        setShowProgressView(true);

        setUploading(true);
        console.debug("addFilesToUpload", newItems);
    };

    const handleUpload = async () => {
        setUploading(false);
        if (isUploadingRef.current) {
            console.debug("handleUpload is already running");
            return;
        }
        isUploadingRef.current = true;

        const destDirSet = {};
        const uploadDirSet = new Set();
        uploadDirSet.add("/");
        while (uploadQueueRef.current.length) {
            const uploadItem = uploadQueueRef.current.shift();

            if (!uploadItem.file) continue;

            let error = null;
            if (!(uploadItem.file.uploadDir in destDirSet)) {
                error = await checkPermissoin(uploadItem.file.uploadDir);
                destDirSet[uploadItem.file.uploadDir] = error;
            } else {
                error = destDirSet[uploadItem.file.uploadDir];
            }
            uploadDirSet.add(uploadItem.file.uploadDir);

            if (error) {
                setTasks((prev) =>
                    prev.map((task) =>
                        task.taskId === uploadItem.taskId
                            ? {
                                  ...task,
                                  status: "error",
                                  message: error,
                                  done: true,
                              }
                            : task
                    )
                );
                continue;
            }

            await upload(
                uploadItem.file,
                uploadItem.fullpath,
                uploadDirSet,
                ({ status, value, message, done, onCancel }) => {
                    setTasks((prev) =>
                        prev.map((task) =>
                            task.taskId === uploadItem.taskId
                                ? updateTask(task, { status, value, message, done, onCancel })
                                : task
                        )
                    );
                }
            ).catch((err) => {
                console.error("uploadFile failed:", err);
            });
        }
        isUploadingRef.current = false;

        console.debug("upload done!");
        setRefreshKey((prev) => !prev);
    };

    useEffect(() => {
        console.debug("Uploading", uploading);
        if (uploading) {
            handleUpload();
        }
    }, [uploading]);

    const addItemsToDownload = (items) => {
        console.debug("addItemsToDownload: items:", items);
        setTasks((prev) => prev.filter((t) => !t.done || t.status === "error"));
        downloadQueueRef.current.push(items);
        setDownloading(true);
    };

    const setError = (error) => {
        console.debug("error", error);
        addNotification("Move", error, "error");
    };

    const handleDownload = async () => {
        setDownloading(false);
        if (isDownloadingRef.current) {
            console.debug("handleDownload is already running");
            return;
        }
        isDownloadingRef.current = true;
        const worker = async () => {
            while (downloadQueueRef.current.length) {
                const files = downloadQueueRef.current.shift();
                download(files, setError);
            }
            isDownloadingRef.current = false;
        };
        await worker();
    };

    useEffect(() => {
        if (downloading) {
            handleDownload();
        }
    }, [downloading]);

    const setItemToCopy = async (item, existingNames) => {
        const filename = suggestNewName(item.name, existingNames);
        const destpath = getParentPath(item.path).replace(/\/$/, "") + "/" + filename;
        const taskId = filename + Date.now();
        const displayname = filename.length > 20 ? filename.slice(0, 20) + "..." : filename;

        const newTask = {
            taskId,
            name: displayname,
            value: 0,
            type: "copy",
            status: "copy",
            message: "",
            onCancel: () => {},
        };
        setTasks((prev) => [...prev, newTask]);
        setShowProgressView(true);

        await copyFile(item.path, destpath, ({ status, value, message, done, onCancel }) => {
            setTasks((prev) =>
                prev.map((task) =>
                    task.taskId === taskId
                        ? updateTask(task, { status, value, message, done, onCancel })
                        : task
                )
            );
        });
        setRefreshKey((prev) => !prev);
    };

    const setItemForGfptar = async (command, targetDir, targetItems, destDir, options) => {
        const taskId = destDir + Date.now();
        const displayname = destDir.length > 20 ? destDir.slice(0, 20) + "..." : destDir;
        const newTask = {
            taskId,
            name: displayname,
            value: 0,
            type: "gfptar",
            status: command,
            message: "",
            onCancel: () => {},
        };
        setTasks((prev) => [...prev, newTask]);
        setShowProgressView(true);

        await gfptar(
            command,
            targetDir,
            targetItems,
            destDir,
            options,
            ({ status, value, message, done, onCancel }) => {
                setTasks((prev) =>
                    prev.map((task) =>
                        task.taskId === taskId
                            ? updateTask(task, { status, value, message, done, onCancel })
                            : task
                    )
                );
            },
            () => setRefreshKey((prev) => !prev)
        );
    };

    return {
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
    };
}

export default useProgressTasks;
