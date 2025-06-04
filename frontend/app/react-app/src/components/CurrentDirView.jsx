import React from "react";
import { BsHouse } from "react-icons/bs";
import PropTypes from "prop-types";

function CurrentDirView({ currentDir, onNavigate }) {
    const parts = currentDir.split("/").filter(Boolean); // remove empty strings

    return (
        <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
                <li className="breadcrumb-item">
                    <button
                        type="button"
                        className="btn p-0"
                        onClick={() => {
                            onNavigate("/");
                        }}
                    >
                        <BsHouse size="1.0rem" />
                    </button>
                </li>
                {parts.map((part, index) => {
                    const path = parts.slice(0, index + 1).join("/");
                    console.log("CurrentDirView: path:", path);
                    return (
                        <li key={index} className="breadcrumb-item">
                            <button
                                type="button"
                                className="btn p-0"
                                onClick={() => {
                                    onNavigate(path);
                                }}
                            >
                                {part}
                            </button>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

export default CurrentDirView;

CurrentDirView.propTypes = {
    currentDir: PropTypes.string,
    onNavigate: PropTypes.func,
};
