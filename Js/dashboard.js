let sourceChart;
let map;

$(document).ready(function () {

    const aid = checkAuth();
    if (!aid) return;

    setAgencyInfo();

    initMap();
    initChart();
    loadDashboardData(aid);
    bindEvents();
});

// ================= MAP =================
function initMap() {
    map = new google.maps.Map(document.getElementById("geofenceMap"), {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5
    });
}

// ================= CHART =================
function initChart() {
    const ctx = document.getElementById('sourceChart');

    if (!ctx) return; // 🔥 IMPORTANT FIX

    sourceChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Google Ads', 'Facebook', 'Instagram', 'Whatsapp'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#00ffaa', '#ffcc00', '#ff6b6b', '#00d4ff']
            }]
        }
    });
}

// ================= EVENTS =================
function bindEvents() {

    $("#statcard1").click(() => window.location.href = "Campaigns.html");
    $("#statcard2").click(() => window.location.href = "Leads.html");
    $("#statcard3").click(() => window.location.href = "Clients.html");
    $("#statcard4").click(() => window.location.href = "Report&Analytics.html");
}

// ================= API =================
function loadDashboardData(aid) {

    $.ajax({
        url: "http://localhost:8080/api/agency/dashboard/summary",
        method: "GET",
        headers: { "X-Agency-Id": aid },

        success: function (data) {

            $("#statcard1 h2").text(data.totalCampaigns || 0);
            $("#statcard2 h2").text(data.totalLeads || 0);
            $("#statcard3 h2").text(data.totalClients || 0);
            $("#statcard4 h2").text(data.totalReportDownloaded || 0);

            updateChart(data.sourceStats || {});
            renderTable(data.clientInsights || []);
        },

        error: function (err) {
            console.error("API Error:", err);
        }
    });
}

// ================= CHART UPDATE =================
function updateChart(sourceData) {

    if (!sourceChart) return;

    sourceChart.data.datasets[0].data = [
        sourceData["Google Ads"] || 0,
        sourceData["Facebook"] || 0,
        sourceData["Instagram"] || 0,
        sourceData["Whatsapp"] || 0
    ];

    sourceChart.update();
}

// ================= TABLE =================
function renderTable(list) {

    const tbody = $("#clientTableBody");
    tbody.empty();

    console.log("Client Data:", list); // 🔥 DEBUG

    if (!list || list.length === 0) {
        tbody.append(`<tr><td colspan="5">No Data</td></tr>`);
        return;
    }

    list.forEach(c => {
        tbody.append(`
            <tr>
                <td>${c.clientName || '-'}</td>
                <td>${c.agencyName || '-'}</td>
                <td>${c.totalCampaigns || 0}</td>
                <td>${c.leads || 0}</td>
                <td>${c.conversionRate || 0}%</td>
            </tr>
        `);
    });
}