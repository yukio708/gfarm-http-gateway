import React, { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";

const DateFormatContext = createContext();

export function useDateFormat() {
    return useContext(DateFormatContext);
}

export function DateFormatProvider({ children }) {
    const [dateFormat, setDateFormat] = useState("DMY");

    useEffect(() => {
        const savedDateFormat = localStorage.getItem("dateFormat");
        if (savedDateFormat) setDateFormat(savedDateFormat);
    }, []);

    useEffect(() => {
        localStorage.setItem("dateFormat", dateFormat);
    }, [dateFormat]);

    return (
        <DateFormatContext
            value={{
                dateFormat,
                setDateFormat,
            }}
        >
            {children}
        </DateFormatContext>
    );
}

DateFormatProvider.propTypes = {
    children: PropTypes.node,
};
