import { useState, useEffect, useCallback } from "react";
import getList from "../utils/getList";

function useFileList(dirPath, showHidden = true) {
    const [currentItems, setCurrentItems] = useState([]);
    const [listGetError, setListGetError] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchFiles = useCallback(async () => {
        if (!dirPath) return;
        setLoading(true);
        setListGetError(null);

        const stack = new Error().stack?.split("\n");
        const callerLine = stack?.[2]?.trim();
        console.debug("getList called from:", callerLine);

        try {
            const data = await getList(dirPath, showHidden);
            if (Array.isArray(data)) {
                setCurrentItems(data.filter((file) => file.name !== "." && file.name !== ".."));
                setListGetError(null);
            }
        } catch (err) {
            const error_message = `${err.name} : ${err.message}`;
            console.error("listGetError", error_message);
            setListGetError(error_message);
        } finally {
            setLoading(false);
        }
    }, [dirPath, showHidden]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    return { currentItems, listGetError, loading, refreshItems: fetchFiles };
}

export default useFileList;
