import React from "react";
import { formatFileSize } from "@utils/func";
import PropTypes from "prop-types";

function DetailTab({ active, detailContent }) {
    if (!active) return null;

    const rows = [
        { label: "File", value: detailContent?.File || "" },
        detailContent?.LinkPath && { label: "Link Path", value: detailContent?.LinkPath || "" },
        { label: "File Type", value: detailContent?.Filetype || "" },
        { label: "Size", value: formatFileSize(detailContent?.Size || 0, false) },
        { label: "Permissions", value: detailContent?.Mode || "" },
        { label: "Ncopy", value: detailContent?.Ncopy || "" },
        { label: "Access", value: detailContent?.Access || "" },
        { label: "Modify", value: detailContent?.Modify || "" },
        { label: "Change", value: detailContent?.Change || "" },
        { label: "Owner", value: detailContent?.Uid || "" },
        { label: "Group", value: detailContent?.Gid || "" },
        { label: "Cksum", value: detailContent?.Cksum || "" },
        { label: "Cksum Type", value: detailContent?.CksumType || "" },
    ].filter(Boolean);

    return (
        <div>
            <table className="table table-striped table-bordered mt-4">
                <tbody>
                    {rows.map(({ label, value }) => (
                        <tr key={label}>
                            <td>
                                <strong>{label}</strong>
                            </td>
                            <td className="text-break">{value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default DetailTab;

DetailTab.propTypes = {
    active: PropTypes.bool,
    detailContent: PropTypes.object,
};
