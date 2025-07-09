import React, { createContext, useState, useContext, useEffect } from "react";
import PropTypes from "prop-types";

const ThemeContext = createContext();

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState("");
    const themes = ["light", "dark"];

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        console.debug("savedTheme", savedTheme);
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            setTheme("light");
        }
    }, []);

    useEffect(() => {
        if (themes.includes(theme)) {
            console.debug("useEffect", theme);
            localStorage.setItem("theme", theme);
            document.body.setAttribute("data-bs-theme", theme);
        }
    }, [theme]);

    const setDarkMode = (dark) => {
        console.debug("setDarkMode", dark);
        if (dark) {
            setTheme("dark");
        } else {
            setTheme("light");
        }
    };

    return <ThemeContext value={{ theme, setTheme, setDarkMode }}>{children}</ThemeContext>;
}

ThemeProvider.propTypes = {
    children: PropTypes.node,
};
