import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useShowHidden } from "../context/ShowHiddenContext";
import { useViewMode } from "../context/ViewModeContext";
import PropTypes from "prop-types";

function SettingsModal({ id = "settingsModal" }) {
    const { theme, setTheme } = useTheme();
    const { showHidden, setShowHidden } = useShowHidden();
    const { viewMode, setViewMode } = useViewMode();

    return (
        <div
            className="modal fade"
            id={id}
            tabIndex="-1"
            aria-labelledby="settingsModalLabel"
            aria-hidden="true"
        >
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="settingsModalLabel">
                            Settings
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        ></button>
                    </div>

                    <div className="modal-body">
                        <div className="mb-3">
                            <label htmlFor="theme-select" className="form-label fw-bold">
                                Theme
                            </label>
                            <select
                                className="form-select"
                                id="theme-select"
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                            >
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="view-select" className="form-label fw-bold">
                                View mode
                            </label>
                            <select
                                className="form-select"
                                id="view-select"
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value)}
                            >
                                <option value="list">List view</option>
                                <option value="icon_rg">Icon view</option>
                                <option value="icon_sm">Icon view (small)</option>
                            </select>
                        </div>

                        <div className="form-check mb-3">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                checked={showHidden}
                                onChange={(e) => setShowHidden(e.target.checked)}
                                id="show-hidden-check"
                            />
                            <label className="form-check-label" htmlFor="show-hidden-check">
                                Show hidden files
                            </label>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;

SettingsModal.propTypes = {
    id: PropTypes.string,
};
