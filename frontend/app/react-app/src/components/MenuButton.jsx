import PropTypes from 'prop-types';
import React from 'react';

function MenuButton({ text, onClick, selectedFiles }) {
    return (
        <div>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => onClick(selectedFiles)}>
                {text}
            </button>
        </div>
    )
}

export default MenuButton;

MenuButton.propTypes = {
    text: PropTypes.string,
    onClick: PropTypes.func,
    selectedFiles: PropTypes.array,
}