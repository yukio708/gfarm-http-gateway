import React from "react";
import { Navigate } from "react-router-dom";
import { ROUTE_STORAGE } from "../utils/config";
import { useUserInfo } from "../context/UserInfoContext";
import PropTypes from "prop-types";

function IndexHandler() {
    const { userInfo } = useUserInfo();
    return (
        <Navigate to={`${ROUTE_STORAGE}${userInfo ? userInfo.home_directory || "" : ""}`} replace />
    );
}

IndexHandler.propTypes = {
    home_directory: PropTypes.string,
};

export default IndexHandler;
