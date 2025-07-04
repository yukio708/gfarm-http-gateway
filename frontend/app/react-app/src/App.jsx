import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import HomePage from "./page/HomePage";
import LoginPage from "./page/LoginPage";
import DownloadHandler from "./page/DownloadHandler";
import useUserInfo from "./hooks/useUserInfo";
import { getIconCSS } from "./utils/getFileCategory";
import { ROUTE_STORAGE, ROUTE_DOWNLOAD } from "./utils/config";
import { loadExternalCss } from "./utils/func";
import { NotificationProvider } from "./context/NotificationContext";

function App() {
    const [cssLoading, setCssLoading] = useState(true);
    const { user, userLoading } = useUserInfo();

    useEffect(() => {
        const loadCSS = async () => {
            const css = await getIconCSS();
            loadExternalCss(css);
            setCssLoading(false);
        };
        loadCSS();
    }, []);

    if (cssLoading || userLoading) {
        return <p>...</p>;
    }
    if (!user) {
        return <LoginPage />;
    }
    return (
        <NotificationProvider>
            <HashRouter>
                <Routes>
                    <Route path={`${ROUTE_STORAGE}/*`} element={<HomePage user={user} />} />
                    <Route path={`${ROUTE_DOWNLOAD}/*`} element={<DownloadHandler />} />
                </Routes>
            </HashRouter>
        </NotificationProvider>
    );
}

export default App;
