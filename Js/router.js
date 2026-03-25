const routes = {
    "/": "AgencyDashboard.html",
    "/dashboard": "AgencyDashboard.html",
    "/clients": "Clients.html",
    "/campaigns": "Campaigns.html"
};

// PAGE INIT
const pageScripts = {
    "/": () => initDashboardPage(),
    "/dashboard": () => initDashboardPage(),
    "/clients": () => initClientsPage(),
    "/campaigns": () => initCampaignsPage()
};

async function loadRoute() {

    let path = window.location.pathname;
    const route = routes[path] || routes["/dashboard"];

    const res = await fetch(route);
    const html = await res.text();

    const app = document.getElementById("app-content");
    app.innerHTML = html;

    // ✅ PERFECT FIX (NO TIMING ISSUE EVER)
    await waitForDOM();

    // ✅ RUN PAGE SCRIPT
    if (pageScripts[path]) {
        pageScripts[path]();
    }
}

// 🔥 DOM WAIT FUNCTION
function waitForDOM() {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            setTimeout(resolve, 50);
        });
    });
}

// NAVIGATION
window.navigateTo = (url) => {
    history.pushState({}, "", url);
    loadRoute();
};

// LINK HANDLE
document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-link]");
    if (link) {
        e.preventDefault();
        navigateTo(link.getAttribute("href"));
    }
});

// BACK BUTTON
window.addEventListener("popstate", loadRoute);

// INIT
loadRoute();