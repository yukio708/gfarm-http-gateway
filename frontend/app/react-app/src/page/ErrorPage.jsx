import React from "react";
import { Link } from "react-router-dom";
import { ROUTE_STORAGE } from "../utils/config";
import PropTypes from "prop-types";

function ErrorPage({ error, home_directory }) {
    const reload = () => {
        window.location.reload();
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Error!</h1>
            <p>{error}</p>
            <p>
                <a href="#" onClick={reload}>
                    Reload
                </a>
            </p>
            <p>
                <Link to={`${ROUTE_STORAGE}${home_directory || ""}`}>Return to home</Link>
            </p>
        </div>
    );
}

export default ErrorPage;

ErrorPage.propTypes = {
    error: PropTypes.string,
    home_directory: PropTypes.string,
};
