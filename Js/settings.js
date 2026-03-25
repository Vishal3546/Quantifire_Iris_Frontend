// Global State for Settings Page
window.setSavedState = null;
window.setSavedCity = null;
window.setPlatformToDisconnect = "";

window.initSettingsPage = function () {
    const aid = localStorage.getItem("agencyId");
    if (!aid || aid === "null") {
        alert("Session Expired. Please login again.");
        window.location.href = "AgencyLogin.html";
        return;
    }

    // Initialize Select2 for Form
    const countrySelect = $('#setCountrySelect');
    const stateSelect = $('#setStateSelect');
    const citySelect = $('#setCitySelect');
    const select2Config = { width: '100%', dropdownParent: $('.sys-main-container'), allowClear: true };
    
    countrySelect.select2({ ...select2Config, placeholder: "Searching Countries..." });
    stateSelect.select2({ ...select2Config, placeholder: "Select Country First" });
    citySelect.select2({ ...select2Config, placeholder: "Select State First" });

    // Lock Form Initially
    $('.personal-group, .address-group').attr('readonly', true).css('cursor', 'not-allowed');
    countrySelect.prop('disabled', true); stateSelect.prop('disabled', true); citySelect.prop('disabled', true);

    loadSetProfileData();
    loadSetCountryAPI(countrySelect, stateSelect, citySelect, select2Config);

    // Edit Trigger
    $('.edit-trigger').off('click').on('click', function (e) {
        e.stopPropagation();
        const $icon = $(this);
        const targetClass = $icon.data('target');
        const $inputs = $('.' + targetClass);

        if ($icon.hasClass('fa-pencil')) {
            $inputs.removeAttr('readonly').css({ 'border-color': 'rgba(0, 255, 157, 0.5)', 'background': 'rgba(255, 255, 255, 0.05)', 'cursor': 'text' });
            if (targetClass === 'address-group') $('#setCountrySelect, #setStateSelect, #setCitySelect').prop('disabled', false);
            $icon.removeClass('fa-pencil').addClass('fa-check').css('color', '#fff');
            $inputs.first().focus();
        } else {
            if (validateSetSection(targetClass)) {
                $inputs.attr('readonly', true).css({ 'border-color': '', 'background': '', 'cursor': 'not-allowed' });
                if (targetClass === 'address-group') $('#setCountrySelect, #setStateSelect, #setCitySelect').prop('disabled', true);
                $icon.removeClass('fa-check').addClass('fa-pencil').css('color', '#00ff9d');
            }
        }
    });

    // Profile Image Preview
    $('#setProfileUpload').off('change').on('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) { $('#setLeftAgencyLogo').attr('src', e.target.result); };
            reader.readAsDataURL(file);
        }
    });

    // Save Changes
    $('#setSaveProfileBtn').off('click').on('click', handleSetProfileSave);

    // Initial Security/Notifs Load (Tabs logic)
    syncSetIntegrationStatus();
    loadSetNotificationSettings();
    $('#loginAlertToggle, #tfaToggle').off('change').on('change', handleSetSecurityToggle);
    $('.tfa-method-card').off('click').on('click', handleSetTFACardClick);
    $('#setUpdatePassBtn').off('click').on('click', handleSetPassUpdate);

    // Save Notifications on Change
    $('#notifications input[type="checkbox"]').off('change').on('change', handleSetNotificationSave);
};

// UI Helpers
window.openSettingTab = function (evt, tabName) {
    $(".sys-tab-content").hide();
    $(".sys-tab-btn").removeClass("active");
    $("#" + tabName).fadeIn();
    $(evt.currentTarget).addClass("active");
    if (tabName === 'security') loadSetSecurityData();
};

window.toggleSetPass = function (icon) {
    let input = $(icon).siblings('input');
    if (input.attr('type') === 'password') {
        input.attr('type', 'text'); $(icon).removeClass('fa-eye').addClass('fa-eye-slash');
    } else {
        input.attr('type', 'password'); $(icon).removeClass('fa-eye-slash').addClass('fa-eye');
    }
};

window.showSetAlert = function(title, message, type, redirectUrl = null) {
    $('#setAlertTitle').text(title); $('#setAlertMessage').text(message);
    if (type === 'success') {
        $('#setAlertIconBox').html('<i class="fa-solid fa-check"></i>').removeClass('alert-icon-error').addClass('alert-icon-success');
    } else {
        $('#setAlertIconBox').html('<i class="fa-solid fa-triangle-exclamation"></i>').removeClass('alert-icon-success').addClass('alert-icon-error');
    }
    $('#setAlertOverlay').addClass('active');
    
    // Bind dynamic click
    $('#setAlertOverlay .btn-alert-ok').off('click').on('click', function() {
        closeSetAlert();
        if (redirectUrl) window.location.href = redirectUrl;
    });
};
window.closeSetAlert = function() { $('#setAlertOverlay').removeClass('active'); };

// Profile Load
window.loadSetProfileData = function () {
    const agencyEmail = localStorage.getItem("agencyEmail");
    if (!agencyEmail) return;
    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/profile",
        type: "GET", data: { email: agencyEmail },
        success: function (data) {
            $("#setLeftAgencyNameDisplay").text(data.agencyName || "Agency Name");
            $("#setLeftAgencyEmail").text(data.email || "");
            $("#setLeftAgencyPhone").text(data.phoneNumber || "");

            if (data.agencyLogo) {
                let finalPath = data.agencyLogo.startsWith('http') ? data.agencyLogo : "https://quantifire-iris-backend.onrender.com/uploads/logos/" + encodeURIComponent(data.agencyLogo);
                $("#sidebarAgencyLogo, #headerAgencyLogo, #setLeftAgencyLogo").attr("src", finalPath);
            }

            if (data.status) {
                let statusColor = data.status.toLowerCase() === 'active' ? "#00ff9d" : "#ff4d4d";
                $("#setLeftAgencyStatus").html(`<i class="fa-solid fa-circle-check"></i> ${data.status}`).css({ "color": statusColor, "border-color": statusColor });
            }

            let nameParts = (data.ownerName || "").split(' ');
            $("#setFirstNameInput").val(nameParts[0] || "");
            $("#setLastNameInput").val(nameParts.slice(1).join(' ') || "");
            $("#setEmailInput").val(data.email || "");
            $("#setPhoneInput").val(data.phoneNumber || "");
            $("#setPincode").val(data.pincode || "");

            let fullAddr = data.address || "";
            if (fullAddr.includes(",")) {
                let parts = fullAddr.split(",");
                $("#setAddress1").val(parts[0].trim()); $("#setAddress2").val(parts.slice(1).join(", ").trim());
            } else {
                $("#setAddress1").val(fullAddr);
            }

            if (data.country) {
                window.setSavedState = data.state; window.setSavedCity = data.city;
                if ($('#setCountrySelect').find("option[value='" + data.country + "']").length === 0) {
                    $('#setCountrySelect').append(new Option(data.country, data.country, true, true));
                }
                $('#setCountrySelect').val(data.country).trigger('change');
            }
        }
    });
};

// Profile Validation & Save
window.validateSetSection = function(targetClass) {
    let isValid = true;
    $('.' + targetClass).each(function () {
        if ($(this).val().trim() === "") { $(this).css("border-color", "#ff4d4d").siblings(".error-msg").fadeIn(); isValid = false; }
        else { $(this).css("border-color", "rgba(0, 255, 157, 0.5)").siblings(".error-msg").hide(); }
    });
    if (targetClass === 'address-group') {
        ['#setCountrySelect', '#setStateSelect', '#setCitySelect'].forEach(id => {
            if (!$(id).prop('disabled') && !$(id).val()) {
                $(id).next('.select2-container').find('.select2-selection').css('border-color', '#ff4d4d');
                $(id).closest('.form-group').find('.error-msg').fadeIn(); isValid = false;
            } else {
                $(id).next('.select2-container').find('.select2-selection').css('border-color', 'rgba(0, 255, 157, 0.5)');
                $(id).closest('.form-group').find('.error-msg').hide();
            }
        });
    }
    return isValid;
};

window.handleSetProfileSave = function (e) {
    e.preventDefault();
    if (!validateSetSection('personal-group') || !validateSetSection('address-group')) {
        showSetAlert("Validation Error", "Please fill all required fields before saving.", "error"); return;
    }

    let address2Val = $('#setAddress2').val() ? ", " + $('#setAddress2').val() : "";
    const updateData = {
        id: localStorage.getItem("agencyId"),
        email: $('#setEmailInput').val().trim(),
        ownerName: $('#setFirstNameInput').val().trim() + " " + $('#setLastNameInput').val().trim(),
        phoneNumber: $('#setPhoneInput').val().trim(),
        address: $('#setAddress1').val().trim() + address2Val,
        country: $('#setCountrySelect').val(), state: $('#setStateSelect').val(),
        city: $('#setCitySelect').val(), pincode: $('#setPincode').val()
    };

    let formData = new FormData();
    formData.append("agencyData", JSON.stringify(updateData));
    let logoFile = $('#setProfileUpload')[0].files[0];
    if (logoFile) formData.append("agencyLogo", logoFile);

    const $btn = $(this); $btn.text('Saving...').prop('disabled', true);

    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/update-profile",
        type: "POST", data: formData, processData: false, contentType: false,
        success: function (response) {
            const oldEmail = localStorage.getItem("agencyEmail");
            const updatedEmail = response.newEmail;
            if (updatedEmail && updatedEmail.toLowerCase() !== oldEmail.toLowerCase()) {
                localStorage.clear(); document.cookie.split(";").forEach(c => document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"));
                showSetAlert("Email Updated", "Your login email has been changed. Please login again.", "success", "AgencyLogin.html");
            } else {
                showSetAlert("Profile Updated", "Success!", "success");
                $btn.text('Save Changes').prop('disabled', false);
                // Lock fields again
                $('.edit-trigger').removeClass('fa-check').addClass('fa-pencil').css('color', '#00ff9d');
                $('.personal-group, .address-group').attr('readonly', true).css({ 'border-color': '', 'background': '', 'cursor': 'not-allowed' });
                $('#setCountrySelect, #setStateSelect, #setCitySelect').prop('disabled', true);
            }
        },
        error: function () { showSetAlert("Error", "Server error updating profile.", "error"); $btn.text('Save Changes').prop('disabled', false); }
    });
};

// --- Country API Loading ---
window.loadSetCountryAPI = function(countrySelect, stateSelect, citySelect, config) {
    fetch("https://countriesnow.space/api/v0.1/countries/positions").then(r => r.json()).then(res => {
        countrySelect.select2({ ...config, placeholder: "Select Country", data: res.data.map(c => ({ id: c.name, text: c.name })) });
    });

    countrySelect.on('change', function () {
        const countryName = $(this).val();
        stateSelect.empty().append('<option></option>'); citySelect.empty().append('<option></option>');
        if (!countryName) return;
        stateSelect.select2({ ...config, placeholder: "Loading States..." });
        fetch("https://countriesnow.space/api/v0.1/countries/states", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country: countryName }) })
        .then(r => r.json()).then(res => {
            if (!res.error) {
                stateSelect.select2({ ...config, placeholder: "Select State", data: res.data.states.map(s => ({ id: s.name, text: s.name })) });
                if (window.setSavedState) { stateSelect.val(window.setSavedState).trigger('change'); window.setSavedState = null; }
            }
        });
    });

    stateSelect.on('change', function () {
        const countryName = countrySelect.val(); const stateName = $(this).val();
        citySelect.empty().append('<option></option>');
        if (!stateName || !countryName) return;
        citySelect.select2({ ...config, placeholder: "Loading Cities..." });
        fetch("https://countriesnow.space/api/v0.1/countries/state/cities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country: countryName, state: stateName }) })
        .then(r => r.json()).then(res => {
            if (!res.error) {
                citySelect.select2({ ...config, placeholder: "Select City", data: res.data.map(c => ({ id: c, text: c })) });
                if (window.setSavedCity) { citySelect.val(window.setSavedCity).trigger('change'); window.setSavedCity = null; }
            }
        });
    });
};

// --- Security, Password & 2FA ---
window.handleSetPassUpdate = function (e) {
    e.preventDefault();
    const curP = $('#setCurrPass').val(), newP = $('#setNewPass').val(), confP = $('#setConfPass').val();
    if (!curP || !newP || !confP) return showSetAlert("Error", "Please fill all password fields.", "error");
    if (newP !== confP) return showSetAlert("Error", "New Passwords do not match!", "error");
    if (newP.length < 8) return showSetAlert("Error", "Password must be at least 8 characters.", "error");

    const btn = $(this); btn.text('Updating...').prop('disabled', true);
    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/security/change-password", type: "POST", contentType: "application/json",
        data: JSON.stringify({ email: localStorage.getItem("agencyEmail"), currentPassword: curP, newPassword: newP }),
        success: function () {
            $('input[type="password"]').val(''); btn.text('Update Password').prop('disabled', false);
            localStorage.clear(); document.cookie.split(";").forEach(c => document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"));
            showSetAlert("Password Updated", "Please login again with your new password.", "success", "AgencyLogin.html");
        },
        error: function (xhr) {
            let errorMsg = xhr.responseJSON ? xhr.responseJSON.message : "Invalid current password.";
            showSetAlert("Update Failed", "Error: " + errorMsg, "error"); btn.text('Update Password').prop('disabled', false);
        }
    });
};

window.loadSetSecurityData = function () {
    const email = localStorage.getItem("agencyEmail");
    $.get(`https://quantifire-iris-backend.onrender.com/api/agency/security/preferences?email=${email}`, function (data) {
        if (data.is2faEnabled) { $('#tfaToggle').prop('checked', true); $('#tfaMethodsWrapper, #tfaSubmitBtn').hide(); }
        $('#loginAlertToggle').prop('checked', data.loginAlertsEnabled);
    });

    $.get(`https://quantifire-iris-backend.onrender.com/api/agency/security/login-history?email=${email}`, function (hist) {
        const tbody = $('#setSecurityTable tbody').empty();
        if (!hist || hist.length === 0) return tbody.append('<tr><td colspan="4" style="text-align:center;">No recent activity.</td></tr>');
        hist.forEach(r => {
            let ft = r.loginTime ? new Date(r.loginTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A";
            tbody.append(`<tr><td>${r.deviceInfo || 'Unknown'}</td><td>${r.location || 'Unknown'}</td><td>${r.ipAddress || 'Unknown'}</td><td>${ft}</td></tr>`);
        });
    });
};

window.handleSetSecurityToggle = function () {
    const is2fa = $('#tfaToggle').is(':checked'), alerts = $('#loginAlertToggle').is(':checked');
    let method = $('#tfaMobileCard').css('color') === 'rgb(0, 255, 157)' ? 'mobile' : 'email';
    
    if (this.id === 'tfaToggle') {
        if (is2fa) { $('#tfaMethodsWrapper').slideDown(); selectTFAMethod('email'); } 
        else { $('#tfaMethodsWrapper, #otpVerificationBox').slideUp(); $('#tfaSubmitBtn').text('Send OTP').css({'background': '#00ff9d', 'color': '#000'}); updateSetSecurityPref(false, method, alerts); }
    } else {
        updateSetSecurityPref(is2fa, method, alerts);
    }
};

window.handleSetTFACardClick = function () {
    if ($('#tfaToggle').is(':checked')) {
        let method = this.id === 'tfaMobileCard' ? 'mobile' : 'email';
        updateSetSecurityPref(true, method, $('#loginAlertToggle').is(':checked'));
    }
};

window.updateSetSecurityPref = function(is2fa, method, alerts) {
    $.ajax({ url: "https://quantifire-iris-backend.onrender.com/api/agency/security/update-preferences", type: "POST", contentType: "application/json", data: JSON.stringify({ email: localStorage.getItem("agencyEmail"), is2faEnabled: is2fa, tfaMethod: method, loginAlertsEnabled: alerts }) });
};

window.selectTFAMethod = function(method) {
    $('.tfa-method-card').css({ 'border-color': 'rgba(255,255,255,0.1)', 'color': '#888', 'background': 'transparent' });
    $('#tfaInputSection, #tfaSubmitBtn').show(); $('#otpVerificationBox').hide(); $('#tfaSubmitBtn').text('Send OTP');

    if (method === 'mobile') {
        $('#tfaMobileCard').css({ 'border-color': '#00ff9d', 'color': '#00ff9d', 'background': 'rgba(0,255,157,0.05)' });
        $('#tfaInputLabel').text('Enter Mobile Number'); $('#tfaUserInput').attr('placeholder', '+91 XXXXX XXXXX').val('');
    } else {
        $('#tfaEmailCard').css({ 'border-color': '#00ff9d', 'color': '#00ff9d', 'background': 'rgba(0,255,157,0.05)' });
        $('#tfaInputLabel').text('Verify Email Address'); $('#tfaUserInput').attr('placeholder', 'agency@mail.com').val(localStorage.getItem("agencyEmail"));
    }
};

window.sendSetOtp = function() {
    const tgt = $('#tfaUserInput').val(); const mthd = $('#tfaMobileCard').css('color') === 'rgb(0, 255, 157)' ? 'mobile' : 'email';
    if (!tgt) return showSetAlert("Action Required", `Please enter your ${mthd} details.`, "error");
    const btn = $('#tfaSubmitBtn'); btn.text('Sending...').prop('disabled', true);
    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/security/request-otp", type: "POST", contentType: "application/json", data: JSON.stringify({ method: mthd, target: tgt }),
        success: function (res) { btn.text('Resend OTP').prop('disabled', false); $('#otpVerificationBox').slideDown(); showSetAlert("OTP Sent", res.message, "success"); },
        error: function () { showSetAlert("Error", "Error sending OTP.", "error"); btn.text('Send OTP').prop('disabled', false); }
    });
};

window.verifySetOtp = function() {
    const otp = $('#tfaOtpInput').val(), tgt = $('#tfaUserInput').val();
    if (!otp || otp.length < 5) return showSetAlert("Invalid Input", "Please enter a valid OTP.", "error");
    const btn = $('#tfaVerifyBtn'); btn.text('Verifying...').prop('disabled', true);
    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/security/verify-2fa", type: "POST", contentType: "application/json", data: JSON.stringify({ target: tgt, otp: otp, email: localStorage.getItem("agencyEmail") }),
        success: function () {
            btn.text('Verified!').css({background: '#28a745', color: '#fff'});
            setTimeout(() => { $('#otpVerificationBox, #tfaMethodsWrapper, #tfaSubmitBtn').slideUp(); showSetAlert("2FA Enabled", "Two-Factor Authentication Enabled Successfully!", "success"); }, 800);
        },
        error: function (xhr) { showSetAlert("Verification Failed", xhr.responseJSON ? xhr.responseJSON.message : "Invalid OTP", "error"); btn.text('Verify').prop('disabled', false); }
    });
};

// --- Integrations ---
window.syncSetIntegrationStatus = function() {
    const em = localStorage.getItem("agencyEmail"); if(!em) return;
    $('#setGoogleBtn, #setFbBtn').text('Checking...').css('pointer-events', 'none');
    $.get(`https://quantifire-iris-backend.onrender.com/api/integration/status?email=${em}`, function(st) {
        updateSetButtonUI('google', st.google); updateSetButtonUI('facebook', st.facebook);
    }).fail(function() { updateSetButtonUI('google', false); updateSetButtonUI('facebook', false); });
};

window.updateSetButtonUI = function(platform, isConn) {
    const btn = platform === 'google' ? $('#setGoogleBtn') : $('#setFbBtn');
    if (isConn) {
        btn.text('Disconnect').css({'background': 'rgba(255, 77, 77, 0.1)', 'color': '#ff4d4d', 'border-color': '#ff4d4d', 'cursor': 'pointer', 'pointer-events': 'auto'})
           .off('click').on('click', function() { openSetDisconnectModal(platform); });
    } else {
        btn.text(platform === 'google' ? 'Connect Google Ads' : 'Connect Facebook')
           .css({'background': 'transparent', 'color': '#00ff9d', 'border-color': 'rgba(0, 255, 157, 0.5)', 'cursor': 'pointer', 'pointer-events': 'auto'})
           .off('click').on('click', function() { window.location.href = `https://quantifire-iris-backend.onrender.com/api/integration/${platform}/connect?email=${localStorage.getItem("agencyEmail")}`; });
    }
};

window.openSetDisconnectModal = function(platform) {
    window.setPlatformToDisconnect = platform;
    let disp = platform === 'google' ? 'Google Ads' : 'Facebook';
    $('#disconnectConfirmTitle').text(`Disconnect ${disp}?`);
    $('#disconnectConfirmMessage').text(`Are you sure you want to disconnect ${disp}? Your data sync will stop.`);
    $('#disconnectConfirmOverlay').addClass('active');
};
window.closeSetDisconnectModal = function() { $('#disconnectConfirmOverlay').removeClass('active'); window.setPlatformToDisconnect = ""; };

window.confirmSetDisconnect = function() {
    if(!window.setPlatformToDisconnect) return;
    const bp = window.setPlatformToDisconnect === 'google' ? 'GOOGLE' : 'FB';
    const cp = window.setPlatformToDisconnect;
    $('#confirmDisconnectBtn').text('Wait...').prop('disabled', true);
    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/integration/disconnect", type: "GET", data: { email: localStorage.getItem("agencyEmail"), platform: bp },
        success: function() { closeSetDisconnectModal(); $('#confirmDisconnectBtn').text('Disconnect').prop('disabled', false); showSetAlert("Success", `${cp} disconnected!`, "success"); updateSetButtonUI(cp, false); },
        error: function() { closeSetDisconnectModal(); $('#confirmDisconnectBtn').text('Disconnect').prop('disabled', false); showSetAlert("Error", "Could not disconnect.", "error"); }
    });
};

// --- Notifications ---
window.loadSetNotificationSettings = function() {
    const em = localStorage.getItem("agencyEmail"); if(!em) return;
    $.get(`https://quantifire-iris-backend.onrender.com/api/agency/notifications?email=${em}`, function(data) {
        if(!data) return;
        ['NewReg','Billing','Alerts','SysFail','SysReport','NewAgency'].forEach(k => $(`#setEm${k}`).prop('checked', data[`emailNotif${k}`]));
        ['NewMsg','CampStatus','Push','Mention','MsgCom','Dir'].forEach(k => $(`#setApp${k}`).prop('checked', data[`inAppNotif${k}`]));
    });
};
window.handleSetNotificationSave = function() {
    const em = localStorage.getItem("agencyEmail"); if(!em) return;
    let req = { email: em, settings: {} };
    ['NewReg','Billing','Alerts','SysFail','SysReport','NewAgency'].forEach(k => req.settings[`emailNotif${k}`] = $(`#setEm${k}`).prop('checked'));
    ['NewMsg','CampStatus','Push','Mention','MsgCom','Dir'].forEach(k => req.settings[`inAppNotif${k}`] = $(`#setApp${k}`).prop('checked'));
    $.ajax({ url: "https://quantifire-iris-backend.onrender.com/api/agency/notifications/update", type: "POST", contentType: "application/json", data: JSON.stringify(req) });
};