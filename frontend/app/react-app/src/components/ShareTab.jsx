import React, { useState, useRef } from "react";
import PropTypes from "prop-types";

function ShareTab({ item, active }) {
    const copyRef = useRef(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (copyRef.current) {
            navigator.clipboard.writeText(copyRef.current.value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // reset after 2s
        }
    };

    if (!active) return <></>;

    return (
        <div data-testid="share-tab">
            {item && (
                <div className="my-2">
                    <label className="form-label fw-bold">Link</label>
                    <div className="input-group input-group-sm">
                        <input
                            ref={copyRef}
                            type="text"
                            className="form-control"
                            readOnly
                            value={
                                item.is_dir
                                    ? `${window.location.origin}/#${item.path}`
                                    : `${window.location.origin}/file${item.path}`
                            }
                        />
                        <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={handleCopy}
                        >
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

ShareTab.propTypes = {
    item: PropTypes.object,
    active: PropTypes.bool,
};

export default ShareTab;
