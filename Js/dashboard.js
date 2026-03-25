// Global Variables (Dashboard ke liye)
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
    
    // 1. Auth Check
    if (!aid || aid === "null" || aid === "undefined") {
        window.location.href = "AgencyLogin.html";
        return;
    }

    // 2. Profile Sync
    const savedName = localStorage.getItem("agencyName");
    const savedEmail = localStorage.getItem("agencyEmail");
    $(".display-agency-name, .user-mini-profile p, .d-name").text(savedName || "Agency User");
    $("#display-agency-email").text(savedEmail || "No Email Found");

    // 3. Init UI Components
    initChart();
    initMap();
    loadDashboardData(aid);

    // 4. Global Search Logic (Dashboard Specific)
    setupDashboardSearch(aid);

    // 5. Stat Card Click Listeners
    $("#statcard1").off("click").on("click", () => navigateTo("/campaigns"));
    $("#statcard2").off("click").on("click", () => navigateTo("/leads"));
    $("#statcard3").off("click").on("click", () => navigateTo("/clients"));
    $("#statcard4").off("click").on("click", () => navigateTo("/reports"));

    // 6. Click Outside Dropdown Close
    $(document).off('click.customdropdown').on('click.customdropdown', function (e) {
        if (!$(e.target).closest('.custom-dropdown').length) $('.custom-dropdown').removeClass('active');
    });
};

// ==========================================
// SEARCH LOGIC
// ==========================================
function setupDashboardSearch(aid) {
    let searchClients = [];
    let searchCampaigns = [];

    // Pre-fetch search data
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
}

// ==========================================
// MAP & CHART INITIALIZATION
// ==========================================
function initMap() {
    const mapDiv = document.getElementById("geofenceMap");
    if (!mapDiv) return;

    map = new google.maps.Map(mapDiv, {
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
            map.setZoom(15);
            if (currentMarker) currentMarker.setMap(null);
            currentMarker = new google.maps.Marker({ position: place.geometry.location, map: map });
        });
    }
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

// ==========================================
// DATA LOADING
// ==========================================
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

            renderClientInsights(data.clientInsights);
            if (data.sourceStats) updatePieChart(data.sourceStats);
            if (data.mapPoints) updateMapMarkers(data.mapPoints);
        }
    });
}

function renderClientInsights(insights) {
    let tableBody = $("#clientTableBody");
    tableBody.empty();

    if (insights && insights.length > 0) {
        insights.forEach(client => {
            tableBody.append(`
                <tr>
                    <td><strong>${client.clientName}</strong></td>
                    <td>${client.agencyName || 'N/A'}</td>
                    <td>${client.totalCampaigns || 0}</td>
                    <td>${client.leads || 0}</td>
                    <td>${parseFloat(client.conversionRate || 0).toFixed(2)}%</td>
                </tr>
            `);
        });
        currentPage = 1;
        initPagination();
    } else {
        tableBody.append(`<tr><td colspan="5" style="text-align:center;">No insights available.</td></tr>`);
    }
}

function updatePieChart(sourceData) {
    if(!sourceChart) return;
    sourceChart.data.datasets[0].data = [
        sourceData["Google Ads"] || 0, sourceData["Facebook"] || 0,
        sourceData["Instagram"] || 0, sourceData["Whatsapp"] || 0
    ];
    sourceChart.update();
}

function updateMapMarkers(locations) {
    if(!map) return;
    const geocoder = new google.maps.Geocoder();
    locations.forEach(loc => {
        geocoder.geocode({ 'address': loc.location }, function (results, status) {
            if (status === 'OK') {
                let markerColor = loc.status === 'Active' ? "#00FF00" : (loc.status === 'Paused' ? "#FFFF00" : "#808080");
                new google.maps.Marker({
                    position: results[0].geometry.location,
                    map: map,
                    title: loc.name,
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: markerColor, fillOpacity: 0.9, strokeWeight: 2, strokeColor: '#FFFFFF' }
                });
            }
        });
    });
}

// ==========================================
// PAGINATION FUNCTIONS (SPA Ready)
// ==========================================
function initPagination() {
    const rows = $('#clientTableBody tr');
    const totalRows = rows.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    function updateTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        rows.hide().slice(start, end).show();

        $('#start-row').text(totalRows === 0 ? 0 : start + 1);
        $('#end-row').text(Math.min(end, totalRows));
        $('#total-rows').text(totalRows);

        renderPageNumbers(totalPages);
    }

    function renderPageNumbers(totalPages) {
        const cont = $('#page-numbers').empty();
        for (let i = 1; i <= totalPages; i++) {
            const btn = $('<button>').addClass('page-btn').text(i).toggleClass('active', i === currentPage);
            btn.on('click', () => { currentPage = i; updateTable(); });
            cont.append(btn);
        }
        $('.prev-btn').off('click').on('click', () => { if(currentPage > 1) { currentPage--; updateTable(); } });
        $('.next-btn').off('click').on('click', () => { if(currentPage < totalPages) { currentPage++; updateTable(); } });
    }

    updateTable();
}

// Global click handlers for UI
window.changeRowsPerPage = function(val) {
    rowsPerPage = parseInt(val);
    $('#rowsPerPageDropdown .selected-text').text(val);
    $('#rowsPerPageDropdown').removeClass('active');
    currentPage = 1;
    initPagination();
};

window.toggleDropdown = function(id) {
    event.stopPropagation();
    $('.custom-dropdown').not('#' + id).removeClass('active');
    $('#' + id).toggleClass('active');
};