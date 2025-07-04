import React from "react";
import { Navigate } from "react-router-dom";
import { ROUTE_STORAGE } from "../utils/config";
import PropTypes from "prop-types";

function IndexHandler({ home_directory }) {
    return <Navigate to={`${ROUTE_STORAGE}${home_directory || ""}`} replace />;
}

IndexHandler.propTypes = {
    home_directory: PropTypes.string,
};

export default IndexHandler;
