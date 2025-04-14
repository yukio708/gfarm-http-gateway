import React from 'react';
import '../css/UploadPopup.css'

const ProgressPopup = ({ name, value, status, onCancel }) => {
    return (
        <div className="upload-popup" key={name}>
            <p><strong>{name}</strong></p>
            <progress value={value} max="100"></progress>
            <p>{status}</p>
            {value < 100 && <button onClick={onCancel}>Cancel</button>}
        </div>
    );
};

const ProgressView = ({tasks}) => { 
    if (tasks.length < 1) {
        return (<></>);
    }

    return (
        <div className="upload-popup-container">
            {tasks.map(task => (
            <ProgressPopup name={task.name} value={task.value} status={task.textContext} onCancel={task.onCancel} />
            ))}
        </div>
    );
};
  
export default ProgressView;