import React, { useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";
import { formatFileSize } from "../utils/func";
import useGetAttr from "../hooks/useGetAttr";
import PropTypes from "prop-types";

function DetailTab({ item, active }) {
    const { detailContent, getAttrError } = useGetAttr(item, true, true);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (getAttrError) {
            console.error("getAttribute failed:", getAttrError);
            addNotification("Detail", getAttrError, "error");
        }
    }, [getAttrError]);

    if (!active) return <></>;

    return (
        <div>
            {detailContent && (
                <table className="table table-striped table-bordered mt-4">
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
                                    <strong>Link Path</strong>
                                </td>
                                <td>{detailContent.LinkPath}</td>
                            </tr>
                        )}
                        <tr>
                            <td>
                                <strong>File Type</strong>
                            </td>
                            <td>{detailContent.Filetype}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Size</strong>
                            </td>
                            <td>{formatFileSize(detailContent.Size, false)}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Permissions</strong>
                            </td>
                            <td>{detailContent.Mode}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Ncopy</strong>
                            </td>
                            <td>{detailContent.Ncopy}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Access</strong>
                            </td>
                            <td>{detailContent.Access}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Modify</strong>
                            </td>
                            <td>{detailContent.Modify}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Change</strong>
                            </td>
                            <td>{detailContent.Change}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Owner</strong>
                            </td>
                            <td>{detailContent.Uid}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Group</strong>
                            </td>
                            <td>{detailContent.Gid}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Cksum</strong>
                            </td>
                            <td>{detailContent.Cksum}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Cksum Type</strong>
                            </td>
                            <td>{detailContent.CksumType}</td>
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
