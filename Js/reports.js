// Global State for Reports Page (Namespaced safely)
window.reportAllData = [];

window.initReportsPage = function () {
    // Reset View
    $("#rptDataWrapper, #rptBackBtnWrapper, #rptCustomDateModal").hide();
    $("#rptLargeSearchContainer").show();

    // 1. Initialize Select2
    $('#rptClientSelect, #rptLocationSelect, #rptCampaignSelect').select2({
        placeholder: "Select/Search Option",
        allowClear: true,
        width: '100%'
    }).on('change', function () {
        if ($(this).val()) {
            $(this).parent().find('.error-msg').fadeOut();
            $(this).next('.select2-container').find('.select2-selection').css('border-color', '');
        }
        if ($("#rptDataWrapper").is(":visible")) applyRptFilters();
    });

    // 2. Load Initial Data
    loadRptData();
    
    // 3. Initialize Flatpickr
    flatpickr("#rptStartDate", { dateFormat: "d M, Y", theme: "dark" });
    flatpickr("#rptEndDate", { dateFormat: "d M, Y", theme: "dark" });

    // 4. Handle Outside Clicks for Custom Date Modal
    $(document).off('click.rptDate').on('click.rptDate', function (e) {
        if (!$(e.target).closest('.qf-item').length && !$(e.target).closest('#rptCustomDateModal').length) {
            $('#rptCustomDateModal').hide();
        }
    });
};

// --- Data Fetch & Populating Dropdowns ---
window.loadRptData = function () {
    const aid = localStorage.getItem("agencyId");
    if (!aid || aid === "null" || aid === "undefined") {
        alert("Session Expired. Please login again.");
        window.location.href = "AgencyLogin.html";
        return;
    }

    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/reports/data", // Mapped to Live Backend
        type: "GET",
        headers: { "X-Agency-Id": aid },
        success: function (data) {
            window.reportAllData = data;
            populateRptDropdowns(data);
        },
        error: function(xhr) {
            console.error("Error fetching reports:", xhr.responseText);
        }
    });
};

window.populateRptDropdowns = function (data) {
    let clients = [...new Set(data.map(item => item.clientName))];
    let locations = [...new Set(data.map(item => item.targetLocation))];
    let campaigns = [...new Set(data.map(item => item.campaignName))];

    let clientSelect = $('#rptClientSelect').empty().append('<option value=""></option><option value="all_clients">All Clients</option>');
    clients.forEach(c => { if(c) clientSelect.append(new Option(c, c)) });

    let locSelect = $('#rptLocationSelect').empty().append('<option value=""></option><option value="all_locations">All Locations</option>');
    locations.forEach(l => { if(l) locSelect.append(new Option(l, l)) });

    let campSelect = $('#rptCampaignSelect').empty().append('<option value=""></option><option value="all_campaigns">All Campaigns</option>');
    campaigns.forEach(cp => { if(cp) campSelect.append(new Option(cp, cp)) });

    clientSelect.val(null).trigger('change.select2');
    locSelect.val(null).trigger('change.select2');
    campSelect.val(null).trigger('change.select2');
};

// --- Validation & Show Results ---
window.showRptResults = function () {
    const selClient = $('#rptClientSelect').val();
    const selLoc = $('#rptLocationSelect').val();
    const selCamp = $('#rptCampaignSelect').val();
    let isValid = true;

    if (!selClient) {
        $("#rptClientError").fadeIn();
        $('#rptClientSelect').next('.select2-container').find('.select2-selection').css('border-color', '#ff4d4d');
        isValid = false;
    }
    if (!selLoc) {
        $("#rptLocationError").fadeIn();
        $('#rptLocationSelect').next('.select2-container').find('.select2-selection').css('border-color', '#ff4d4d');
        isValid = false;
    }
    if (!selCamp) {
        $("#rptCampaignError").fadeIn();
        $('#rptCampaignSelect').next('.select2-container').find('.select2-selection').css('border-color', '#ff4d4d');
        isValid = false;
    }

    if (isValid) {
        $("#rptLargeSearchContainer").hide();
        $("#rptDataWrapper, #rptBackBtnWrapper").show();
        applyRptFilters();
    }
};

window.resetRptPage = function () {
    $("#rptDataWrapper, #rptBackBtnWrapper").hide();
    $("#rptLargeSearchContainer").show();
    
    $('#rptClientSelect, #rptLocationSelect, #rptCampaignSelect').val(null).trigger('change');
    $(".error-msg").hide();
    $('.select2-selection').css('border-color', '');
    
    $("#rptSelectedTimeText").text("Last 30 Days");
    $('.qf-item').removeClass('active');
    $('.qf-item:contains("Last 1 Month")').addClass('active');
};

// --- Time Filter Logic ---
window.applyRptFilter = function (element, range) {
    $('.qf-item').removeClass('active');
    $(element).addClass('active');

    if (range === 'custom') {
        $('#rptCustomDateModal').toggle();
        return;
    } else {
        $('#rptCustomDateModal').hide();
        $('[data-type="custom"]').text('custom');
    }

    let filterMap = { 'today': 'Today', '1month': 'Last 30 Days', '3months': 'Last 90 Days', '7days': 'Last 7 Days' };
    $('#rptSelectedTimeText').text(filterMap[range]);

    if ($("#rptDataWrapper").is(":visible")) applyRptFilters();
};

window.submitRptCustomDate = function () {
    const start = $('#rptStartDate').val();
    const end = $('#rptEndDate').val();
    if (start && end) {
        const rangeText = start + " - " + end;
        $('#rptSelectedTimeText').text(rangeText);
        $('.qf-item').removeClass('active');
        $('[data-type="custom"]').text(rangeText).addClass('active');
        $('#rptCustomDateModal').hide();
        if ($("#rptDataWrapper").is(":visible")) applyRptFilters();
    } else {
        alert("Please select both dates.");
    }
};

// --- Application & Calculation ---
window.applyRptFilters = function () {
    const dataToExport = getFilteredRptData();
    updateRptKPIs(dataToExport);
};

window.updateRptKPIs = function (data) {
    let leads = 0, spend = 0, conversions = 0;
    data.forEach(item => {
        leads += (Number(item.leads) || 0);
        spend += (Number(item.budget) || 0);
        conversions += (Number(item.totalConversions) || 0);
    });
    let convRate = leads > 0 ? ((conversions / leads) * 100).toFixed(1) : "0.0";
    let roi = spend > 0 ? (conversions / (spend / 1000)).toFixed(1) : "0.0";

    $("#rptValLeads").text(leads.toLocaleString());
    $("#rptValConv").text(convRate + "%");
    $("#rptValSpend").text("₹" + spend.toLocaleString());
    $("#rptValRoi").text(roi);
};

window.getFilteredRptData = function () {
    const selClient = $('#rptClientSelect').val();
    const selLoc = $('#rptLocationSelect').val();
    const selCamp = $('#rptCampaignSelect').val();
    const selTime = $('#rptSelectedTimeText').text().trim();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!window.reportAllData || window.reportAllData.length === 0) return [];

    return window.reportAllData.filter(item => {
        const matchClient = (!selClient || selClient === "all_clients") ? true : (item.clientName === selClient);
        const matchLoc = (!selLoc || selLoc === "all_locations") ? true : (item.targetLocation === selLoc);
        const matchCamp = (!selCamp || selCamp === "all_campaigns") ? true : (item.campaignName === selCamp);

        let matchDate = true;
        if (item.startDate) {
            const campDate = new Date(item.startDate);
            campDate.setHours(0, 0, 0, 0);

            if (selTime === "Today") {
                matchDate = (campDate.getTime() === today.getTime());
            } else if (selTime === "Last 7 Days") {
                const limit = new Date(); limit.setDate(today.getDate() - 7);
                matchDate = (campDate >= limit && campDate <= today);
            } else if (selTime === "Last 30 Days") {
                const limit = new Date(); limit.setDate(today.getDate() - 30);
                matchDate = (campDate >= limit && campDate <= today);
            } else if (selTime === "Last 90 Days") {
                const limit = new Date(); limit.setDate(today.getDate() - 90);
                matchDate = (campDate >= limit && campDate <= today);
            } else if (selTime.includes("-")) {
                const range = selTime.split(" - ");
                matchDate = (campDate >= new Date(range[0]) && campDate <= new Date(range[1]));
            }
        }
        return matchClient && matchLoc && matchCamp && matchDate;
    });
};

// --- DOWNLOAD & TRACKING LOGIC ---
window.toggleRptSelection = function (element) {
    $(element).toggleClass('active');
};

window.trackReportDownload = function () {
    const aid = localStorage.getItem("agencyId");
    if (!aid) return;

    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/reports/track-download",
        type: "POST",
        headers: { "X-Agency-Id": aid },
        success: function() { console.log("✅ Report download tracked."); },
        error: function(xhr) { console.error("❌ Tracking failed:", xhr.responseText); }
    });
};

// JS PDF Logic
window.downloadRptPDF = async function () {
    try {
        const selectedSections = [];
        $('.report-select-card.active').each(function() {
            selectedSections.push({ title: $(this).find('span').text(), type: $(this).data('report') });
        });

        if (selectedSections.length === 0) { alert("Please select at least one report!"); return; }

        const dataToExport = getFilteredRptData();
        if (dataToExport.length === 0) { alert("No data available! Please search first."); return; }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const agencyName = $('.display-agency-name').first().text() || "Agency Name";

        doc.setFillColor(10, 104, 110);
        doc.roundedRect(10, 10, 190, 45, 8, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text(agencyName, 105, 22, { align: "center" });
        doc.setFontSize(28);
        doc.setFont("helvetica", "bold");
        doc.text("Market Analysis", 105, 35, { align: "center" });
        doc.setFontSize(22);
        doc.setFont("helvetica", "italic");
        doc.text("Report", 105, 48, { align: "center" });

        let currentY = 65;

        selectedSections.forEach((sec) => {
            if (currentY > 230) { doc.addPage(); currentY = 20; }

            doc.setFillColor(10, 104, 110);
            doc.roundedRect(10, currentY, 190, 10, 5, 5, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.text(sec.title, 105, currentY + 6.5, { align: "center" });
            
            currentY += 15;

            let head = [], body = [];
            if (sec.type === 'campaign') {
                head = [['Campaign Name', 'Location', 'Leads', 'Status']];
                body = dataToExport.map(i => [i.campaignName || "N/A", i.targetLocation || "N/A", i.leads || 0, i.status || "N/A"]);
            } else if (sec.type === 'location') {
                head = [['Location', 'Total Leads', 'Conversions']];
                let locMap = {};
                dataToExport.forEach(i => {
                    if(!locMap[i.targetLocation]) locMap[i.targetLocation] = {l:0, c:0};
                    locMap[i.targetLocation].l += (Number(i.leads) || 0);
                    locMap[i.targetLocation].c += (Number(i.totalConversions) || 0);
                });
                body = Object.keys(locMap).map(loc => [loc, locMap[loc].l, locMap[loc].c]);
            } else if (sec.type === 'client') {
                head = [['Client Name', 'Campaign', 'Budget']];
                body = dataToExport.map(i => [i.clientName || "N/A", i.campaignName || "N/A", "Rs. " + (i.budget || 0)]);
            } else if (sec.type === 'monthly') {
                head = [['Start Date', 'Campaign', 'Leads']];
                body = dataToExport.map(i => [i.startDate || "N/A", i.campaignName || "N/A", i.leads || 0]);
            }

            doc.autoTable({
                head: head, body: body, startY: currentY, theme: 'grid',
                headStyles: { fillColor: [10, 104, 110] }, styles: { fontSize: 9 }, margin: { left: 10, right: 10 },
                didDrawPage: (d) => { currentY = d.cursor.y + 15; }
            });
        });

        doc.save(`${agencyName}_Report.pdf`);
        trackReportDownload();

    } catch (e) {
        console.error("PDF Logic Error:", e);
        alert("Error generating PDF.");
    }
};

// CSV Logic
window.downloadRptCSV = function () {
    const selectedReports = [];
    $('.report-select-card.active').each(function () {
        selectedReports.push($(this).data('report'));
    });

    if (selectedReports.length === 0) { alert("Please select at least one report!"); return; }

    const dataToExport = getFilteredRptData();
    if (dataToExport.length === 0) { alert("No data available to export!"); return; }

    selectedReports.forEach(reportType => {
        let csvContent = "data:text/csv;charset=utf-8,";
        let headers = "", rows = [];

        if (reportType === 'campaign') {
            headers = "Campaign Name,Location,Leads,Status\n";
            rows = dataToExport.map(i => `"${i.campaignName}","${i.targetLocation}",${i.leads || 0},"${i.status}"`);
        } else if (reportType === 'location') {
            headers = "Location,Total Leads,Conversions\n";
            let locMap = {};
            dataToExport.forEach(i => {
                if(!locMap[i.targetLocation]) locMap[i.targetLocation] = {l:0, c:0};
                locMap[i.targetLocation].l += (Number(i.leads) || 0);
                locMap[i.targetLocation].c += (Number(i.totalConversions) || 0);
            });
            rows = Object.keys(locMap).map(loc => `"${loc}",${locMap[loc].l},${locMap[loc].c}`);
        } else if (reportType === 'client') {
            headers = "Client Name,Campaign,Budget\n";
            rows = dataToExport.map(i => `"${i.clientName}","${i.campaignName}",${i.budget || 0}`);
        } else if (reportType === 'monthly') {
            headers = "Start Date,Campaign,Leads\n";
            rows = dataToExport.map(i => `"${i.startDate}","${i.campaignName}",${i.leads || 0}`);
        }

        csvContent += headers + rows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Quantifyre_${reportType}_Analytics.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    trackReportDownload();
};