import React, { useState, useRef, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import '../css/DetailView.css'

function DetailView({detail, onClose}) {
    if (!detail) return null;
    console.log("detail:", detail);

    return (
        <div className="detail-view">
            <Button variant="primary" className="close-button" onClick={onClose}>X</Button>
            <h4>{detail.Name}</h4>
            <table className="detail-table">
                <tbody>
                    <tr>
                        <td><strong>File:</strong></td>
                        <td>{detail.File}</td>
                    </tr>
                    <tr>
                        <td><strong>File Type:</strong></td>
                        <td>{detail.Filetype}</td>
                    </tr>
                    <tr>
                        <td><strong>Size:</strong></td>
                        <td>{detail.Size} KB</td>
                    </tr>
                    <tr>
                        <td><strong>Permissions:</strong></td>
                        <td>{detail.Mode}</td>
                    </tr>
                    <tr>
                        <td><strong>Accessed:</strong></td>
                        <td>{detail.Access}</td>
                    </tr>
                    <tr>
                        <td><strong>Last Modified:</strong></td>
                        <td>{detail.Modify}</td>
                    </tr>
                    <tr>
                        <td><strong>Change:</strong></td>
                        <td>{detail.Change}</td>
                    </tr>
                    <tr>
                        <td><strong>Owner UID:</strong></td>
                        <td>{detail.Uid}</td>
                    </tr>
                    <tr>
                        <td><strong>Owner GID:</strong></td>
                        <td>{detail.Gid}</td>
                    </tr>
                    <tr>
                        <td><strong>Metadata Host:</strong></td>
                        <td>{detail.MetadataHost}</td>
                    </tr>
                    <tr>
                        <td><strong>Metadata Port:</strong></td>
                        <td>{detail.MetadataPort}</td>
                    </tr>
                    <tr>
                        <td><strong>Metadata User:</strong></td>
                        <td>{detail.MetadataUser}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default DetailView;