import React, { useState, useEffect } from "react";
import changeMode from "../utils/changeMode";
import getAttribute from "../utils/getAttribute";
import { useNotifications } from "../context/NotificationContext";
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
    const { addNotification } = useNotifications();
    const [octal, setOctal] = useState("644");
    const [permissions, setPermissions] = useState({
        owner: { r: true, w: true, x: false },
        group: { r: true, w: false, x: false },
        other: { r: true, w: false, x: false },
        special: { sticky: false },
    });

    useEffect(() => {
        if (!item || !active) return;

        const getMode = async (item) => {
            try {
                const detail = await getAttribute(item.path);
                console.debug("detail:", detail);
                setOctal(detail.Mode);
            } catch (err) {
                console.error("getAttribute failed:", err);
                addNotification("GetMode", `${err.name} : ${err.message}`, "error");
            }
        };
        getMode(item);
    }, [item, active]);

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

    const handleApply = async () => {
        const error = await changeMode(item.path, octal);
        if (error) addNotification("ChangeMode", error, "error");
    };

    if (!active) return <></>;

    return (
        <div>
            <div className="mt-3">
                <label htmlFor="perms-octal-input" className="form-label fw-bold">
                    Input Octal:
                </label>
                <input
                    id="perms-octal-input"
                    type="text"
                    value={octal}
                    onChange={(e) => setOctal(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                    className="form-control form-control-sm"
                    placeholder="e.g. 755"
                />
            </div>

            <div className="mt-2">
                <table className="table table-sm">
                    <thead>
                        <tr>
                            <th colSpan="4" className="fw-bold">
                                or select permissions below
                            </th>
                        </tr>
                        <tr>
                            <th></th>
                            <th>R</th>
                            <th>W</th>
                            <th>X</th>
                        </tr>
                    </thead>
                    <tbody>
                        {["owner", "group", "other"].map((name) => (
                            <tr key={name}>
                                <th scope="row" className="text-capitalize">
                                    {name}
                                </th>
                                {["r", "w", "x"].map((perm) => (
                                    <td key={perm}>
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={permissions[name][perm]}
                                            onChange={() => toggle(name, perm)}
                                            id={`perm-${name}-${perm}`}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                        <tr>
                            <th></th>
                            <td colSpan={3}></td>
                        </tr>
                        <tr>
                            <th>Sticky Bit</th>
                            <td colSpan={3}>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={permissions.special.sticky}
                                    onChange={() => toggleSpecial("sticky")}
                                    id="perm-sticky"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="text-end mt-4">
                <button className="btn btn-sm btn-primary" onClick={handleApply}>
                    Apply
                </button>
            </div>
        </div>
    );
}

export default PermsTab;

PermsTab.propTypes = {
    item: PropTypes.object,
    active: PropTypes.bool,
};
