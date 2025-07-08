import { useState, useEffect } from "react";
import getList from "../utils/getList";

function useFileList(dirPath, reload) {
    const [currentItems, setCurrentFiles] = useState([]);
    const [listGetError, setListGetError] = useState(null);

    useEffect(() => {
        if (!dirPath) return;

        const fetchFiles = async () => {
            setListGetError(null);
            const data = await getList(dirPath);
            if (Array.isArray(data)) {
                setCurrentFiles(data.filter((file) => file.name !== "." && file.name !== ".."));
                setListGetError(null);
            } else {
                console.error("listGetError", data);
                setListGetError(data);
            }
        };

        fetchFiles();
    }, [dirPath, reload]);

    return { currentItems, listGetError };
}

export default useFileList;
