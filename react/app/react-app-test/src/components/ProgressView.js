import React from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Button from 'react-bootstrap/Button';
import '../css/ProgressBar.css'

function ProgressView({now, label, onCancel}) {

    return (
        <div className='progressbar'>
            <ProgressBar now={now} label={label} />
            {now < 100 &&
            <Button variant="danger" size="sm" onClick={onCancel} className="mt-2">
                Cancel
            </Button>
            }
        </div> 
    );
}

export default ProgressView;