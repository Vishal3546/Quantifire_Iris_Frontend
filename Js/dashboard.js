function initDashboardPage() {

    let sourceChart;
    let map;

    const aid = localStorage.getItem("agencyId");

    if (!aid) {
        alert("Session expired");
        window.location.href = "AgencyLogin.html";
        return;
    }

    initMap();
    initChart();
    loadDashboardData();
    bindEvents();

    // ---------------- MAP ----------------
    function initMap() {
        map = new google.maps.Map(document.getElementById("geofenceMap"), {
            center: { lat: 20.5937, lng: 78.9629 },
            zoom: 5
        });
    }

    // ---------------- CHART ----------------
    function initChart() {
        const ctx = document.getElementById('sourceChart').getContext('2d');

        sourceChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Google Ads', 'Facebook', 'Instagram', 'Whatsapp'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#00ffaa', '#ffcc00', '#ff6b6b', '#00d4ff']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

        // ---------------- EVENTS ----------------
    function bindEvents() {

        document.getElementById("statcard1").onclick = () => navigateTo('/campaigns');
        document.getElementById("statcard2").onclick = () => navigateTo('/leads');
        document.getElementById("statcard3").onclick = () => navigateTo('/clients');
        document.getElementById("statcard4").onclick = () => navigateTo('/reports');
    }

    // ---------------- API ----------------
    function loadDashboardData() {

        fetch("http://localhost:8080/api/agency/dashboard/summary", {
            headers: { "X-Agency-Id": aid }
        })
        .then(res => res.json())
        .then(data => {

            document.querySelector("#statcard1 h2").innerText = data.totalCampaigns || 0;
            document.querySelector("#statcard2 h2").innerText = data.totalLeads || 0;
            document.querySelector("#statcard3 h2").innerText = data.totalClients || 0;
            document.querySelector("#statcard4 h2").innerText = data.totalReportDownloaded || 0;

            updateChart(data.sourceStats || {});
            renderTable(data.clientInsights || []);

        })
        .catch(err => console.error(err));
    }

    function updateChart(sourceData) {
        sourceChart.data.datasets[0].data = [
            sourceData["Google Ads"] || 0,
            sourceData["Facebook"] || 0,
            sourceData["Instagram"] || 0,
            sourceData["Whatsapp"] || 0
        ];
        sourceChart.update();
    }

    function renderTable(list) {

        const tbody = document.getElementById("clientTableBody");
        tbody.innerHTML = "";

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">No Data</td></tr>`;
            return;
        }

        list.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td>${c.clientName}</td>
                    <td>${c.agencyName}</td>
                    <td>${c.totalCampaigns}</td>
                    <td>${c.leads}</td>
                    <td>${c.conversionRate}%</td>
                </tr>
            `;
        });
    }

}