// src/hooks/useFileList.js
import { useState, useEffect } from 'react';
import { API_URL } from '../utils/api_url';

function useFileList(dirPath, reload) {
    const [files, setFiles] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
  
    useEffect(() => {
        const fetchFiles = async () => {
            const fullpath = `${API_URL}/d` + dirPath + "?a=1&l=1&format=json";
            console.log(fullpath);
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(fullpath);
                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }
                const data = await response.json();
                setFiles(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
  
        fetchFiles();
    }, [dirPath, reload]);
  
    return { files, loading, error };
}

export default useFileList;