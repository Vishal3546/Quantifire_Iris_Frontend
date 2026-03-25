// Global State for Locations Page (Namespaced to prevent conflicts)
window.locAllData = [];
window.locFilteredData = [];
window.locCurrentPage = 1;
window.locRowsPerPage = 4;

window.initLocationsPage = function () {
    // Reset state on load
    window.locCurrentPage = 1;
    $("#locMainWrapper").removeClass("table-visible").hide();
    $("#locLargeSearchContainer").show();
    $("#locBackBtnWrapper").hide();

    // 1. Initialize Select2
    if ($('#locClientSearchSelect').length) {
        $('#locClientSearchSelect').select2({
            placeholder: "Select/Search Client",
            allowClear: true,
            width: '100%'
        }).on('change', function () {
            if ($(this).val()) {
                $("#locClientError").fadeOut();
                $(this).next('.select2-container').find('.select2-selection').css('border-color', '');
            }
        });
    }

    if ($('#locLocationSearchSelect').length) {
        $('#locLocationSearchSelect').select2({
            placeholder: "Select/Search Location",
            allowClear: true,
            width: '100%'
        }).on('change', function () {
            if ($(this).val()) {
                $("#locLocationError").fadeOut();
                $(this).next('.select2-container').find('.select2-selection').css('border-color', '');
            }
        });
    }

    // 2. Load Dropdown Data
    loadLocationsDropdownData();
    loadLocClientsForSearch();

    // 3. Search Button Event
    $("#locMainSearchBtn, #locLargeSearchContainer button").off("click").on("click", function (e) {
        e.preventDefault();

        const selClient = $('#locClientSearchSelect').val();
        const selLoc = $('#locLocationSearchSelect').val();
        let isValid = true;

        if (!selClient) {
            $("#locClientError").fadeIn();
            $('#locClientSearchSelect').next('.select2-container').find('.select2-selection').css('border-color', '#ff4d4d');
            isValid = false;
        }
        if (!selLoc) {
            $("#locLocationError").fadeIn();
            $('#locLocationSearchSelect').next('.select2-container').find('.select2-selection').css('border-color', '#ff4d4d');
            isValid = false;
        }

        if (isValid) {
            showLocResults();
        }
    });

    // 4. Outside Clicks
    $(document).off("click.locDropdown").on("click.locDropdown", function (e) {
        if (!$(e.target).closest('.custom-dropdown').length) {
            $('.custom-dropdown').removeClass('active');
        }
        if ($(e.target).closest('.select2-container').length) {
            $('.custom-dropdown').removeClass('active');
        }
    });

    $('#locClientSearchSelect, #locLocationSearchSelect').on('select2:open', function () {
        $('.custom-dropdown').removeClass('active');
    });
};

window.loadLocationsDropdownData = function () {
    const aid = localStorage.getItem("agencyId");
    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/locations/all", // Mapped to Live URL
        type: "GET",
        headers: { "X-Agency-Id": aid },
        success: function (data) {
            window.locAllData = data;
            let locSelect = $('#locLocationSearchSelect').empty().append('<option value=""></option>');
            locSelect.append('<option value="all_locations">All Locations</option>');
            
            let uniqueLocs = [...new Set(data.map(item => item.targetLocation))];
            uniqueLocs.forEach(l => { if (l) locSelect.append(new Option(l, l)); });
        },
        error: function (xhr) { console.error("Error loading locations:", xhr.responseText); }
    });
};

window.loadLocClientsForSearch = function () {
    const aid = localStorage.getItem("agencyId");
    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/clients/all",
        type: "GET",
        headers: { "X-Agency-Id": aid },
        success: function (data) {
            let clientSelect = $('#locClientSearchSelect').empty().append('<option value=""></option>');
            clientSelect.append('<option value="all_clients">All Clients</option>');
            data.forEach(client => {
                let name = client.clientName || client.client_name || client.CLIENTNAME;
                if (name) clientSelect.append(new Option(name, name));
            });
        }
    });
};

window.showLocResults = function () {
    $("#locMainWrapper").addClass("table-visible").show();
    $("#locLargeSearchContainer").hide();
    $("#locBackBtnWrapper").show();
    performLocSearch();
};

window.resetLocPage = function () {
    $("#locMainWrapper").removeClass("table-visible").hide();
    $("#locLargeSearchContainer").show();
    $("#locBackBtnWrapper").hide();
    
    $('#locClientSearchSelect, #locLocationSearchSelect').val(null).trigger('change');
    $("#locClientError, #locLocationError").hide();
    $('.select2-selection').css('border-color', '');
    $("#locActivityDropdown .selected-text").text("All Activity");
};

window.performLocSearch = function () {
    const selClient = $('#locClientSearchSelect').val();
    const selLoc = $('#locLocationSearchSelect').val();
    const selActivity = $('#locActivityDropdown .selected-text').text().trim();

    // Filter Logic
    let rawFiltered = window.locAllData.filter(item => {
        const matchClient = (selClient === "all_clients") ? true : (item.clientName === selClient);
        const matchLoc = (selLoc === "all_locations") ? true : (item.targetLocation === selLoc);
        return matchClient && matchLoc;
    });

    // Aggregation Logic
    let citySummary = {};
    rawFiltered.forEach(item => {
        let city = item.targetLocation;
        if (!citySummary[city]) {
            citySummary[city] = { targetLocation: city, activeCampaigns: 0, leads: 0, totalConversions: 0, conversionRate: 0, count: 0 };
        }
        citySummary[city].activeCampaigns += parseInt(item.activeCampaigns || 0);
        citySummary[city].leads += parseInt(item.leads || 0);
        citySummary[city].totalConversions += parseInt(item.totalConversions || 0);
        citySummary[city].conversionRate += parseFloat(item.conversionRate || 0);
        citySummary[city].count++;
    });

    window.locFilteredData = Object.values(citySummary).map(loc => {
        loc.conversionRate = (loc.conversionRate / loc.count).toFixed(2);
        if (loc.leads > 100) loc.activity = "High";
        else if (loc.leads >= 50) loc.activity = "Medium";
        else loc.activity = "Low";
        return loc;
    });

    if (selActivity !== "All Activity") {
        window.locFilteredData = window.locFilteredData.filter(l => l.activity === selActivity);
    }

    window.locCurrentPage = 1;
    displayLocTable(window.locFilteredData);
};

window.displayLocTable = function (dataList) {
    let tbody = $("#locationTableBody").empty();
    if (dataList.length === 0) {
        tbody.append("<tr><td colspan='7' style='text-align:center; padding:20px;'>No data found.</td></tr>");
        updateLocPaginationInfo(0, 0, 0);
        $("#loc-page-numbers").empty();
        return;
    }

    const start = (window.locCurrentPage - 1) * window.locRowsPerPage;
    const paginatedData = dataList.slice(start, start + window.locRowsPerPage);

    paginatedData.forEach(loc => {
        let dotClass = loc.activity === "High" ? "ac-high" : (loc.activity === "Medium" ? "ac-med" : "ac-low");
        // Replaced href with navigateTo for SPA
        tbody.append(`<tr>
            <td><strong>${loc.targetLocation}</strong></td>
            <td>${loc.activeCampaigns}</td>
            <td>${loc.leads}</td>
            <td>${loc.totalConversions}</td>
            <td>${loc.conversionRate}%</td>
            <td><div class="activity-wrapper"><span class="activity-dot ${dotClass}"></span> ${loc.activity}</div></td>
            <td><div class="action-btn" onclick="navigateTo('/location-details?location=${encodeURIComponent(loc.targetLocation)}')"><i class="fa-regular fa-eye"></i></div></td>
        </tr>`);
    });

    updateLocPaginationInfo(start + 1, Math.min(start + window.locRowsPerPage, dataList.length), dataList.length);
    generateLocPageNumbers(Math.ceil(dataList.length / window.locRowsPerPage));
};

// Dropdown & Pagination Helpers
window.toggleLocDropdown = function (id) {
    $('.custom-dropdown').not('#' + id).removeClass('active');
    $('#' + id).toggleClass('active');
};

window.selectLocItem = function (id, txt) {
    $(`#${id} .selected-text`).text(txt);
    $(`#${id}`).removeClass('active');
    if ($("#locMainWrapper").hasClass("table-visible")) performLocSearch();
};

window.changeLocRowsPerPage = function (val) {
    window.locRowsPerPage = parseInt(val);
    $('#locRowsPerPageDropdown .selected-text').text(val);
    $('#locRowsPerPageDropdown').removeClass('active');
    window.locCurrentPage = 1;
    displayLocTable(window.locFilteredData);
};

window.updateLocPaginationInfo = function (start, end, total) {
    $("#loc-start-row").text(start);
    $("#loc-end-row").text(end);
    $("#loc-total-rows").text(total);
    $("#locPrevBtn").prop("disabled", window.locCurrentPage === 1);
    $("#locNextBtn").prop("disabled", window.locCurrentPage === Math.ceil(total / window.locRowsPerPage) || total === 0);
};

window.generateLocPageNumbers = function (totalPages) {
    let container = $("#loc-page-numbers").empty();
    for (let i = 1; i <= totalPages; i++) {
        container.append(`<button class="page-btn ${i === window.locCurrentPage ? 'active' : ''}" onclick="goToLocPage(${i})">${i}</button>`);
    }
};

window.goToLocPage = function (p) { window.locCurrentPage = p; displayLocTable(window.locFilteredData); };
window.prevLocPage = function () { if (window.locCurrentPage > 1) { window.locCurrentPage--; displayLocTable(window.locFilteredData); } };
window.nextLocPage = function () { if (window.locCurrentPage < Math.ceil(window.locFilteredData.length / window.locRowsPerPage)) { window.locCurrentPage++; displayLocTable(window.locFilteredData); } };