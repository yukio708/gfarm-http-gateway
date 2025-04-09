// src/hooks/useFileList.js
import { useState, useEffect } from 'react';
import { dummyFiles } from '../utils/dummyData'; // Import dummy data

function useFileList(dirPath) {
    const [files, setFiles] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
  
    useEffect(() => {
        const fetchFiles = async () => {
            console.log("dirPath:", dirPath);
            const fullpath = "../d" + dirPath + "?a=1&l=1";
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
                setFiles(dummyFiles); // debug
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
  
        fetchFiles();
    }, [dirPath]);
  
    return { files, loading, error };
}

export default useFileList;

// const GetList = async (dirPath) => {
//     const fullpath = "../d/" + dirPath + "?a=1&l=1";
//     try {
//       const res = await fetch(fullpath);
//       if (!res.ok) throw new Error("Fetch failed");
//       const data = await res.json();
  
//       return { newfiles: data, err: null };
//     } catch (error) {
//       return { newfiles: dummyFiles, err: error.message };
//     }
// };

// export default GetList;