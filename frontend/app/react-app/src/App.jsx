import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import HomePage from "./page/HomePage";
import ErrorPage from "./page/ErrorPage";
import DownloadHandler from "./page/DownloadHandler";
import IndexHandler from "./page/IndexHandler";
import { getIconCSS } from "./utils/getFileCategory";
import { ROUTE_STORAGE, ROUTE_DOWNLOAD } from "./utils/config";
import { loadExternalCss } from "./utils/func";
import { NotificationProvider } from "./context/NotificationContext";
import { UserInfoProvider } from "./context/UserInfoContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ShowHiddenProvider } from "./context/ShowHiddenContext";
import { ViewModeProvider } from "./context/ViewModeContext";

function App() {
    const [cssLoading, setCssLoading] = useState(true);

    useEffect(() => {
        const loadCSS = async () => {
            const css = await getIconCSS();
            loadExternalCss(css);
            setCssLoading(false);
        };
        loadCSS();
    }, []);

    if (cssLoading) {
        return <p>...</p>;
    }
    return (
        <UserInfoProvider>
            <ThemeProvider>
                <NotificationProvider>
                    <ShowHiddenProvider>
                        <ViewModeProvider>
                            <HashRouter>
                                <Routes>
                                    <Route path="/" element={<IndexHandler />} />
                                    <Route path={`${ROUTE_STORAGE}/*`} element={<HomePage />} />
                                    <Route
                                        path={`${ROUTE_DOWNLOAD}/*`}
                                        element={<DownloadHandler />}
                                    />
                                    <Route
                                        path="*"
                                        element={<ErrorPage error={"Page not found"} />}
                                    />
                                </Routes>
                            </HashRouter>
                        </ViewModeProvider>
                    </ShowHiddenProvider>
                </NotificationProvider>
            </ThemeProvider>
        </UserInfoProvider>
    );
}

export default App;
