import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import HomePage from "./page/HomePage";
import LoginPage from "./page/LoginPage";
import ErrorPage from "./page/ErrorPage";
import DownloadHandler from "./page/DownloadHandler";
import IndexHandler from "./page/IndexHandler";
import useUserInfo from "./hooks/useUserInfo";
import { getIconCSS } from "./utils/getFileCategory";
import { ROUTE_STORAGE, ROUTE_DOWNLOAD } from "./utils/config";
import { loadExternalCss } from "./utils/func";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
    const [cssLoading, setCssLoading] = useState(true);
    const { userinfo, loading } = useUserInfo();

    useEffect(() => {
        const loadCSS = async () => {
            const css = await getIconCSS();
            loadExternalCss(css);
            setCssLoading(false);
        };
        loadCSS();
    }, []);

    if (cssLoading || loading) {
        return <p>...</p>;
    }
    if (!userinfo) {
        return <LoginPage />;
    }
    console.debug("user_info", userinfo);
    return (
        <ThemeProvider>
            <NotificationProvider>
                <HashRouter>
                    <Routes>
                        <Route
                            path="/"
                            element={<IndexHandler home_directory={userinfo.home_directory} />}
                        />
                        <Route
                            path={`${ROUTE_STORAGE}/*`}
                            element={
                                <HomePage
                                    user={userinfo.username}
                                    home_directory={userinfo.home_directory}
                                />
                            }
                        />
                        <Route path={`${ROUTE_DOWNLOAD}/*`} element={<DownloadHandler />} />
                        <Route path="*" element={<ErrorPage error={"Page not fould"} />} />
                    </Routes>
                </HashRouter>
            </NotificationProvider>
        </ThemeProvider>
    );
}

export default App;
