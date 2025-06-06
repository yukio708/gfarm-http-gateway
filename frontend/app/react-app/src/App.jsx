import React, { useState, useEffect } from "react";
import { HashRouter } from "react-router-dom";
import HomePage from "./page/HomePage";
import LoginPage from "./page/LoginPage";
import useUserInfo from "./hooks/useUserInfo";
import { getIconCSS } from "./utils/getFileCategory";
import { loadExternalCss } from "./utils/func";

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
        <HashRouter>
            <HomePage user={user} />
        </HashRouter>
    );
}

export default App;
