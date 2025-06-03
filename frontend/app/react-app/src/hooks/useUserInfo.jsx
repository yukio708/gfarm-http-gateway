import { useState, useEffect } from 'react';
import { get_login_status } from '../utils/getUserInfo';

function userUserInfo() {
    const [user, setUser] = useState([]);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
        const get_username = async () => {
            const name = await get_login_status();
            setUser(name);
            setLoading(false);
        };
  
        get_username();
    }, []);
  
    return { user, loading };
}

export default userUserInfo;