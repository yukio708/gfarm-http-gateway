import React, { useState } from "react";
import ModalWindow from "./Modal";
import PropTypes from "prop-types";

function ACLModal({ showModal, onClose, onSubmit }) {
    const [entries, setEntries] = useState([
        { type: "user", name: "", perms: { r: true, w: false, x: false } },
    ]);

    const handleChange = (index, field, value) => {
        const updated = [...entries];
        if (field === "type" || field === "name") {
            updated[index][field] = value;
        } else {
            updated[index].perms[field] = value;
        }
        setEntries(updated);
    };

    const addEntry = () => {
        setEntries([
            ...entries,
            { type: "user", name: "", perms: { r: false, w: false, x: false } },
        ]);
    };

    const handleSubmit = () => {
        const aclData = entries.map((e) => ({
            acl_type: e.type,
            acl_name: e.name,
            acl_perms: (e.perms.r ? "r" : "") + (e.perms.w ? "w" : "") + (e.perms.x ? "x" : ""),
            is_default: false,
        }));
        onSubmit(aclData);
        onClose();
    };

    return (
        <div>
            {showModal && (
                <ModalWindow
                    onCancel={onClose}
                    onConfirm={handleSubmit}
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
                                            value={entry.type}
                                            onChange={(e) =>
                                                handleChange(i, "type", e.target.value)
                                            }
                                        >
                                            <option value="user">User</option>
                                            <option value="group">Group</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="col-4">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Name"
                                            value={entry.name}
                                            onChange={(e) =>
                                                handleChange(i, "name", e.target.value)
                                            }
                                            disabled={entry.type === "other"}
                                        />
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
                                                    checked={entry.perms[perm]}
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
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
};

export default ACLModal;
