import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";

function SuggestInput({ id, value, onChange, suggestions, placeholder = null, disabled = false }) {
    const [focused, setFocused] = useState(false);
    const [filtered, setFiltered] = useState([]);
    const [highlight, setHighlight] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (typeof value !== "string") return;
        const f = suggestions.filter(
            (name) =>
                typeof name === "string" &&
                name.toLowerCase().includes(value.toLowerCase()) &&
                name !== value
        );
        setFiltered(f);
        setHighlight(0);
    }, [value, suggestions]);

    const handleKeyDown = (e) => {
        if (filtered.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((prev) => (prev + 1) % filtered.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((prev) => (prev - 1 + filtered.length) % filtered.length);
        } else if (e.key === "Tab" || e.key === "Enter") {
            if (filtered.length > 0) {
                e.preventDefault();
                onChange(filtered[highlight]);
            }
        }
    };

    return (
        <div style={{ position: "relative" }}>
            <input
                id={id}
                ref={inputRef}
                type="text"
                className="form-control"
                value={value}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 100)}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={placeholder ? placeholder : ""}
            />
            {focused && filtered.length > 0 && (
                <ul
                    className="list-group position-absolute w-100"
                    style={{ zIndex: 999, top: "100%" }}
                >
                    {filtered.map((name, i) => (
                        <li
                            key={i}
                            className={`list-group-item list-group-item-action ${
                                i === highlight ? "active" : ""
                            }`}
                            onMouseDown={() => onChange(name)}
                        >
                            {name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default SuggestInput;

SuggestInput.propTypes = {
    id: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func,
    suggestions: PropTypes.array,
    placeholder: PropTypes.string,
    disabled: PropTypes.bool,
};
