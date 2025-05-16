import { useState, useEffect } from 'react';
import getList from '../utils/getList';

function useFileList(dirPath, reload) {
    const [files, setFiles] = useState([]);
    const [error, setError] = useState(null);
  
    useEffect(() => {
        const fetchFiles = async () => {
            setError(null);
            const data = await getList(dirPath);
            if (Array.isArray(data)) {
                setFiles(data.filter(file => file.name !== '.' && file.name !== '..'));
            } else{
                setError(data);
            }
        };
  
        fetchFiles();
    }, [dirPath, reload]);
  
    return { files, error };
}

export default useFileList;