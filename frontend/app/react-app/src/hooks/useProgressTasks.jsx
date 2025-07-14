import { useState, useEffect, useRef } from "react";
import { upload, checkPermissoin } from "../utils/upload";
import { PARALLEL_LIMIT } from "../utils/config";
import download from "../utils/download";
import copyFile from "../utils/copy";
import { getParentPath, suggestNewName } from "../utils/func";

function useProgressTasks(setRefreshKey, addNotification) {
    const [tasks, setTasks] = useState([]);
    const [taskCount, setTaskCount] = useState(0);
    const [showProgressView, setShowProgressView] = useState(false);
    const [itemsToDelete, setItemsToDelete] = useState([]);
    const [itemsToMove, setItemsToMove] = useState([]);
    const uploadQueueRef = useRef([]);
    const [uploading, setUploading] = useState(false);
    const downloadQueueRef = useRef([]);
    const [downloading, setDownloading] = useState(false);
    const isUploadingRef = useRef(false);
    const isDownloadingRef = useRef(false);

    useEffect(() => {
        if (taskCount < tasks.length) {
            setShowProgressView(true);
        }
        setTaskCount(tasks.length);
    }, [tasks]);

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

        setUploading(true);
        console.debug("addFilesToUpload", newItems);
    };

    const runWithLimit = async (tasks, limit = 10) => {
        const results = [];
        const queue = [];

        for (const task of tasks) {
            const p = task().then((result) => {
                queue.splice(queue.indexOf(p), 1);
                return result;
            });
            queue.push(p);
            results.push(p);

            if (queue.length >= limit) {
                await Promise.race(queue);
            }
        }

        return Promise.all(results);
    };

    const handleUpload = async () => {
        setUploading(false);
        if (isUploadingRef.current) {
            console.debug("handleUpload is already running");
            return;
        }
        isUploadingRef.current = true;
        const uploadTasks = [];

        const destDirSet = {};
        const uploadDirSet = new Set();
        uploadDirSet.add("/");
        while (uploadQueueRef.current.length) {
            const uploadItem = uploadQueueRef.current.shift();

            if (!uploadItem.file) continue;
            console.log("uploadItem", uploadItem);

            let error = null;
            if (!(uploadItem.file.uploadDir in destDirSet)) {
                error = await checkPermissoin(uploadItem.file.uploadDir);
                destDirSet[uploadItem.file.uploadDir] = error;
                console.log("uploadItem.uploadDir", uploadItem.file.uploadDir);
                console.log("destDirSet", destDirSet);
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

            uploadTasks.push(async () => {
                return upload(
                    uploadItem.file,
                    uploadItem.fullpath,
                    uploadItem.taskId,
                    uploadDirSet,
                    setTasks
                ).catch((err) => {
                    console.error("uploadFile failed:", err);
                });
            });
        }
        isUploadingRef.current = false;

        await runWithLimit(uploadTasks, 1);
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
            setTasks((prev) => prev.filter((t) => !t.done));
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

    const setItemtoCopy = async (item, existingNames) => {
        const destpath =
            getParentPath(item.path).replace(/\/$/, "") +
            "/" +
            suggestNewName(item.name, existingNames);
        await copyFile(item.path, destpath, setTasks);
        setRefreshKey((prev) => !prev);
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
        setItemtoCopy,
    };
}

export default useProgressTasks;
