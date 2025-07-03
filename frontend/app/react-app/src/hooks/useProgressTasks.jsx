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
    const [isUploading, setIsUploading] = useState(false);
    const downloadQueueRef = useRef([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const isRunningRef = useRef(false);

    useEffect(() => {
        if (taskCount < tasks.length) {
            setShowProgressView(true);
        }
        setTaskCount(tasks.length);
    }, [tasks]);

    const addItemsToUpload = (newItems) => {
        uploadQueueRef.current.push(newItems);
        setIsUploading(true);
        console.debug("addFilesToUpload", newItems);
    };

    const handleUpload = async () => {
        if (isRunningRef.current) {
            console.debug("handleUpload is already running");
            return;
        }
        isRunningRef.current = true;
        setTasks((prev) => prev.filter((t) => !t.done));
        const worker = async () => {
            while (uploadQueueRef.current.length) {
                const uploadFiles = uploadQueueRef.current.shift();
                await upload(uploadFiles, setTasks);
            }
            setIsUploading(false);
            isRunningRef.current = false;
            console.debug("done!");
        };
        await worker();
        setRefreshKey((prev) => !prev);
    };

    useEffect(() => {
        console.debug("isUploading", isUploading);
        if (isUploading) {
            handleUpload();
        }
    }, [isUploading]);

    const addItemsToDownload = (items) => {
        console.debug("addItemsToDownload: items:", items);
        downloadQueueRef.current.push(items);
        setIsDownloading(true);
    };

    const setError = (error) => {
        console.debug("error", error);
        addNotification("Move", error, "error");
    };

    const handleDownload = async () => {
        const worker = async () => {
            setTasks((prev) => prev.filter((t) => !t.done));
            while (downloadQueueRef.current.length) {
                const files = downloadQueueRef.current.shift();
                download(files, setError);
            }
            setIsDownloading(false);
        };
        await worker();
    };

    useEffect(() => {
        if (isDownloading) {
            handleDownload();
        }
    }, [isDownloading]);

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
