import { useState, useEffect } from "react";
import getAttribute from "../utils/getAttribute";
import { getSymlink } from "../utils/symlink";

function useGetAttr(item, getSymlinkPath = false, cksum = false) {
    const [detailContent, setDetailContent] = useState(null);
    const [getAttrError, setGetAttrError] = useState(null);

    useEffect(() => {
        const showDetail = async (item) => {
            try {
                const detail = await getAttribute(item.path, cksum);
                console.debug("detail:", detail);
                if (item.is_sym && getSymlinkPath) {
                    const info = await getSymlink(item.path);
                    detail.LinkPath = info.path;
                }

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
