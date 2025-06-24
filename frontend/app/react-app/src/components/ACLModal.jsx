import React, { useState, useEffect } from "react";
import ModalWindow from "./Modal";
import { set_acl, get_acl } from "../utils/acl";
import PropTypes from "prop-types";

function ACLModal({ showModal, setShowModal, file }) {
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        console.debug("file", file);
        if (file === null) {
            return;
        }
        const get_list = async (path) => {
            const res = await get_acl(path);
            if (res.error) {
                console.error(res);
            } else {
                const acl = res.data.acl.map((acinfo) => {
                    if (acinfo.acl_name === null) {
                        acinfo["base"] = true;
                    }
                    return acinfo;
                });
                console.debug("acl", acl);
                setEntries(
                    acl.sort((a, b) => {
                        if (a.base !== b.base) {
                            return a.base ? -1 : 1;
                        }
                    })
                );
            }
        };
        get_list(file.path);
    }, [file]);

    const updateEntry = () => {
        const set_list = async (path) => {
            const res = await set_acl(path, entries);
            if (res !== "") {
                console.error(res);
            }
        };
        set_list(file.path);
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

    return (
        <div>
            {showModal && (
                <ModalWindow
                    onCancel={() => {
                        setShowModal(false);
                    }}
                    onConfirm={updateEntry}
                    comfirmText="Set ACL"
                    size="large"
                    title={<h5 className="modal-title">Set ACL</h5>}
                    text={
                        <div>
                            {entries.map((entry, i) => (
                                <div key={i} className="mb-3 row align-items-center">
                                    <div className="col-3">
                                        <select
                                            className="form-select"
                                            value={entry.acl_type}
                                            onChange={(e) =>
                                                handleChange(i, "acl_type", e.target.value)
                                            }
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
                                                placeholder="Name"
                                                value={
                                                    entry.acl_type === "user"
                                                        ? "owner"
                                                        : entry.acl_type === "group"
                                                          ? "owner's group"
                                                          : ""
                                                }
                                                disabled={true}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Name"
                                                value={entry.acl_name}
                                                onChange={(e) =>
                                                    handleChange(i, "acl_name", e.target.value)
                                                }
                                            />
                                        )}
                                    </div>
                                    <div className="col">
                                        {["r", "w", "x"].map((perm) => (
                                            <div
                                                key={perm}
                                                className="form-check form-check-inline"
                                            >
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
                                    <div className="col-1 text-end">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => {
                                                const updated = [...entries];
                                                updated.splice(i, 1);
                                                setEntries(updated);
                                            }}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={addEntry}
                            >
                                + Add Entry
                            </button>
                        </div>
                    }
                />
            )}
        </div>
    );
}

ACLModal.propTypes = {
    showModal: PropTypes.bool.isRequired,
    setShowModal: PropTypes.func.isRequired,
    file: PropTypes.object.isRequired,
};

export default ACLModal;
