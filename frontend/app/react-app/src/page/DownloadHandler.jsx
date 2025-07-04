import React, { useEffect } from "react";
import useGetPath from "../hooks/useGetPath";
import displayFile from "../utils/display";
import { ROUTE_DOWNLOAD } from "../utils/config";

function DownloadHandler() {
    const { gfarmPath } = useGetPath(ROUTE_DOWNLOAD);

    useEffect(() => {
        console.log("downloading", gfarmPath);
        displayFile(gfarmPath, true);
    }, []);

    return (
        <div
            className="d-flex justify-content-center align-items-center"
            style={{ height: "80vh" }}
        >
            <div>Downloading file...</div>
        </div>
    );
}

export default DownloadHandler;
