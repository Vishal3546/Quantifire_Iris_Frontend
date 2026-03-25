// Global State for Campaigns Page (Namespaced to avoid conflicts)
window.campaignCurrentPage = 1;
window.campaignRowsPerPage = 4;
window.allCampaignsLocal = [];
window.campaignIdToDelete = null;

window.initCampaignsPage = function () {
    // Reset state on load
    window.campaignCurrentPage = 1;
    
    // Load Initial Data
    loadCampaignsData('all');
    loadClientsForSearch();

    // Select2 Initialization
    if ($('#clientSearchSelect').length) {
        $('#clientSearchSelect').select2({
            placeholder: "Select/Search Client",
            allowClear: true,
            width: '100%'
        }).on('change', function () {
            const val = $(this).val();
            if (val && val !== "") {
                $("#clientError").fadeOut();
                $('.select2-selection').css('border-color', '');
            }
            if ($("#mainWrapper").hasClass("table-visible")) {
                performCampaignSearch();
            }
        });
    }

    // Flatpickr Initialization
    if ($("#startDate").length) flatpickr("#startDate", { dateFormat: "d M, Y", theme: "dark" });
    if ($("#endDate").length) flatpickr("#endDate", { dateFormat: "d M, Y", theme: "dark" });

    // Event Listeners
    $("#smallSearchBtn").off("click").on("click", performCampaignSearch);

    // Outside clicks for Dropdowns & Modals
    $(document).off("click.campDropdown").on("click.campDropdown", function (event) {
        if (!$(event.target).closest('.custom-dropdown').length) {
            $('.custom-dropdown').removeClass('active');
        }
        if ($(event.target).is('#platformModal')) {
            closePlatformModal();
        }
    });
};

window.loadClientsForSearch = function () {
    const aid = localStorage.getItem("agencyId");
    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/clients/all?agencyId=" + aid,
        type: "GET",
        success: function (data) {
            let dropdown = $('#clientSearchSelect');
            dropdown.empty();
            dropdown.append('<option value="all_clients">All Clients</option>');
            data.forEach(client => {
                if (client.clientName && client.id) dropdown.append(new Option(client.clientName, client.id));
            });
            dropdown.val(null).trigger('change');
        }
    });
};

window.showCampaignResults = function () {
    $("#mainWrapper").addClass("table-visible");
    performCampaignSearch();
};

window.resetCampaignPage = function () {
    $("#mainWrapper").removeClass("table-visible");
    $("#clientSearchSelect").val(null).trigger('change');
    $("#campaignStatusDropdown .selected-text").text("All Campaigns");
    $("#platformDropdown .selected-text").text("All Platforms");
    $('.custom-dropdown').removeClass('active');
    
    const sp = document.querySelector("#startDate")._flatpickr;
    const ep = document.querySelector("#endDate")._flatpickr;
    if (sp) sp.clear(); if (ep) ep.clear();
    
    $('.qf-item').removeClass('active');
    $('.qf-item:contains("All")').addClass('active');
};

window.loadCampaignsData = function (filter) {
    const aid = localStorage.getItem("agencyId");
    if (!aid) return;

    $.ajax({
        url: `https://quantifire-iris-backend.onrender.com/api/agency/campaigns/all?filter=${filter}`,
        type: "GET",
        headers: { "X-Agency-Id": aid },
        success: function (data) {
            window.allCampaignsLocal = data;
            if ($("#mainWrapper").hasClass("table-visible")) {
                performCampaignSearch();
            }
        }
    });
};

window.performCampaignSearch = function () {
    const selClientId = $('#clientSearchSelect').val();
    const $errorSpan = $("#clientError");

    if (!selClientId || selClientId === "") {
        $errorSpan.fadeIn();
        $('.select2-selection').css('border-color', '#ff4d4d');
        displayFilteredCampaignsOnly([]);
        $("#mainWrapper").removeClass("table-visible");
        return false;
    } else {
        $errorSpan.hide();
        $('.select2-selection').css('border-color', '');
    }

    const selStatus = $('#campaignStatusDropdown .selected-text').text().trim();
    const selPlatform = $('#platformDropdown .selected-text').text().trim().toLowerCase();
    const startTS = document.querySelector("#startDate")._flatpickr.selectedDates[0]?.setHours(0, 0, 0, 0);
    const endTS = document.querySelector("#endDate")._flatpickr.selectedDates[0]?.setHours(0, 0, 0, 0);

    const filteredData = window.allCampaignsLocal.filter(camp => {
        let matchClient = (selClientId === "all_clients") ? true : (camp.clientId == selClientId);
        const matchStatus = (selStatus === "All Campaigns") ? true : (camp.status === selStatus);
        
        const dbPlatforms = (camp.adPlatform || "").toLowerCase();
        let matchPlatform = true;
        if (selPlatform === "meta") matchPlatform = dbPlatforms.includes("meta") && !dbPlatforms.includes("google");
        else if (selPlatform === "google") matchPlatform = dbPlatforms.includes("google") && !dbPlatforms.includes("meta");
        else if (selPlatform === "both") matchPlatform = dbPlatforms.includes("google") && dbPlatforms.includes("meta");

        let matchDate = true;
        if (camp.startDate) {
            const cTS = new Date(camp.startDate).setHours(0, 0, 0, 0);
            if (startTS && cTS < startTS) matchDate = false;
            if (endTS && cTS > endTS) matchDate = false;
        }
        return matchStatus && matchPlatform && matchClient && matchDate;
    });

    displayFilteredCampaignsOnly(filteredData);
    $("#mainWrapper").addClass("table-visible");
};

window.displayFilteredCampaignsOnly = function (dataList) {
    var tbody = $("#campaignTableBody").empty();
    if (!dataList || dataList.length === 0) {
        tbody.append('<tr><td colspan="8" style="text-align:center; padding: 20px;">No Campaigns Found</td></tr>');
        $("#camp-total-rows").text(0);
        return;
    }
    dataList.forEach(camp => {
        var statusClass = camp.status === 'Active' ? 'st-active' : (camp.status === 'Completed' ? 'st-completed' : 'st-paused');
        
        // Changed to navigateTo for SPA smooth loading
        tbody.append(`<tr id="row-${camp.id}">
            <td><strong>${camp.campaignName}</strong><br><span style="font-size:0.75rem; color:#888;">Started ${camp.startDate}</span></td>
            <td>${camp.clientName}</td><td>${camp.targetLocation}</td>
            <td><span class="status-pill ${statusClass}">${camp.status}</span></td>
            <td>${camp.leads || 0}</td><td>${camp.conversionRate || 0}%</td><td>₹ ${camp.budget || 0}</td>
            <td><div class="action-icons">
                <div class="action-btn" onclick="navigateTo('/campaign-details?id=${camp.id}')"><i class="fa-regular fa-eye"></i></div>
                <div class="action-btn" onclick="navigateTo('/edit-campaign?id=${camp.id}')"><i class="fa-solid fa-pen"></i></div>
                <div class="action-btn" onclick="openCampaignDeleteModal(${camp.id})"><i class="fa-regular fa-trash-can"></i></div>
            </div></td></tr>`);
    });
    window.campaignCurrentPage = 1;
    initCampaignPagination();
};

window.initCampaignPagination = function () {
    const rows = $('#campaignTableBody tr');
    const totalRows = rows.length;
    if (totalRows === 0) {
        $('#camp-start-row, #camp-end-row, #camp-total-rows').text(0);
        $('#camp-page-numbers').empty();
        return;
    }
    const totalPages = Math.ceil(totalRows / window.campaignRowsPerPage);
    $('#camp-total-rows').text(totalRows);
    rows.hide().slice((window.campaignCurrentPage - 1) * window.campaignRowsPerPage, window.campaignCurrentPage * window.campaignRowsPerPage).show();
    $('#camp-start-row').text(((window.campaignCurrentPage - 1) * window.campaignRowsPerPage) + 1);
    $('#camp-end-row').text(Math.min(window.campaignCurrentPage * window.campaignRowsPerPage, totalRows));
    
    let pgHtml = '';
    for (let i = 1; i <= totalPages; i++) pgHtml += `<button class="page-btn ${i === window.campaignCurrentPage ? 'active' : ''}" onclick="goToCampaignPage(event, ${i})">${i}</button>`;
    $('#camp-page-numbers').html(pgHtml);
    $('.prev-btn').prop('disabled', window.campaignCurrentPage === 1);
    $('.next-btn').prop('disabled', window.campaignCurrentPage === totalPages || totalPages === 0);
};

window.changeCampaignRowsPerPage = function (val) {
    window.campaignRowsPerPage = parseInt(val);
    $('#campRowsPerPageDropdown .selected-text').text(val);
    $('#campRowsPerPageDropdown').removeClass('active');
    window.campaignCurrentPage = 1;
    initCampaignPagination();
};

window.goToCampaignPage = function (e, p) { e.stopPropagation(); window.campaignCurrentPage = p; initCampaignPagination(); };
window.prevCampaignPage = function (e) { e.stopPropagation(); if (window.campaignCurrentPage > 1) { window.campaignCurrentPage--; initCampaignPagination(); } };
window.nextCampaignPage = function (e) { e.stopPropagation(); if (window.campaignCurrentPage < Math.ceil($('#campaignTableBody tr').length / window.campaignRowsPerPage)) { window.campaignCurrentPage++; initCampaignPagination(); } };

window.toggleCampaignDropdown = function (id) { $('.custom-dropdown').not('#' + id).removeClass('active'); $('#' + id).toggleClass('active'); };
window.selectCampaignItem = function (id, text) { $('#' + id + ' .selected-text').text(text); $('#' + id).removeClass('active'); if ($("#mainWrapper").hasClass("table-visible")) performCampaignSearch(); };

window.applyCampaignFilter = function (element, period) {
    $('.qf-item').removeClass('active'); $(element).addClass('active');
    const today = new Date(); let startDate = null;
    if (period === '7days') { startDate = new Date(); startDate.setDate(today.getDate() - 7); }
    else if (period === '1month') { startDate = new Date(); startDate.setMonth(today.getMonth() - 1); }
    else if (period === '3months') { startDate = new Date(); startDate.setMonth(today.getMonth() - 3); }
    const sp = document.querySelector("#startDate")._flatpickr;
    const ep = document.querySelector("#endDate")._flatpickr;
    if (period === 'all') { sp.clear(); ep.clear(); } else { sp.setDate(startDate); ep.setDate(today); }
    if ($("#mainWrapper").hasClass("table-visible")) performCampaignSearch();
};

// Modals & API Calls
window.showCampaignAlert = function (title, message, type) {
    $('#campAlertTitle').text(title);
    $('#campAlertMessage').text(message);
    if (type === 'success') {
        $('#campAlertIconBox').html('<i class="fa-solid fa-check"></i>').removeClass('alert-icon-error').addClass('alert-icon-success');
    } else {
        $('#campAlertIconBox').html('<i class="fa-solid fa-triangle-exclamation"></i>').removeClass('alert-icon-success').addClass('alert-icon-error');
    }
    $('#campaignAlertOverlay').addClass('active');
};

window.openCampaignDeleteModal = function (id) { window.campaignIdToDelete = id; $('#campaignDeleteModal').css('display', 'flex').hide().fadeIn(200).addClass('show'); };
window.closeCampaignDeleteModal = function () { $('#campaignDeleteModal').removeClass('show').fadeOut(200); };
window.confirmCampaignDelete = function () {
    const aid = localStorage.getItem("agencyId");
    if (window.campaignIdToDelete && aid) {
        $.ajax({
            url: "https://quantifire-iris-backend.onrender.com/api/agency/campaigns/delete/" + window.campaignIdToDelete,
            type: "DELETE", headers: { "X-Agency-Id": aid },
            success: function () {
                closeCampaignDeleteModal();
                setTimeout(() => { showCampaignAlert("Deleted!", "Campaign removed successfully.", "success"); loadCampaignsData('all'); }, 400);
            },
            error: function (xhr) {
                closeCampaignDeleteModal();
                showCampaignAlert("Error", "Failed to delete campaign: " + xhr.responseText, "error");
            }
        });
    }
};

window.openPlatformModal = function () { $('#platformModal').css('display', 'flex').hide().fadeIn(200).addClass('show'); };
window.closePlatformModal = function () { $('#platformModal').removeClass('show').fadeOut(200); };

window.redirectToForm = function (platform) {
    const userEmail = localStorage.getItem("agencyEmail");
    if (!userEmail) { showCampaignAlert("Error", "Session expired. Please log in again.", "error"); return; }
    $('#platformModal .btn-modal').prop('disabled', true).css('opacity', '0.6');

    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/integration/status",
        type: "GET", data: { email: userEmail },
        success: function (response) {
            $('#platformModal .btn-modal').prop('disabled', false).css('opacity', '1');
            if (platform === "google") {
                if (!response.google) {
                    closePlatformModal(); showCampaignAlert("Connection Required", "Redirecting to Google Ads...", "info");
                    setTimeout(() => { window.location.href = `https://quantifire-iris-backend.onrender.com/api/integration/google/connect?email=${encodeURIComponent(userEmail + "|add_campaign")}`; }, 1500);
                } else navigateTo(`/add-campaign?platform=google`);
            } else if (platform === "meta") {
                if (!response.facebook) {
                    closePlatformModal(); showCampaignAlert("Connection Required", "Redirecting to Facebook...", "info");
                    setTimeout(() => { window.location.href = `https://quantifire-iris-backend.onrender.com/api/integration/facebook/connect?email=${encodeURIComponent(userEmail + "|add_campaign")}`; }, 1500);
                } else navigateTo(`/add-campaign?platform=meta`);
            }
        },
        error: function () {
            $('#platformModal .btn-modal').prop('disabled', false).css('opacity', '1');
            closePlatformModal(); showCampaignAlert("Error", "Could not check connection status.", "error");
        }
    });
};