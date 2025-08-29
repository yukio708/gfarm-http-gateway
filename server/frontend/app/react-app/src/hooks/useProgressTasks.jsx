import { useState, useEffect, useRef } from "react";
import { upload, checkPermission } from "@utils/upload";
import download from "@utils/download";
import copyFile from "@utils/copy";
import gfptar from "@utils/archive";
import { PARALLEL_LIMIT } from "@utils/config";
import { getParentPath, suggestNewName } from "@utils/func";

function useProgressTasks(refreshItems, addNotification) {
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
            name: updates.name ?? task.name,
            status: updates.status ?? task.status,
            value: updates.value ?? task.value,
            message: updates.message ?? task.message,
            done: updates.done ?? task.done,
            onCancel: updates.onCancel ?? task.onCancel,
        };
    };

    const addItemsToUpload = (newItems) => {
        setTasks((prev) => prev.filter((t) => !t.done || t.status === "error"));
        const taskId = `${newItems[0].uploadDir}-${newItems.length}-${Date.now()}`;
        const fullPath = newItems[0].destPath;
        const displayPath = fullPath.replace(newItems[0].uploadDir + "/", "");
        const displayname =
            displayPath.length > 20 ? displayPath.slice(0, 20) + "..." : displayPath;
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
        setTasks((prev) => [...prev, newTask]);

        uploadQueueRef.current.push(async () => {
            await handleUpload(taskId, newItems);
        });

        setShowProgressView(true);

        setUploading(true);
        console.debug("addFilesToUpload", newItems);
    };

    const handleUpload = async (taskId, newItems) => {
        const destDirSet = {};
        const uploadDirSet = new Set(["/"]);

        for (const file of newItems) {
            if (!file) continue;
            if (tasks.some((task) => task.taskId === taskId && task.status === "cancelled")) {
                refreshItems();
                return;
            }

            const fullPath = file.destPath;
            const displayPath = fullPath.replace(file.uploadDir + "/", "");
            const displayname =
                displayPath.length > 20 ? displayPath.slice(0, 20) + "..." : displayPath;
            setTasks((prev) =>
                prev.map((task) => (task.taskId === taskId ? { ...task, name: displayname } : task))
            );

            let error = null;
            if (file.uploadDir && !(file.uploadDir in destDirSet)) {
                error = await checkPermission(file.uploadDir);
                destDirSet[file.uploadDir] = error;
                if (error) setError("Upload", error);
            } else {
                error = destDirSet[file.uploadDir];
            }
            if (error) continue;
            uploadDirSet.add(file.uploadDir);

            try {
                await upload(
                    file,
                    fullPath,
                    uploadDirSet,
                    ({ status, value, message, done, onCancel }) => {
                        setTasks((prev) =>
                            prev.map((task) =>
                                task.taskId === taskId
                                    ? updateTask(task, { status, value, message, done, onCancel })
                                    : task
                            )
                        );
                    },
                    setError
                );
            } catch (e) {
                console.error("uploadFile failed:", e);
            }
        }

        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? updateTask(task, { status: "completed", done: true })
                    : task
            )
        );
        refreshItems();
    };

    const runUploadWithLimit = async () => {
        if (isUploadingRef.current) return;
        isUploadingRef.current = true;

        const running = new Set();
        const startNext = () => {
            while (running.size < PARALLEL_LIMIT && uploadQueueRef.current.length > 0) {
                const fn = uploadQueueRef.current.shift();
                const p = Promise.resolve()
                    .then(fn)
                    .catch((e) => console.error("upload batch failed:", e))
                    .finally(() => running.delete(p));
                running.add(p);
            }
        };

        startNext();

        while (running.size > 0 || uploadQueueRef.current.length > 0) {
            if (running.size === 0) {
                startNext();
                continue;
            }
            await Promise.race(running);
            startNext();
        }

        isUploadingRef.current = false;
    };

    useEffect(() => {
        console.debug("Uploading", uploading);
        if (uploading) {
            setUploading(false);
            runUploadWithLimit();
        }
    }, [uploading]);

    const addItemsToDownload = (items) => {
        console.debug("addItemsToDownload: items:", items);
        setTasks((prev) => prev.filter((t) => !t.done || t.status === "error"));
        downloadQueueRef.current.push(items);
        setDownloading(true);
    };

    const setError = (title, error) => {
        console.debug("error", error);
        addNotification(title, error, "error");
    };

    const handleDownload = async () => {
        if (isDownloadingRef.current) {
            console.debug("handleDownload is already running");
            return;
        }
        isDownloadingRef.current = true;
        const worker = async () => {
            while (downloadQueueRef.current.length) {
                const files = downloadQueueRef.current.shift();
                download(files, (error) => setError("download", error));
            }
            isDownloadingRef.current = false;
        };
        await worker();
    };

    useEffect(() => {
        if (downloading) {
            setDownloading(false);
            handleDownload();
        }
    }, [downloading]);

    const setItemToCopy = async (item, existingNames) => {
        const filename = suggestNewName(item.name, existingNames);
        const destPath = getParentPath(item.path).replace(/\/$/, "") + "/" + filename;
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

        await copyFile(item.path, destPath, ({ status, value, message, done, onCancel }) => {
            setTasks((prev) =>
                prev.map((task) =>
                    task.taskId === taskId
                        ? updateTask(task, { status, value, message, done, onCancel })
                        : task
                )
            );
        });
        refreshItems();
    };

    const setItemForGfptar = async (command, targetDir, targetItems, destDir, options) => {
        const taskId = destDir + Date.now();
        const displayname = destDir.length > 20 ? destDir.slice(0, 20) + "..." : destDir;
        const newTask = {
            taskId,
            name: displayname,
            value: undefined,
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
            refreshItems
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
