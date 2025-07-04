import React, { useState, useRef } from "react";
import { ROUTE_STORAGE, ROUTE_DOWNLOAD } from "../utils/config";
import PropTypes from "prop-types";

function URLTab({ item, active }) {
    const copyLinkRef = useRef(null);
    const copyDownloadLinkRef = useRef(null);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedDownload, setCopiedDownload] = useState(false);

    const handleCopy = (ref, setCopiedFn) => {
        if (ref?.current) {
            navigator.clipboard.writeText(ref.current.value);
            setCopiedFn(true);
            setTimeout(() => setCopiedFn(false), 2000);
        }
    };

    if (!active) return <></>;

    return (
        <div data-testid="share-tab">
            {item && (
                <div className="my-2">
                    <label className="form-label fw-bold">Link in Web App</label>
                    <div className="input-group input-group-sm">
                        <input
                            ref={copyLinkRef}
                            type="text"
                            className="form-control"
                            readOnly
                            value={`${window.location.origin}/#${ROUTE_STORAGE}${item.path}`}
                        />
                        <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => handleCopy(copyLinkRef, setCopiedLink)}
                        >
                            {copiedLink ? "Copied!" : "Copy"}
                        </button>
                    </div>
                    {item.is_file && (
                        <div className="mt-2">
                            <label className="form-label fw-bold">Download Link</label>
                            <div className="input-group input-group-sm">
                                <input
                                    ref={copyDownloadLinkRef}
                                    type="text"
                                    className="form-control"
                                    readOnly
                                    value={`${window.location.origin}/#${ROUTE_DOWNLOAD}${item.path}`}
                                />
                                <button
                                    className="btn btn-outline-secondary"
                                    type="button"
                                    onClick={() =>
                                        handleCopy(copyDownloadLinkRef, setCopiedDownload)
                                    }
                                >
                                    {copiedDownload ? "Copied!" : "Copy"}
                                </button>
                            </div>
                            <label className="form-label fw-bold mt-2">Resource Path for API</label>
                            <div className="input-group input-group-sm">
                                <input
                                    ref={copyDownloadLinkRef}
                                    type="text"
                                    className="form-control"
                                    readOnly
                                    value={`${window.location.origin}/file${item.path}`}
                                />
                                <button
                                    className="btn btn-outline-secondary"
                                    type="button"
                                    onClick={() =>
                                        handleCopy(copyDownloadLinkRef, setCopiedDownload)
                                    }
                                >
                                    {copiedDownload ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

URLTab.propTypes = {
    item: PropTypes.object,
    active: PropTypes.bool,
};

export default URLTab;
