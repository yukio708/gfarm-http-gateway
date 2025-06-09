import React, { useEffect, useState } from "react";
import { getPlatform } from "../utils/func";
// import PropTypes from "prop-types";

function alreadyStandalone() {
    window.matchMedia?.("(display-mode: standalone)").matches;
}

function A2HSButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const platform = getPlatform();

    useEffect(() => {
        if (alreadyStandalone()) return; // user already installed the PWA

        // Listen for Android install prompt
        window.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });
        // Listen for install event (user installed from prompt)
        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
        });
    }, []);

    const handleInstallClick = () => {
        if (platform === "android" && deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
        } else if (platform === "ios") {
            alert("To install this app:\n1. Tap the Share button\n2. Choose 'Add to Home Screen'");
        }
    };
    if (isInstalled || platform === "desktop") return null;

    return (
        <button className="dropdown-item" onClick={handleInstallClick}>
            Install App
        </button>
    );
}

export default A2HSButton;

A2HSButton.propTypes = {};
