import React, { useEffect, useRef } from "react";
import Offcanvas from "bootstrap/js/dist/offcanvas";
import PropTypes from "prop-types";

function ProgressView({ show, onHide, tasks }) {
    const canvasRef = useRef(null);
    const instanceRef = useRef(null);
    const handleHide = () => {
        console.log("debug handleHide");
        onHide();
    };
    useEffect(() => {
        if (!canvasRef.current) return;
        if (!instanceRef.current) {
            instanceRef.current = Offcanvas.getOrCreateInstance(canvasRef.current);
            canvasRef.current.addEventListener("hidden.bs.offcanvas", handleHide);
        }

        return () => {
            if (canvasRef.current) {
                canvasRef.current.removeEventListener("hidden.bs.offcanvas", handleHide);
            }
        };
    }, []);

    useEffect(() => {
        if (!instanceRef.current) return;

        if (show) {
            instanceRef.current.show();
        }
    }, [show]);

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            ref={canvasRef}
            aria-labelledby="transferProgressLabel"
        >
            <div className="offcanvas-header">
                <h5 className="offcanvas-title" id="transferProgressLabel">
                    Transfers
                </h5>
                <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                ></button>
            </div>
            <div className="offcanvas-body">
                {tasks.length === 0 ? (
                    <p className="text-muted">No active transfers.</p>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {tasks.map((task, index) => (
                            <div className="card shadow-sm" key={`${task.name}-${index}`}>
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="mb-0">
                                            {task.type === "upload" ? "⬆️" : "⬇️"} {task.name}
                                        </h6>
                                        <small
                                            className={`badge rounded-pill ${
                                                task.status === "completed"
                                                    ? "bg-success"
                                                    : task.status === "error"
                                                      ? "bg-danger"
                                                      : "bg-secondary"
                                            }`}
                                        >
                                            {task.status}
                                        </small>
                                    </div>
                                    <div className="progress" style={{ height: "8px" }}>
                                        <div
                                            className={`progress-bar ${
                                                task.status === "completed"
                                                    ? "bg-success"
                                                    : "bg-info"
                                            }`}
                                            role="progressbar"
                                            style={{ width: `${task.value}%` }}
                                            aria-valuenow={task.value}
                                            aria-valuemin="0"
                                            aria-valuemax="100"
                                        ></div>
                                    </div>
                                    <div className="d-flex justify-content-between mt-2">
                                        <small>{task.value}%</small>
                                        <small className="text-muted">{task.speed || "-"}</small>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProgressView;

ProgressView.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    tasks: PropTypes.array,
};
