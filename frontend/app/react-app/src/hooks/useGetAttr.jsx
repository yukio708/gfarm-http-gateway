import { useState, useEffect, useCallback } from "react";
import getAttribute from "../utils/getAttribute";

function useGetAttr(item, getSymlinkPath = false, Checksum = false) {
    const [detailContent, setDetailContent] = useState(null);
    const [getAttrError, setGetAttrError] = useState(null);

    const fetchAttr = useCallback(async () => {
        if (!item?.path) return;
        try {
            const detail = await getAttribute(item.path, Checksum, getSymlinkPath);
            setDetailContent(detail);
            setGetAttrError(null);
        } catch (err) {
            console.error("getAttribute failed:", err);
            setGetAttrError(`${err.name} : ${err.message}`);
        }
    }, [item]);

    useEffect(() => {
        fetchAttr();
    }, [fetchAttr]);

    return { detailContent, getAttrError, refreshAttr: fetchAttr };
}

export default useGetAttr;
