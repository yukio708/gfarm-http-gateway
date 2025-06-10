import React, { useEffect, useRef } from "react";
import { formatFileSize } from "../utils/func";
import Offcanvas from "bootstrap/js/dist/offcanvas";
import PropTypes from "prop-types";

function DetailView({ detail, onHide }) {
    const offcanvasRef = useRef(null);
    const offcanvasInstance = useRef(null);

    useEffect(() => {
        if (!offcanvasRef.current) return;
        if (!offcanvasInstance.current) {
            offcanvasInstance.current = Offcanvas.getOrCreateInstance(offcanvasRef.current);

            // When offcanvas fully hides, call onHide
            offcanvasRef.current.addEventListener("hidden.bs.offcanvas", onHide);
        }

        // Show or hide offcanvas based on 'detail' prop
        if (detail) {
            offcanvasInstance.current.show();
        } else {
            offcanvasInstance.current.hide();
        }

        // Cleanup listener
        return () => {
            if (offcanvasRef.current) {
                offcanvasRef.current.removeEventListener("hidden.bs.offcanvas", onHide);
            }
        };
    }, [detail, onHide]);

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasFileDetail"
            ref={offcanvasRef}
            aria-labelledby="offcanvasFileDetailLabel"
        >
            <div className="offcanvas-header">
                <h5 className="offcanvas-title" id="offcanvasFileDetailLabel">
                    {detail.Name}
                </h5>
                <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                ></button>
            </div>
            <div className="offcanvas-body">
                <table className="table table-striped">
                    <tbody>
                        <tr>
                            <td>
                                <strong>File:</strong>
                            </td>
                            <td>{detail.File}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>File Type:</strong>
                            </td>
                            <td>{detail.Filetype}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Size:</strong>
                            </td>
                            <td>{formatFileSize(detail.Size)}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Permissions:</strong>
                            </td>
                            <td>{detail.Mode}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Accessed:</strong>
                            </td>
                            <td>{detail.Access}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Last Modified:</strong>
                            </td>
                            <td>{detail.Modify}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Change:</strong>
                            </td>
                            <td>{detail.Change}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Owner UID:</strong>
                            </td>
                            <td>{detail.Uid}</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Owner GID:</strong>
                            </td>
                            <td>{detail.Gid}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default DetailView;

DetailView.propTypes = {
    detail: PropTypes.object,
    onHide: PropTypes.func,
};
