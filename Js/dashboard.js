// ==========================================
// GLOBAL VARIABLES
// ==========================================
let sourceChart = null;
let map = null;
let autocomplete = null;
let drawingManager = null;
let currentMarker = null;
let currentPage = 1;
let rowsPerPage = 4;

// ==========================================
// THE GATEKEEPER FUNCTION (Router call karega)
// ==========================================
window.initDashboardPage = function() {
    const aid = localStorage.getItem("agencyId");
    
    // Auth Check
    if (!aid || aid === "null" || aid === "undefined") {
        alert("Session expired. Please log in.");
        window.location.href = "AgencyLogin.html";
        return;
    }

    // Profile Sync
    const savedName = localStorage.getItem("agencyName");
    const savedEmail = localStorage.getItem("agencyEmail");
    if (savedName && savedName !== "undefined" && savedName !== "null") {
        $(".display-agency-name, .user-mini-profile p, .d-name").text(savedName);
    } else {
        $(".display-agency-name, .user-mini-profile p, .d-name").text("Agency User");
    }
    $("#display-agency-email").text((savedEmail && savedEmail !== "undefined" && savedEmail !== "null") ? savedEmail : "No Email Found");

    // Init All Components
    initMap();
    initChart();
    loadDashboardData(aid);

    // ==========================================
    // DASHBOARD SEARCH LOGIC
    // ==========================================
    let searchClients = [];
    let searchCampaigns = [];

    $.ajax({
        url: `https://quantifire-iris-backend.onrender.com/api/agency/clients/all?agencyId=${aid}`,
        type: "GET", headers: { "X-Agency-Id": aid },
        success: data => searchClients = Array.isArray(data) ? data : (data.content || [])
    });
    $.ajax({
        url: `https://quantifire-iris-backend.onrender.com/api/agency/campaigns/all?filter=all`,
        type: "GET", headers: { "X-Agency-Id": aid },
        success: data => searchCampaigns = Array.isArray(data) ? data : (data.content || [])
    });

    $("#dashboardSearchInput").off("keyup input").on("keyup input", function () {
        let query = $(this).val().toLowerCase().trim();
        let suggestionBox = $("#dashboardSuggestionList");
        suggestionBox.empty();

        if (query.length < 1) { suggestionBox.hide(); return; }

        let filteredClients = searchClients.filter(c => (c.clientName || "").toLowerCase().includes(query));
        let filteredCampaigns = searchCampaigns.filter(cp => (cp.campaignName || "").toLowerCase().includes(query));

        if (filteredClients.length === 0 && filteredCampaigns.length === 0) {
            suggestionBox.append('<li class="suggestion-item">No results found</li>');
        } else {
            filteredClients.forEach(c => {
                suggestionBox.append(`<li class="suggestion-item" onclick="navigateTo('/client-details?id=${c.id}')"><span><i class="fa-solid fa-user"></i> ${c.clientName}</span><span class="type-badge type-client">Client</span></li>`);
            });
            filteredCampaigns.forEach(cp => {
                suggestionBox.append(`<li class="suggestion-item" onclick="navigateTo('/campaign-details?id=${cp.id}')"><span><i class="fa-solid fa-bullhorn"></i> ${cp.campaignName}</span><span class="type-badge type-campaign">Campaign</span></li>`);
            });
        }
        suggestionBox.show();
    });

    $(document).off('click.search').on('click.search', function (e) { 
        if (!$(e.target).closest('.search-bar').length) $("#dashboardSuggestionList").hide(); 
    });

    // Stat Cards Clicks
    $("#statcard1").off("click").on("click", () => navigateTo("/campaigns"));
    $("#statcard2").off("click").on("click", () => navigateTo("/leads"));
    $("#statcard3").off("click").on("click", () => navigateTo("/clients"));
    $("#statcard4").off("click").on("click", () => navigateTo("/reports"));

    $(document).off('click.customdropdown').on('click.customdropdown', function (e) {
        if (!$(e.target).closest('.custom-dropdown').length) $('.custom-dropdown').removeClass('active');
    });
}

// ==========================================
// MAP, CHART & DATA FUNCTIONS
// ==========================================
function initMap() {
    if (!document.getElementById("geofenceMap")) return;
    map = new google.maps.Map(document.getElementById("geofenceMap"), {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#091815" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
        ]
    });

    const input = document.getElementById("customSearchInput");
    if(input) {
        autocomplete = new google.maps.places.Autocomplete(input);
        autocomplete.bindTo("bounds", map);
        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry) return;
            map.setCenter(place.geometry.location);
            map.setZoom(17);
            if (currentMarker) currentMarker.setMap(null);
            currentMarker = new google.maps.Marker({ position: place.geometry.location, map: map });
        });
    }
    drawingManager = new google.maps.drawing.DrawingManager({ drawingControl: false });
    drawingManager.setMap(map);
}

function initChart() {
    const ctx = document.getElementById('sourceChart');
    if (!ctx) return;
    if (sourceChart) sourceChart.destroy(); 
    sourceChart = new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['Google Ads', 'Facebook', 'Instagram', 'Whatsapp'],
            datasets: [{
                data: [0, 0, 0, 0], 
                backgroundColor: ['#00ffaa', '#ffcc00', '#ff6b6b', '#00d4ff'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function loadDashboardData(aid) {
    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/dashboard/summary",
        type: "GET",
        headers: { "X-Agency-Id": aid },
        success: function (data) {
            $("#statcard1 h2").text(data.totalCampaigns || 0);
            $("#statcard2 h2").text(data.totalLeads || 0);
            $("#statcard3 h2").text(data.totalClients || 0);
            $("#statcard4 h2").text(data.totalReportDownloaded || 0);

            // Table Body Logic
            let tableBody = $("#clientTableBody");
            tableBody.empty();
            if (data.clientInsights && data.clientInsights.length > 0) {
                data.clientInsights.forEach(client => {
                    tableBody.append(`<tr><td><strong>${client.clientName}</strong></td><td>${client.agencyName || 'N/A'}</td><td>${client.totalCampaigns || 0}</td><td>${client.leads || 0}</td><td>${parseFloat(client.conversionRate || 0).toFixed(2)}%</td></tr>`);
                });
                currentPage = 1;
                window.initPagination();
            } else {
                tableBody.append(`<tr><td colspan="5" style="text-align:center;">No data found.</td></tr>`);
            }

            if (data.sourceStats) updatePieChart(data.sourceStats);
            if (data.mapPoints) updateMapMarkers(data.mapPoints);
        }
    });
}

function updatePieChart(sourceData) {
    if(!sourceChart) return;
    sourceChart.data.datasets[0].data = [sourceData["Google Ads"] || 0, sourceData["Facebook"] || 0, sourceData["Instagram"] || 0, sourceData["Whatsapp"] || 0];
    sourceChart.update();
}

function updateMapMarkers(locations) {
    if(!map) return;
    const geocoder = new google.maps.Geocoder();
    locations.forEach(loc => {
        geocoder.geocode({ 'address': loc.location }, (results, status) => {
            if (status === 'OK') {
                new google.maps.Marker({
                    position: results[0].geometry.location, map: map, title: loc.name
                });
            }
        });
    });
}

// ==========================================
// PAGINATION LOGIC
// ==========================================
window.initPagination = function() {
    const rows = $('#clientTableBody tr');
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

    function updateTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = Math.min(start + rowsPerPage, totalRows);
        rows.hide().slice(start, end).show();

        $('#start-row').text(totalRows === 0 ? 0 : start + 1);
        $('#end-row').text(end);
        $('#total-rows').text(totalRows);

        const pageNumbersCont = $('#page-numbers').empty();
        for (let i = 1; i <= totalPages; i++) {
            const btn = $('<button>').addClass('page-btn').text(i).toggleClass('active', i === currentPage);
            btn.on('click', function () { currentPage = i; updateTable(); });
            pageNumbersCont.append(btn);
        }
        $('.prev-btn').prop('disabled', currentPage === 1);
        $('.next-btn').prop('disabled', currentPage === totalPages || totalPages === 0);
    }
    $('.next-btn').off('click').on('click', () => { if (currentPage < totalPages) { currentPage++; updateTable(); } });
    $('.prev-btn').off('click').on('click', () => { if (currentPage > 1) { currentPage--; updateTable(); } });
    updateTable();
};

window.changeRowsPerPage = function(val) {
    rowsPerPage = parseInt(val);
    $('#rowsPerPageDropdown .selected-text').text(val);
    $('#rowsPerPageDropdown').removeClass('active');
    currentPage = 1;
    window.initPagination();
};

window.toggleDropdown = function(id) {
    if (event) event.stopPropagation();
    $('.custom-dropdown').not('#' + id).removeClass('active');
    $('#' + id).toggleClass('active');
};