import React, { useEffect } from "react";
import useGetPath from "@hooks/useGetPath";
import displayFile from "@utils/display";
import { ROUTE_DOWNLOAD } from "@utils/config";
import { useUserInfo } from "@context/UserInfoContext";
import LoginPage from "@page/LoginPage";

function DownloadHandler() {
    const { userInfo, loading } = useUserInfo();
    const { gfarmPath } = useGetPath(ROUTE_DOWNLOAD);

    useEffect(() => {
        if (!loading && userInfo) {
            displayFile(gfarmPath, true);
        }
    }, [loading]);

    if (loading) return <p>...</p>;
    if (!userInfo) return <LoginPage />;
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
