import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

function parseOctal(octalStr) {
    let octal = parseInt(octalStr, 8);
    if (isNaN(octal)) return null;
    let special = (octal >> 9) & 7;
    let owner = (octal >> 6) & 7;
    let group = (octal >> 3) & 7;
    let other = octal & 7;
    return {
        owner: { r: !!(owner & 4), w: !!(owner & 2), x: !!(owner & 1) },
        group: { r: !!(group & 4), w: !!(group & 2), x: !!(group & 1) },
        other: { r: !!(other & 4), w: !!(other & 2), x: !!(other & 1) },
        special: {
            sticky: !!(special & 1),
        },
    };
}

function permissionsToOctal(p) {
    let special = p.special.sticky ? 1 : 0;
    let owner = (p.owner.r ? 4 : 0) | (p.owner.w ? 2 : 0) | (p.owner.x ? 1 : 0);
    let group = (p.group.r ? 4 : 0) | (p.group.w ? 2 : 0) | (p.group.x ? 1 : 0);
    let other = (p.other.r ? 4 : 0) | (p.other.w ? 2 : 0) | (p.other.x ? 1 : 0);
    return `${special}${owner}${group}${other}`.replace(/^0+/, "") || "0";
}

function PermsTab({ item, active }) {
    const [octal, setOctal] = useState("644");
    const [permissions, setPermissions] = useState({
        owner: { r: true, w: true, x: false },
        group: { r: true, w: false, x: false },
        other: { r: true, w: false, x: false },
        special: { sticky: false },
    });

    if (!item) return null;

    useEffect(() => {
        const parsed = parseOctal(octal);
        if (parsed) setPermissions(parsed);
    }, [octal]);

    useEffect(() => {
        const oct = permissionsToOctal(permissions);
        setOctal(oct);
    }, [permissions]);

    const toggle = (who, perm) => {
        setPermissions((prev) => ({
            ...prev,
            [who]: { ...prev[who], [perm]: !prev[who][perm] },
        }));
    };

    const toggleSpecial = (bit) => {
        setPermissions((prev) => ({
            ...prev,
            special: { ...prev.special, [bit]: !prev.special[bit] },
        }));
    };

    const handleApply = () => {
        console.log("Apply chmod for", item.path, "to", octal);
        // call API
    };

    if (!active) return <></>;

    return (
        <div>
            <div className="mt-3">
                <label className="form-label fw-bold">Input Octal:</label>
                <input
                    type="text"
                    value={octal}
                    onChange={(e) => setOctal(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                    className="form-control form-control-sm"
                    placeholder="e.g. 755"
                />
            </div>
            <div>
                {["owner", "group", "other"].map((name) => {
                    return (
                        <div key={name}>
                            <strong className="me-2">{name}</strong>
                            {["r", "w", "x"].map((perm) => (
                                <div className="form-check form-check-inline" key={perm}>
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={permissions[name][perm]}
                                        onChange={() => toggle(name, perm)}
                                        id={`perm-${name}-${perm}`}
                                    />
                                    <label
                                        className="form-check-label"
                                        htmlFor={`perm-${name}-${perm}`}
                                    >
                                        {perm.toUpperCase()}
                                    </label>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
            <div className="mt-2">
                <strong>Special:</strong>
                <label key={"sticky"} className="mx-1">
                    <input
                        type="checkbox"
                        checked={permissions.special.sticky}
                        onChange={() => toggleSpecial("sticky")}
                    />
                    {" sticky"}
                </label>
            </div>
            <button className="btn btn-sm btn-primary mt-3" onClick={handleApply}>
                Apply
            </button>
        </div>
    );
}

export default PermsTab;

PermsTab.propTypes = {
    item: PropTypes.object,
    active: PropTypes.bool,
};
