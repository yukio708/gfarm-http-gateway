import { useLocation } from "react-router-dom";

function useGetPath(urlPrefix = "/storage") {
    const location = useLocation();
    const fullPath = decodeURIComponent(location.pathname);

    let pathHead = "";
    let gfarmPath = fullPath;

    if (fullPath.startsWith(urlPrefix)) {
        pathHead = urlPrefix;
        gfarmPath = fullPath.slice(urlPrefix.length) || "/";
    }

    return { pathHead, gfarmPath };
}

export default useGetPath;
