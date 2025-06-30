import React, { useState, useEffect, useRef } from "react";
import SuggestInput from "./SuggestInput";
import { set_acl, get_acl } from "../utils/acl";
import { getUsers, getGroups } from "../utils/getNameList";
import PropTypes from "prop-types";

function ACLTab({ item }) {
    const [entries, setEntries] = useState([]);
    const [userList, setUserList] = useState([]);
    const [groupList, setGroupList] = useState([]);
    const copyRef = useRef(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchSuggestions() {
            const users = await getUsers();
            const groups = await getGroups();
            console.debug("users", users);
            console.debug("groups", groups);
            setUserList(users);
            setGroupList(groups);
        }

        fetchSuggestions();
    }, []);

    useEffect(() => {
        if (!item) return;

        const fetchACL = async () => {
            const res = await get_acl(item.path);
            if (res.error) {
                console.error(res);
            } else {
                const acl = res.data.acl.map((acinfo) => {
                    if (acinfo.acl_name === null && !acinfo.is_default) {
                        acinfo["base"] = true;
                    }
                    return acinfo;
                });
                setEntries(acl.sort((a, b) => (a.base !== b.base ? (a.base ? -1 : 1) : 0)));
            }
        };

        fetchACL();
    }, [item]);

    const updateEntry = async () => {
        const res = await set_acl(item.path, entries);
        if (res !== "") {
            console.error(res);
        }
    };

    const handleChange = (index, field, value) => {
        const updated = [...entries];
        if (field === "acl_type" || field === "acl_name" || field === "is_default") {
            updated[index][field] = value;
            if (field === "acl_type" && value === "other") {
                updated[index]["acl_name"] = "";
            }
        } else {
            updated[index].acl_perms[field] = value;
        }
        setEntries(updated);
    };

    const addEntry = () => {
        setEntries([
            ...entries,
            {
                acl_type: "user",
                acl_name: "",
                acl_perms: { r: false, w: false, x: false },
                is_default: false,
            },
        ]);
    };

    const removeEntry = (index) => {
        const updated = [...entries];
        updated.splice(index, 1);
        setEntries(updated);
    };

    const handleCopy = () => {
        if (copyRef.current) {
            navigator.clipboard.writeText(copyRef.current.value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // reset after 2s
        }
    };

    return (
        <div data-testid="acl-tab">
            {item && (
                <div className="my-2">
                    <label className="form-label fw-bold">Shareable Link</label>
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
            <label className="form-label fw-bold mt-2">ACL</label>
            <div className="d-flex flex-column" style={{ maxHeight: "70vh" }}>
                <div className="flex-grow-1 overflow-auto pe-1" style={{ minHeight: 0 }}>
                    {entries.map((entry, i) => (
                        <div key={`acinfo-${i}`} className="border rounded p-2 mb-2">
                            {!entry.base && (
                                <div className="text-end">
                                    <button
                                        className="btn btn-sm btn-close"
                                        aria-label="Close"
                                        onClick={() => removeEntry(i)}
                                    ></button>
                                </div>
                            )}
                            <div className="row mb-2">
                                <div className="col-5">
                                    <label className="form-label fw-bold">Type</label>
                                    {entry.base ? (
                                        <select
                                            className="form-select form-select-sm"
                                            value={entry.acl_type}
                                            disabled
                                        >
                                            <option value="user">User</option>
                                            <option value="group">Group</option>
                                            <option value="other">Other</option>
                                        </select>
                                    ) : (
                                        <select
                                            className="form-select form-select-sm"
                                            value={entry.acl_type}
                                            onChange={(e) =>
                                                handleChange(i, "acl_type", e.target.value)
                                            }
                                        >
                                            <option value="user">User</option>
                                            <option value="group">Group</option>
                                            <option value="other">Other</option>
                                        </select>
                                    )}
                                </div>
                                <div className="col-7">
                                    <label className="form-label fw-bold">Name</label>
                                    {entry.base ? (
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={
                                                entry.acl_type === "user"
                                                    ? "owner"
                                                    : entry.acl_type === "group"
                                                      ? "owner's group"
                                                      : ""
                                            }
                                            disabled
                                        />
                                    ) : (
                                        <SuggestInput
                                            value={entry.acl_name}
                                            onChange={(val) => handleChange(i, "acl_name", val)}
                                            suggestions={
                                                entry.acl_type === "user" ? userList : groupList
                                            }
                                            disabled={entry.acl_type === "other"}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="mb-2">
                                <label className="form-label fw-bold me-2">Permissions</label>
                                {["r", "w", "x"].map((perm) => (
                                    <div className="form-check form-check-inline" key={perm}>
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={entry.acl_perms[perm]}
                                            onChange={(e) =>
                                                handleChange(i, perm, e.target.checked)
                                            }
                                            id={`perm-${i}-${perm}`}
                                        />
                                        <label
                                            className="form-check-label"
                                            htmlFor={`perm-${i}-${perm}`}
                                        >
                                            {perm.toUpperCase()}
                                        </label>
                                    </div>
                                ))}
                            </div>

                            {!entry.base && item.is_dir && (
                                <div className="mb-2">
                                    <label className="form-label fw-bold me-2">Default</label>
                                    <div className="form-check form-check-inline">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={entry.is_default}
                                            onChange={(e) =>
                                                handleChange(i, "is_default", e.target.checked)
                                            }
                                            id={`default-${i}`}
                                        />
                                        <label
                                            className="form-check-label"
                                            htmlFor={`default-${i}`}
                                        ></label>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="d-flex justify-content-between mt-3">
                        <button className="btn btn-secondary btn-sm" onClick={addEntry}>
                            + Add Entry
                        </button>
                    </div>
                </div>
                <div className="text-end mt-3">
                    <button className="btn btn-primary btn-sm " onClick={updateEntry}>
                        Set ACL
                    </button>
                </div>
            </div>
        </div>
    );
}

ACLTab.propTypes = {
    item: PropTypes.object,
};

export default ACLTab;
