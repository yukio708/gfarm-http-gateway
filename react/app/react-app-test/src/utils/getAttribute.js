import React from 'react';
import { encodePath } from './func'
import { API_URL } from './api_url';

async function getAttribute(filepath) {
    const epath = encodePath(filepath);
    const fullpath = `${API_URL}/attr${epath}`;
    try {
        const response = await fetch(fullpath);
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${text}`);
        }
        const json = JSON.parse(text);
        return json;  // assuming the data is in the correct format
    } catch (error) {
        console.error('Fetch error: ', error);
        return null;  // Return null in case of error
    }
}

export default getAttribute;