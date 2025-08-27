import React from "react";
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
                        <img
                            src="./assets/Gfarm_logo_tate_color.svg"
                            alt="Logo"
                            width="30"
                            height="30"
                            className="d-inline-block align-text-top"
                        />
                    </button>
                </li>
                {parts.map((part, index) => {
                    const path = "/" + parts.slice(0, index + 1).join("/");
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
