import React, { useEffect, useRef, useState } from "react";
import { formatFileSize } from "../utils/func";
import Offcanvas from "bootstrap/js/dist/offcanvas";
import PropTypes from "prop-types";

function DetailView({ detail, onHide, showTab = "detail" }) {
    const offcanvasRef = useRef(null);
    const offcanvasInstance = useRef(null);
    const [activeTab, setActiveTab] = useState("detail");

    useEffect(() => {
        if (!offcanvasRef.current) return;
        if (!offcanvasInstance.current) {
            offcanvasInstance.current = Offcanvas.getOrCreateInstance(offcanvasRef.current);
            offcanvasRef.current.addEventListener("hidden.bs.offcanvas", onHide);
        }

        return () => {
            if (offcanvasRef.current) {
                offcanvasRef.current.removeEventListener("hidden.bs.offcanvas", onHide);
            }
        };
    }, []);

    useEffect(() => {
        setActiveTab(showTab);
    }, [showTab]);

    useEffect(() => {
        if (!offcanvasInstance.current) return;

        if (detail) {
            offcanvasInstance.current.show();
        }
    }, [detail]);

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasFileDetail"
            ref={offcanvasRef}
            aria-labelledby="offcanvasFileDetailLabel"
        >
            <div className="offcanvas-header">
                <h5 className="offcanvas-title" id="offcanvasFileDetailLabel">
                    {detail.Name}
                </h5>
                <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                ></button>
            </div>
            <div className="offcanvas-body">
                <ul className="nav nav-tabs" id="permissionTabs" role="tablist">
                    <li className="nav-item" role="presentation">
                        <button
                            className={`nav-link ${activeTab === "detail" ? "active" : ""}`}
                            id="detail-tab"
                            data-bs-toggle="tab"
                            data-bs-target="#detail"
                            type="button"
                        >
                            Detail
                        </button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button
                            className={`nav-link ${activeTab === "mode" ? "active" : ""}`}
                            id="mode-tab"
                            data-bs-toggle="tab"
                            data-bs-target="#mode"
                            type="button"
                        >
                            Mode (chmod)
                        </button>
                    </li>
                    <li className="nav-item" role="presentation">
                        <button
                            className={`nav-link ${activeTab === "acl" ? "active" : ""}`}
                            id="acl-tab"
                            data-bs-toggle="tab"
                            data-bs-target="#acl"
                            type="button"
                        >
                            ACL
                        </button>
                    </li>
                </ul>
                <div className="tab-content" id="permissionTabsContent">
                    <div
                        className={`tab-pane show p-3 ${activeTab === "detail" ? "active" : ""}`}
                        id="detail"
                        role="tabpanel"
                    >
                        <table className="table table-striped">
                            <tbody>
                                <tr>
                                    <td>
                                        <strong>File:</strong>
                                    </td>
                                    <td>{detail.File}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>File Type:</strong>
                                    </td>
                                    <td>{detail.Filetype}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Size:</strong>
                                    </td>
                                    <td>{formatFileSize(detail.Size)}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Permissions:</strong>
                                    </td>
                                    <td>{detail.Mode}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Accessed:</strong>
                                    </td>
                                    <td>{detail.Access}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Last Modified:</strong>
                                    </td>
                                    <td>{detail.Modify}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Change:</strong>
                                    </td>
                                    <td>{detail.Change}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Owner UID:</strong>
                                    </td>
                                    <td>{detail.Uid}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Owner GID:</strong>
                                    </td>
                                    <td>{detail.Gid}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div
                        className={`tab-pane show p-3 ${activeTab === "mode" ? "active" : ""}`}
                        id="mode"
                        role="tabpanel"
                    >
                        test1
                    </div>
                    <div
                        className={`tab-pane show p-3 ${activeTab === "acl" ? "active" : ""}`}
                        id="acl"
                        role="tabpanel"
                    >
                        test2
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DetailView;

DetailView.propTypes = {
    detail: PropTypes.object,
    onHide: PropTypes.func,
    showTab: PropTypes.string,
};
