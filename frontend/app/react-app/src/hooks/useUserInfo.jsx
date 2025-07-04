import { useState, useEffect } from "react";
import { get_login_status } from "../utils/getUserInfo";

function userUserInfo() {
    const [userinfo, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const get_username = async () => {
            const data = await get_login_status();
            setUser(data);
            setLoading(false);
            console.debug("user_info", data);
        };

        get_username();
    }, []);

    return { userinfo, loading };
}

export default userUserInfo;
