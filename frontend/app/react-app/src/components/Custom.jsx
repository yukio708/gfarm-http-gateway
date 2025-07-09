import React from "react";
import { useTheme } from "../context/ThemeContext";

export function ThemeSwitcher() {
    const { theme, setDarkMode } = useTheme();

    return (
        <div>
            <p>Current theme: {theme}</p>
            <button onClick={() => setDarkMode(theme === "light")}>Toggle Theme</button>
        </div>
    );
}
