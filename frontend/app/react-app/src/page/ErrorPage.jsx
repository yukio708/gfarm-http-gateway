import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

function ErrorPage({ error }) {
    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Error!</h1>
            <p>{error}</p>
            <Link to="/">Return to home</Link>
        </div>
    );
}

export default ErrorPage;

ErrorPage.propTypes = {
    error: PropTypes.string,
};
