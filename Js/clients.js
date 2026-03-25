// Global State for Clients Page (Conflict-free)
window.clientRowsPerPage = 4;
window.clientCurrentPage = 1;
window.clientIdToDelete = null;

// The Gatekeeper Function (Router isko bulayega)
window.initClientsPage = function () {
    // Reset page on load
    window.clientCurrentPage = 1;
    
    // Load Data
    loadClientsData();

    // Outside click for Dropdown
    $(document).off("click.clientDropdown").on("click.clientDropdown", function (event) {
        if (!$(event.target).closest('.custom-dropdown').length) {
            $('.custom-dropdown').removeClass('active');
        }
    });
};

// 1. Fetch & Render Clients Data
window.loadClientsData = function () {
    const agencyId = localStorage.getItem('agencyId');
    if (!agencyId) {
        console.error("Agency ID not found!");
        return;
    }

    $.ajax({
        url: `http://localhost:8080/api/agency/clients/all?agencyId=${agencyId}`, // Remember to map to live URL using your prefilter
        type: "GET",
        success: function (data) {
            let rows = "";
            let topCardsHtml = "";

            // KPI Sorting Logic (Unchanged)
            let sortedForKpi = [...data].sort((a, b) => {
                let activeA = a.activeCampaignsCount || 0;
                let activeB = b.activeCampaignsCount || 0;
                if (activeB !== activeA) return activeB - activeA; // Primary
                let totalA = a.totalCampaigns || 0;
                let totalB = b.totalCampaigns || 0;
                return totalB - totalA; // Secondary
            });

            // Render Top 3 Client KPI Cards
            sortedForKpi.slice(0, 3).forEach((client) => {
                let convRate = client.conversionRate ? parseFloat(client.conversionRate).toFixed(1) : "0.0";
                let initials = client.clientName ? client.clientName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : "CL";
                let activeCamps = client.activeCampaignsCount || 0;

                topCardsHtml += `
                <div class="client-highlight-card">
                    <div class="ch-header">
                        <div class="ch-avatar">${initials}</div>
                        <div class="ch-info">
                            <h3>${client.clientName}</h3>
                            <p>${client.agencyName || 'Agency'}</p>
                        </div>
                        <span class="ch-badge">Top Client</span>
                    </div>
                    <div class="ch-stats">
                        <div class="ch-stat-item"><label>Leads</label><span>${client.leads || 0}</span></div>
                        <div class="ch-stat-item"><label>Conv.</label><span>${convRate}%</span></div>
                        <div class="ch-stat-item"><label>Active Camp</label><span>${activeCamps}</span></div>
                        <div class="ch-stat-item"><label>Total Camp</label><span>${client.totalCampaigns || 0}</span></div>
                    </div>
                </div>`;
            });

            // Render Table Rows (Using SPA navigateTo for links)
            data.forEach((client) => {
                let convRate = client.conversionRate ? parseFloat(client.conversionRate).toFixed(1) : "0.0";
                rows += `
                <tr>
                    <td><strong>${client.clientName}</strong><br><span style="font-size:0.75rem; color:#888;">${client.agencyName || ''}</span></td>
                    <td><span>${client.email || 'N/A'}</span><br><span style="font-size:0.75rem; color:#888;">${client.contactNumber || ''}</span></td>
                    <td>${client.totalCampaigns || 0}</td>
                    <td>${client.leads || 0}</td>
                    <td>${convRate}%</td>
                    <td>
                        <div class="action-icons">
                            <div class="action-btn" onclick="navigateTo('/client-details?id=${client.id}')"><i class="fa-regular fa-eye"></i></div>
                            <div class="action-btn" onclick="navigateTo('/edit-client?id=${client.id}')"><i class="fa-solid fa-pen"></i></div>
                            <div class="action-btn" onclick="openDeleteModal(${client.id})"><i class="fa-regular fa-trash-can"></i></div>
                        </div>
                    </td>
                </tr>`;
            });

            $("#kpiCardsContainer").html(topCardsHtml);
            $("#clientTableBody").html(rows);
            initClientPagination(); // Call our specific pagination
        },
        error: function (err) {
            console.error("Error fetching data:", err);
            showCustomAlert("Error", "Database connection error!", "error");
        }
    });
};

// 2. Pagination & Dropdown Logic
window.toggleClientDropdown = function (id) {
    event.stopPropagation();
    $('.custom-dropdown').not('#' + id).removeClass('active');
    $('#' + id).toggleClass('active');
};

window.changeClientRowsPerPage = function (val) {
    window.clientRowsPerPage = parseInt(val);
    $('#clientsRowsPerPageDropdown .selected-text').text(val);
    $('#clientsRowsPerPageDropdown').removeClass('active');
    window.clientCurrentPage = 1; 
    initClientPagination(); 
};

window.initClientPagination = function () {
    const rows = $('#clientTableBody tr');
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / window.clientRowsPerPage));

    function updateTable() {
        const start = (window.clientCurrentPage - 1) * window.clientRowsPerPage;
        const end = start + window.clientRowsPerPage;
        
        rows.hide().slice(start, end).show();
        
        $('#start-row').text(totalRows === 0 ? 0 : start + 1);
        $('#end-row').text(end > totalRows ? totalRows : end);
        $('#total-rows').text(totalRows);
        
        $('.prev-btn').prop('disabled', window.clientCurrentPage === 1);
        $('.next-btn').prop('disabled', window.clientCurrentPage === totalPages || totalPages === 0);
    }

    function generatePages() {
        $('#page-numbers').empty();
        for (let i = 1; i <= totalPages; i++) {
            $('<button>').addClass('page-btn').text(i)
                .toggleClass('active', i === window.clientCurrentPage)
                .on('click', function () { 
                    window.clientCurrentPage = i; 
                    updateTable(); 
                    generatePages(); 
                })
                .appendTo('#page-numbers');
        }
    }

    // Attach Next/Prev
    $('.next-btn').off('click').on('click', function () { 
        if (window.clientCurrentPage < totalPages) { 
            window.clientCurrentPage++; updateTable(); generatePages(); 
        } 
    });
    $('.prev-btn').off('click').on('click', function () { 
        if (window.clientCurrentPage > 1) { 
            window.clientCurrentPage--; updateTable(); generatePages(); 
        } 
    });

    updateTable();
    generatePages();
};

// 3. Alerts Logic
window.showCustomAlert = function (title, message, type) {
    $('#alertTitle').text(title);
    $('#alertMessage').text(message);

    if (type === 'success') {
        $('#alertIconBox').html('<i class="fa-solid fa-check"></i>');
        $('#alertIconBox').removeClass('alert-icon-error').addClass('alert-icon-success');
    } else {
        $('#alertIconBox').html('<i class="fa-solid fa-triangle-exclamation"></i>');
        $('#alertIconBox').removeClass('alert-icon-success').addClass('alert-icon-error');
    }

    $('#customAlertOverlay').addClass('active');

    $('.btn-alert-ok').off('click').on('click', function () {
        $('#customAlertOverlay').removeClass('active');
    });
};

// 4. Delete Logic
window.openDeleteModal = function (id) {
    window.clientIdToDelete = id;
    $('#deleteModal').css('display', 'flex').hide().fadeIn(200).addClass('show');
};

window.closeDeleteModal = function () {
    $('#deleteModal').removeClass('show').fadeOut(200);
    window.clientIdToDelete = null;
};

window.confirmDelete = function () {
    const agencyId = localStorage.getItem('agencyId');

    if (!agencyId) {
        showCustomAlert("Session Expired", "Please login again.", "error");
        return;
    }

    if (window.clientIdToDelete) {
        $.ajax({
            url: `http://localhost:8080/api/agency/clients/delete/${window.clientIdToDelete}`,
            type: "DELETE",
            headers: { "X-Agency-Id": agencyId },
            success: function (res) {
                showCustomAlert("Deleted!", "Client has been removed successfully.", "success");
                closeDeleteModal();
                loadClientsData(); // Refresh the table
            },
            error: function (xhr) {
                closeDeleteModal();
                showCustomAlert("Error", "Failed to delete client: " + xhr.responseText, "error");
            }
        });
    }
};