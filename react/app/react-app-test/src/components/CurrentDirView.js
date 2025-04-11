import React from 'react';
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import { BsHouse } from "react-icons/bs";

function CurrentDirView({currentDir, onNavigate}) {
    const parts = currentDir.split('/').filter(Boolean); // remove empty strings

    return (
        <Breadcrumb>
            <Breadcrumb.Item onClick={() => onNavigate('/')}>
                <BsHouse />
            </Breadcrumb.Item>
            {parts.map((part, index) => {
                const path = '/'+ parts.slice(0, index + 1).join('/');
                return (
                    <Breadcrumb.Item key={index} onClick={() => onNavigate(path)}>
                        {part}
                    </Breadcrumb.Item>
                );
            })}
        </Breadcrumb>
    );
}

export default CurrentDirView;