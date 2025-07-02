import React, { useEffect, useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import { formatFileSize } from "../utils/func";
import getAttribute from "../utils/getAttribute";
import getSymlink from "../utils/getSymlink";
import PropTypes from "prop-types";

function DetailTab({ item, active }) {
    const [detailContent, setDetailContent] = useState(null);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (!item) return;

        const showDetail = async (item) => {
            try {
                const detail = await getAttribute(item.path);
                console.debug("detail:", detail);
                if (item.is_sym) {
                    const info = await getSymlink(item.path);
                    detail.LinkPath = info.path;
                }

                setDetailContent(detail);
            } catch (err) {
                console.error("getAttribute failed:", err);
                addNotification("Detail", `${err.name} : ${err.message}`, "error");
            }
        };
        showDetail(item);
    }, [item]);

    if (!active) return <></>;

    return (
        <div>
            {detailContent && (
                <table className="table table-striped mt-4">
                    <tbody>
                        <tr>
                            <td>
                                <strong>File:</strong>
                            </td>
                            <td>{detailContent.File}</td>
                        </tr>
                        {detailContent.LinkPath && (
                            <tr>
                                <td>
                                    <strong>Link Path:</strong>
                                </td>
                                <td>{detailContent.LinkPath}</td>
                            </tr>
                        )}
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
