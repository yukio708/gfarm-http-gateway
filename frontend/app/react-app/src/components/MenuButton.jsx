import React, { useRef } from 'react';

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