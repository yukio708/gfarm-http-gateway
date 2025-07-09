// components/UserMenu.js
import PropTypes from "prop-types";
import React from "react";
import { API_URL } from "../utils/config";
import { useUserInfo } from "../context/UserInfoContext";

function UserMenu() {
    const { userInfo } = useUserInfo();
    return (
        <div className="dropdown">
            <button
                id="usermenu"
                type="button"
                className="btn btn-outline-secondary dropdown-toggle btn-sm"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                {userInfo ? userInfo.username : "None"}
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
                <li>
                    <a
                        className="dropdown-item"
                        data-bs-toggle="modal"
                        data-bs-target="#settingsModal"
                    >
                        Settings
                    </a>
                </li>
                <li>
                    <div className="dropdown-divider"></div>
                </li>
                <li>
                    <a className="dropdown-item" href={`${API_URL}/logout`}>
                        Logout
                    </a>
                </li>
            </ul>
        </div>
    );

    // return (
    //     <div>
    //         <button
    //             className="navbar-toggler"
    //             type="button"
    //             data-bs-toggle="offcanvas"
    //             data-bs-target="#offcanvasNavbar"
    //             aria-controls="offcanvasNavbar"
    //         >
    //             <span className="navbar-toggler-icon"></span>
    //         </button>
    //         <div
    //             className="offcanvas offcanvas-end"
    //             tabIndex="-1"
    //             id="offcanvasNavbar"
    //             aria-labelledby="offcanvasNavbarLabel"
    //         >
    //             <div className="offcanvas-header">
    //                 <h5 className="offcanvas-title" id="offcanvasNavbarLabel">
    //                     {user}
    //                 </h5>
    //                 <button
    //                     type="button"
    //                     className="btn-close"
    //                     data-bs-dismiss="offcanvas"
    //                     aria-label="Close"
    //                 ></button>
    //             </div>
    //             <div className="offcanvas-body">
    //                 <ul className="navbar-nav justify-content-end flex-grow-1 pe-0">
    //                     <li className="nav-item">
    //                         <a
    //                             className="nav-link active"
    //                             aria-current="page"
    //                             href={`${API_URL}/logout`}
    //                         >
    //                             Logout
    //                         </a>
    //                     </li>
    //                 </ul>
    //             </div>
    //         </div>
    //     </div>
    // );

    // return (
    //     <div
    //         ref={menuRef}
    //         className="user-menu dropdown"
    //         style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 1000 }}
    //     >
    //         <button
    //             className="btn btn-outline-secondary dropdown-toggle"
    //             onClick={() => setOpen(!open)}
    //         >
    //             {user || "User"}
    //         </button>
    //         {open && (
    //             <ul className="dropdown-menu show" style={{ right: 0, left: "auto" }}>
    //                 <li>
    //                     <a className="dropdown-item" href="#">
    //                         Profile
    //                     </a>
    //                 </li>
    //                 <li>
    //                     <button className="dropdown-item" onClick={onLogout}>
    //                         Logout
    //                     </button>
    //                 </li>
    //             </ul>
    //         )}
    //     </div>
    // );
}

export default UserMenu;

UserMenu.propTypes = {
    user: PropTypes.string,
};
