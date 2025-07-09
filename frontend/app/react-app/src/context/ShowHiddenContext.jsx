import React, { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

const ShowHiddenContext = createContext();

export function useShowHidden() {
    return useContext(ShowHiddenContext);
}

export function ShowHiddenProvider({ children }) {
    const [showHidden, setShowHidden] = useState(false);

    useEffect(() => {
        const savedHidden = localStorage.getItem("showHidden");
        if (savedHidden) setShowHidden(savedHidden === "true");
    }, []);

    useEffect(() => {
        localStorage.setItem("showHidden", showHidden);
    }, [showHidden]);

    return (
        <ShowHiddenContext
            value={{
                showHidden,
                setShowHidden,
            }}
        >
            {children}
        </ShowHiddenContext>
    );
}

ShowHiddenProvider.propTypes = {
    children: PropTypes.node,
};
