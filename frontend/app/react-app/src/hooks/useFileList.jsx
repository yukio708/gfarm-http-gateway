import { useState, useEffect } from "react";
import getList from "../utils/getList";

function useFileList(dirPath, reload) {
    const [currentFiles, setCurrentFiles] = useState([]);
    const [listGetError, setListGetError] = useState(null);

    useEffect(() => {
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

    return { currentFiles, listGetError };
}

export default useFileList;
