import React, { useState, useEffect } from "react";
import { set_acl, get_acl } from "../utils/acl";
import PropTypes from "prop-types";

function ACLTab({ file }) {
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        if (!file) return;

        const fetchACL = async () => {
            const res = await get_acl(file.path);
            if (res.error) {
                console.error(res);
            } else {
                const acl = res.data.acl.map((acinfo) => {
                    if (acinfo.acl_name === null) {
                        acinfo["base"] = true;
                    }
                    return acinfo;
                });
                setEntries(acl.sort((a, b) => (a.base !== b.base ? (a.base ? -1 : 1) : 0)));
            }
        };

        fetchACL();
    }, [file]);

    const updateEntry = async () => {
        const res = await set_acl(file.path, entries);
        if (res !== "") {
            console.error(res);
        }
    };

    const handleChange = (index, field, value) => {
        const updated = [...entries];
        if (field === "acl_type" || field === "acl_name") {
            updated[index][field] = value;
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

    return (
        <div>
            {entries.map((entry, i) => (
                <div key={i} className="mb-3 row align-items-center">
                    <div className="col-3">
                        <select
                            className="form-select"
                            value={entry.acl_type}
                            onChange={(e) => handleChange(i, "acl_type", e.target.value)}
                        >
                            <option value="user">User</option>
                            <option value="group">Group</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="col-4">
                        {entry.base ? (
                            <input
                                type="text"
                                className="form-control"
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
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Name"
                                value={entry.acl_name}
                                onChange={(e) => handleChange(i, "acl_name", e.target.value)}
                            />
                        )}
                    </div>
                    <div className="col">
                        {["r", "w", "x"].map((perm) => (
                            <div className="form-check form-check-inline" key={perm}>
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={entry.acl_perms[perm]}
                                    onChange={(e) => handleChange(i, perm, e.target.checked)}
                                    id={`perm-${i}-${perm}`}
                                />
                                <label className="form-check-label" htmlFor={`perm-${i}-${perm}`}>
                                    {perm.toUpperCase()}
                                </label>
                            </div>
                        ))}
                    </div>
                    <div className="col">
                        {!entry.base && (
                            <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeEntry(i)}
                            >
                                &times;
                            </button>
                        )}
                    </div>
                </div>
            ))}

            <div className="d-flex justify-content-between mt-3">
                <button className="btn btn-secondary btn-sm" onClick={addEntry}>
                    + Add Entry
                </button>
            </div>

            <div className="d-flex justify-content-between mt-3">
                <button className="btn btn-primary btn-sm " onClick={updateEntry}>
                    Set ACL
                </button>
            </div>
        </div>
    );
}

ACLTab.propTypes = {
    file: PropTypes.object,
};

export default ACLTab;
