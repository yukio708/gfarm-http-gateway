import React, { useEffect, useState } from "react";
import { formatFileSize } from "../utils/func";
import getAttribute from "../utils/getAttribute";
import PropTypes from "prop-types";

function DetailTab({ file }) {
    const [detailContent, setDetailContent] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!file) return;

        const showDetail = async (filepath) => {
            try {
                const detail = await getAttribute(filepath);
                console.debug("detail:", detail);
                setDetailContent(detail);
            } catch (err) {
                console.error("getAttribute failed:", err);
                setError(err);
            }
        };
        showDetail(file.path);
    }, [file]);

    return (
        <div>
            {error && <div className="alert alert-danger">{error}</div>}
            {detailContent && (
                <table className="table table-striped">
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
                            <td>{formatFileSize(detailContent.Size)}</td>
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
    file: PropTypes.object,
};
