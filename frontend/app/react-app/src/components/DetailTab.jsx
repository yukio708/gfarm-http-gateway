import React, { useEffect, useState } from "react";
import { formatFileSize } from "../utils/func";
import getAttribute from "../utils/getAttribute";
import PropTypes from "prop-types";

function DetailTab({ item, active }) {
    const [detailContent, setDetailContent] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!item) return;

        const showDetail = async (itempath) => {
            try {
                const detail = await getAttribute(itempath);
                console.debug("detail:", detail);
                setDetailContent(detail);
            } catch (err) {
                console.error("getAttribute failed:", err);
                setError(err);
            }
        };
        showDetail(item.path);
    }, [item]);

    if (!active) return <></>;

    return (
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            {detailContent && (
                <table className="table table-striped mt-4">
                    <tbody>
                        <tr>
                            <td>
                                <strong>File:</strong>
                            </td>
                            <td>{detailContent.File}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>File Type:</strong>
                            </td>
                            <td>{detailContent.Filetype}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Size:</strong>
                            </td>
                            <td>{formatFileSize(detailContent.Size, false)}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Permissions:</strong>
                            </td>
                            <td>{detailContent.Mode}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Accessed:</strong>
                            </td>
                            <td>{detailContent.Access}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Last Modified:</strong>
                            </td>
                            <td>{detailContent.Modify}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Change:</strong>
                            </td>
                            <td>{detailContent.Change}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Owner UID:</strong>
                            </td>
                            <td>{detailContent.Uid}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Owner GID:</strong>
                            </td>
                            <td>{detailContent.Gid}</td>
                        </tr>
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default DetailTab;

DetailTab.propTypes = {
    item: PropTypes.object,
    active: PropTypes.bool,
};
