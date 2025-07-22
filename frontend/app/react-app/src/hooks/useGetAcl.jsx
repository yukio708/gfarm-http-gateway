import { useState, useEffect, useCallback } from "react";
import { get_acl } from "../utils/acl";

function useGetAcl(item) {
    const [aclData, setAclData] = useState([]);
    const [aclError, setAclError] = useState(null);

    const fetchAcl = useCallback(async () => {
        if (!item?.path) return;
        try {
            const res = await get_acl(item.path);
            if (res.error) {
                throw new Error(res.error);
            }
            const acl = res.data.acl.map((acinfo) => {
                if (acinfo.acl_name === null && !acinfo.is_default) {
                    acinfo["base"] = true;
                }
                return acinfo;
            });
            const sorted = acl.sort((a, b) => (a.base !== b.base ? (a.base ? -1 : 1) : 0));
            setAclData(sorted);
            setAclError(null);
        } catch (err) {
            console.error("getAcl failed:", err);
            setAclError(`${err.name}: ${err.message}`);
        }
    }, [item]);

    useEffect(() => {
        fetchAcl();
    }, [fetchAcl]);

    return { aclData, aclError, refreshAcl: fetchAcl };
}

export default useGetAcl;
