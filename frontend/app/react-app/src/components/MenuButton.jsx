import React from "react";
import PropTypes from "prop-types";

function MenuButton({ text, onClick, selectedItems }) {
    return (
        <div>
            <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => onClick(selectedItems)}
            >
                {text}
            </button>
        </div>
    );
}

export default MenuButton;

MenuButton.propTypes = {
    text: PropTypes.string,
    onClick: PropTypes.func,
    selectedItems: PropTypes.array,
};
