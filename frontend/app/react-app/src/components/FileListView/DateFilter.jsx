import React from "react";
import { options } from "@utils/func";
import PropTypes from "prop-types";

function DateFilter({ dateFilter, setDateFilter }) {
    const handleSelect = (val) => {
        setDateFilter(val);
    };

    const selectedLabel =
        options.find((opt) => opt.value === dateFilter)?.label || "Filter by Modified";

    return (
        <div className="btn-group" role="group">
            <button
                className="btn btn-sm dropdown-toggle btn-outline-secondary"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                data-testid="date-filter-dropdown"
            >
                {selectedLabel}
            </button>
            <ul className="dropdown-menu p-2" style={{ minWidth: "150px" }}>
                <li>
                    <button
                        className="btn btn-sm btn-link text-danger d-flex w-100"
                        onClick={() => handleSelect("all")}
                        type="button"
                        data-testid="date-filter-clear-button"
                    >
                        Clear filter
                    </button>
                </li>
                <hr className="dropdown-divider" />
                {options.map((opt) => (
                    <li key={opt.value}>
                        <button
                            id={`dropdown-filter-${opt.value}`}
                            className={`dropdown-item ${dateFilter === opt.value ? "active" : ""}`}
                            onClick={() => handleSelect(opt.value)}
                        >
                            {opt.label}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default DateFilter;

DateFilter.propTypes = {
    dateFilter: PropTypes.string,
    setDateFilter: PropTypes.func,
};
