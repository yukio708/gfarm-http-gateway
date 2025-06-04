import React from "react";
import { BsHouse } from "react-icons/bs";
import PropTypes from "prop-types";

function CurrentDirView({ currentDir, onNavigate }) {
    const parts = currentDir.split("/").filter(Boolean); // remove empty strings

    return (
        <nav aria-label="breadcrumb">
            <ol className="breadcrumb p-2">
                <li className="breadcrumb-item">
                    <a
                        href="#"
                        onClick={e => {
                            e.preventDefault();
                            onNavigate("/");
                        }}
                    >
                        <BsHouse size="1.0rem" />
                    </a>
                </li>
                {parts.map((part, index) => {
                    const path = parts.slice(0, index + 1).join("/");
                    console.log("CurrentDirView: path:", path);
                    return (
                        <li key={index} className="breadcrumb-item">
                            <a
                                href="#"
                                onClick={e => {
                                    e.preventDefault();
                                    onNavigate(path);
                                }}
                            >
                                {part}
                            </a>
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
