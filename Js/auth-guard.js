(function () {
    const path = window.location.pathname;
    const isLoggedIn = localStorage.getItem("isAgencyLoggedIn");
    const agencyEmail = localStorage.getItem("agencyEmail");

    // --- CASE 1: AGAR USER LOGIN PAGE PAR HAI ---
    if (path.includes("AgencyLogin.html") || path === "/AgencyLogin.html" || path.endsWith("AgencyLogin.html")) {
        if (isLoggedIn === "true" && agencyEmail) {
            console.log("Already logged in. Redirecting to Dashboard...");
            window.location.replace("AgencyDashboard.html");
            return; 
        }
        return; 
    }

    // --- CASE 2: AGAR BINA LOGIN KE DASHBOARD PAR HAI ---
    if (!isLoggedIn || isLoggedIn !== "true" || !agencyEmail) {
        console.warn("Session expired or not found. Redirecting to Login...");
        localStorage.clear();
        window.location.replace("AgencyLogin.html");
    }
})();