(function () {
    const path = window.location.pathname;
    const isLoggedIn = localStorage.getItem("isAgencyLoggedIn");
    const agencyEmail = localStorage.getItem("agencyEmail");

    // Cookie check function
    function getCookie(name) {
        let nameEQ = name + "=";
        let ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    const loginCookie = getCookie("isAgencyLoggedIn");

    // --- CASE 1: AGAR USER LOGIN PAGE PAR HAI ---
    if (path.includes("AgencyLogin.html") || path === "/AgencyLogin.html") {
        // Agar user pehle se login hai (Storage + Cookie dono hain)
        if (isLoggedIn === "true" && loginCookie) {
            console.log("Already logged in. Redirecting to Dashboard...");
            window.location.href = "AgencyDashboard.html";
            return; // Guard ko yahin rok dein
        }
        return; 
    }

    if (!isLoggedIn || isLoggedIn !== "true" || !loginCookie || !agencyEmail) {
        console.warn("Session expired or not found. Redirecting to Login...");
        localStorage.clear();
        // Cookie saaf karein
        document.cookie = "isAgencyLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "AgencyLogin.html";
    }
})();