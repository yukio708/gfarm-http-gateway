import { useState, useEffect } from "react";
import getAttribute from "../utils/getAttribute";

function useGetAttr(item, getSymlinkPath = false, Checksum = false) {
    const [detailContent, setDetailContent] = useState(null);
    const [getAttrError, setGetAttrError] = useState(null);

    useEffect(() => {
        const showDetail = async (item) => {
            try {
                const detail = await getAttribute(item.path, Checksum, getSymlinkPath);
                setDetailContent(detail);
            } catch (err) {
                console.error("getAttribute failed:", err);
                setGetAttrError(`${err.name} : ${err.message}`);
            }
        };
        showDetail(item);
    }, [item]);

    return { detailContent, getAttrError };
}

export default useGetAttr;
