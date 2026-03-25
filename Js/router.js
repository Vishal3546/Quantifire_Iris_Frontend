// ==========================================
// QUANTIFYRE IRIS - SECURE SPA ROUTER
// ==========================================

// 1. Route Definitions (Yahan hum URL ko HTML file aur JS function se link karte hain)
const routes = {
    "/": { template: "Views/AgencyDashboard.html", scriptId: "dashboard" },
    "/dashboard": { template: "Views/AgencyDashboard.html", scriptId: "dashboard" },
    "/clients": { template: "Views/Clients.html", scriptId: "clients" },
    "/campaigns": { template: "Views/Campaigns.html", scriptId: "campaigns" },
    "/leads": { template: "Views/Leads.html", scriptId: "leads" }, 
    "/locations": { template: "Views/Locations.html", scriptId: "locations" },
    "/reports": { template: "Views/Report&Analytics.html", scriptId: "reports" },
    "/settings": { template: "Views/Settings.html", scriptId: "settings" }
};

// 2. Main Router Function (Page load karta hai)
const loadRoute = async () => {
    // Current URL path nikalna
    let path = window.location.pathname;
    
    // Agar path exist nahi karta, toh dashboard par default kar do (Ya custom 404 page bana sakte ho)
    const route = routes[path] || routes["/dashboard"]; 
    const contentDiv = document.getElementById("app-content");

    try {
        // UI Feedback: Loading state dikhayein
        contentDiv.style.opacity = "0.4";
        
        // HTML file fetch karein server se
        const response = await fetch(route.template);
        if (!response.ok) throw new Error("Page content not found");
        
        const htmlText = await response.text();
        
        // Content inject karein aur opacity wapas normal karein
        contentDiv.innerHTML = htmlText;
        contentDiv.style.opacity = "1";

        // Active State update karein Sidebar mein
        updateSidebarActiveLink(path);

        // Securely page ka specific javascript chalayein
        executePageLogic(route.scriptId);

    } catch (error) {
        console.error("Routing Error:", error);
        contentDiv.style.opacity = "1";
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h2 style="color: #ff6b6b;">Oops! Page not found.</h2>
                <p>The page you are looking for doesn't exist or failed to load.</p>
                <button onclick="navigateTo('/dashboard')" style="padding: 10px 20px; cursor: pointer; background: #00ffaa; border: none; border-radius: 5px; color: #000; font-weight: bold;">Go to Dashboard</button>
            </div>
        `;
    }
};

// 3. Navigation Helper (URL change karta hai bina refresh kiye)
window.navigateTo = (url) => {
    window.history.pushState({}, "", url);
    loadRoute();
};

// 4. Sidebar Link Active State Manager
const updateSidebarActiveLink = (currentPath) => {
    // Pehle sabhi 'active' classes hatao
    document.querySelectorAll(".sidebar nav ul li").forEach(li => {
        li.classList.remove("active");
    });

    // Phir jo link current URL se match karta hai, uspar 'active' lagao
    const activeLink = document.querySelector(`.sidebar nav ul li a[href="${currentPath}"]`);
    if (activeLink) {
        activeLink.closest("li").classList.add("active");
    }
};

// 5. Script Execution Controller (The Gatekeeper - Prevents JS Conflicts)
const executePageLogic = (scriptId) => {
    // Ye function check karega ki console mein function exist karta hai ya nahi, tabhi chalayega
    
    if (scriptId === "dashboard" && typeof initDashboardPage === "function") {
        initDashboardPage();
    } 
    else if (scriptId === "clients" && typeof initClientsPage === "function") {
        initClientsPage();
    }
    else if (scriptId === "campaigns" && typeof initCampaignsPage === "function") {
        initCampaignsPage();
    }
    // Aise hi aage aane wale pages yahan add hote jayenge...
};

// 6. Global Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    
    // Link Clicks ko Intercept karna (jahan 'data-link' attribute ho)
    document.body.addEventListener("click", e => {
        if (e.target.matches("[data-link]") || e.target.closest("[data-link]")) {
            e.preventDefault();
            const link = e.target.matches("[data-link]") ? e.target : e.target.closest("[data-link]");
            navigateTo(link.getAttribute("href"));
        }
    });

    // Pehli baar website open hone par URL ke hisab se page load karna
    loadRoute();
});

// Browser ke Back aur Forward buttons ko support karne ke liye
window.addEventListener("popstate", loadRoute);