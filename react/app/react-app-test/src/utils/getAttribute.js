import React from 'react';
import { dummyDetail } from './dummyDetail';

async function getAttribute(filepath) {
    const fullpath = "../attr" + filepath;
    console.log("Attribute: filepath:", filepath);
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
        return dummyDetail;
        return null;  // Return null in case of error
    }
}

export default getAttribute;