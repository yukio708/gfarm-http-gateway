import { useState, useEffect, useRef } from "react";
import upload from "../utils/upload";
import download from "../utils/download";

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
        uploadQueueRef.current.push(newItems);
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
        setTasks((prev) => prev.filter((t) => !t.done));
        const worker = async () => {
            while (uploadQueueRef.current.length) {
                const uploadFiles = uploadQueueRef.current.shift();
                await upload(uploadFiles, setTasks);
            }
            isUploadingRef.current = false;
            console.debug("done!");
        };
        await worker();
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
    };
}

export default useProgressTasks;
