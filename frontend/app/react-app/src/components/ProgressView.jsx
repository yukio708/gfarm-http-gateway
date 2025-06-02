import React from 'react';
import '../css/ProgressView.css'

const ProgressPopup = ({ name, value, status, onCancel }) => {
    return (
        <div className="progress-popup" key={name}>
            <p><strong>{name}</strong></p>
            <progress value={value} max="100"></progress>
            <p>{status}</p>
            {value < 100 && <button className="btn btn-primary btn-sm" onClick={onCancel}>Cancel</button>}
        </div>
    );
};

const ProgressView = ({tasks}) => { 
    if (tasks.length < 1) {
        return (<></>);
    }

    return (
        <div className="progress-popup-container">
            {tasks.map(task => (
            <ProgressPopup key={task.name} name={task.name} value={task.value} status={task.status} onCancel={task.onCancel} />
            ))}
        </div>
    );
};
  
export default ProgressView;