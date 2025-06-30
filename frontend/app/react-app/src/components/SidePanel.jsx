import React, { useEffect, useState } from "react";
import "../css/SidePanel.css";
import ACLTab from "./ACLTab";
import DetailTab from "./DetailTab";
import PropTypes from "prop-types";

function SidePanel({ show, item, onHide, showTab = "detail" }) {
    const [activeTab, setActiveTab] = useState("detail");

    useEffect(() => {
        setActiveTab(showTab);
    }, [showTab]);

    return (
        <div
            className={`custom-sidepanel ${!show ? "hide" : ""}`}
            style={{ maxWidth: "100vw", width: "400px", zIndex: 1050 }}
        >
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                {item && <h5 className="m-0">{item.name}</h5>}
                <button className="btn-close" onClick={onHide}></button>
            </div>
            <div className="px-3 pt-2">
                <ul className="nav nav-tabs">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === "detail" ? "active" : ""}`}
                            onClick={() => setActiveTab("detail")}
                        >
                            Detail
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === "acl" ? "active" : ""}`}
                            onClick={() => setActiveTab("acl")}
                        >
                            Share
                        </button>
                    </li>
                </ul>
            </div>
            <div className="px-3 py-2 overflow-auto" style={{ maxHeight: "calc(100% - 100px)" }}>
                {show && <DetailTab item={item} active={activeTab === "detail"} />}
                {show && <ACLTab item={item} active={activeTab === "acl"} />}
            </div>
        </div>
    );
}

export default SidePanel;

SidePanel.propTypes = {
    show: PropTypes.bool,
    item: PropTypes.object,
    onHide: PropTypes.func,
    showTab: PropTypes.string,
};
