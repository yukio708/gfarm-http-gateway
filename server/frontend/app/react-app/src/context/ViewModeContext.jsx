import React, { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

const ViewModeContext = createContext();

export function useViewMode() {
    return useContext(ViewModeContext);
}

export function ViewModeProvider({ children }) {
    const [viewMode, setViewMode] = useState("list");

    useEffect(() => {
        const savedView = localStorage.getItem("viewMode");
        if (savedView) setViewMode(savedView);
    }, []);

    useEffect(() => {
        localStorage.setItem("viewMode", viewMode);
    }, [viewMode]);

    return (
        <ViewModeContext
            value={{
                viewMode,
                setViewMode,
            }}
        >
            {children}
        </ViewModeContext>
    );
}

ViewModeProvider.propTypes = {
    children: PropTypes.node,
};
