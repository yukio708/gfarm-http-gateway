import { useState, useEffect, useRef } from "react";
import upload from "../utils/upload";
import download from "../utils/download";

function useProgressTasks(setRefreshKey) {
    const [tasks, setTasks] = useState([]);
    const [taskCount, setTaskCount] = useState(0);
    const [showProgressView, setShowProgressView] = useState(false);
    const [itemsToDelete, setItemsToDelete] = useState([]);
    const [itemsToMove, setItemsToMove] = useState([]);
    const uploadQueueRef = useRef([]);
    const [isUploading, setIsUploading] = useState(false);
    const downloadQueueRef = useRef([]);
    const [isDownloading, setIsDownloading] = useState(false);

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
        setTasks((prev) => prev.filter((t) => !t.done));
        const worker = async () => {
            const allUploads = [];
            while (uploadQueueRef.current.length) {
                const uploadFiles = uploadQueueRef.current.shift();
                const promise = upload(uploadFiles, setTasks);
                allUploads.push(promise);
            }
            setIsUploading(false);

            await Promise.allSettled(allUploads);
            console.debug("done!");
            setRefreshKey((prev) => !prev);
        };
        worker();
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

    const handleDownload = async () => {
        const worker = async () => {
            setTasks((prev) => prev.filter((t) => !t.done));
            while (downloadQueueRef.current.length) {
                const files = downloadQueueRef.current.shift();
                download(files, setTasks);
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
