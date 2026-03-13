// ==========================================
// 1. AJAX PREFILTER (Localhost fix)
// ==========================================
$.ajaxPrefilter(function(options) {
    var oldBase = "http://localhost:8080";
    var liveBase = "https://quantifire-iris-backend.onrender.com"; 

    if (options.url.indexOf(oldBase) !== -1) {
        options.url = options.url.replace(oldBase, liveBase);
        console.log("Redirecting AJAX: ", options.url);
    }
});

// ==========================================
// 2. GLOBAL UI SYNC (Logos & Names)
// ==========================================
function syncGlobalAgencyUI() {
    const agencyEmail = localStorage.getItem("agencyEmail");
    if (!agencyEmail) return;

    $.ajax({
        url: "https://quantifire-iris-backend.onrender.com/api/agency/profile",
        type: "GET",
        data: { email: agencyEmail },
        success: function (data) {
            if (data.agencyLogo) {
                let finalPath = data.agencyLogo;

                // Supabase Cleaning Logic
                if (finalPath.includes("https://egkhvxnutuiivybwibqx.supabase.co")) {
                    if (finalPath.includes("localhost:8080")) {
                         finalPath = finalPath.substring(finalPath.indexOf("https://"));
                         finalPath = decodeURIComponent(finalPath);
                    }
                } 
                else if (!finalPath.startsWith('http')) {
                    finalPath = "https://quantifire-iris-backend.onrender.com/uploads/logos/" + finalPath;
                }

                // UI Update - Sabhi images ko ek saath update karein
                $("#sidebarAgencyLogo, #headerAgencyLogo, #leftAgencyLogo, .avatar-circle img").attr("src", finalPath);
                console.log("✅ Global Logo Fixed:", finalPath);
            }

            // Sync Text Data
            const aName = data.agencyName || "Agency User";
            $(".display-agency-name, .user-mini-profile p, .d-name").text(aName);
            $("#display-agency-email").text(data.email);
        }
    });
}

// ==========================================
// 3. LOGOUT LOGIC
// ==========================================
function openLogoutModal() {
    $("#logoutModal").fadeIn(200).css("display", "flex").addClass('active');
    $("#profileDropdown").removeClass('active');
}

function closeLogoutModal() {
    $("#logoutModal").fadeOut(200).removeClass('active');
}

function confirmLogout() {
    localStorage.clear();
    document.cookie = "isAgencyLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "AgencyLogin.html";
}

// ==========================================
// 4. DOCUMENT READY
// ==========================================
$(document).ready(function () {
    const $sidebar = $('.sidebar');
    const $notifDropdown = $('#notifDropdown');
    const $profileDropdown = $('#profileDropdown');
    const $profileChevron = $('#profileChevron');

    // Load Profile & Logos
    syncGlobalAgencyUI();
    loadTopBarNotifications();

    // Sidebar & Dropdown Logic
    $('#sidebarToggle').click(function (e) {
        e.stopPropagation();
        $sidebar.toggleClass('collapsed');
    });

    window.toggleNotification = function (event) {
        event.stopPropagation();
        $notifDropdown.toggleClass('active');
        $profileDropdown.removeClass('active');
    };

    window.toggleProfileDropdown = function (event) {
        event.stopPropagation();
        const isActive = $profileDropdown.toggleClass('active').hasClass('active');
        $profileChevron.css("transform", isActive ? "rotate(180deg)" : "rotate(0deg)");
        $notifDropdown.removeClass('active');
    };

    $(document).click(function (event) {
        if (!$(event.target).closest('.notification-wrapper, .profile-info, .notif-dropdown, .profile-dropdown').length) {
            $notifDropdown.removeClass('active');
            $profileDropdown.removeClass('active');
            $profileChevron.css("transform", "rotate(0deg)");
        }
        if ($(event.target).is('#logoutModal')) closeLogoutModal();
    });

    // 🔴 FIX: Line 292 error handle (checkStatusBtn)
    const checkStatusBtn = document.getElementById('checkStatusBtn');
    if (checkStatusBtn) {
        checkStatusBtn.addEventListener('click', handleHealthCheck);
    }
});

// ==========================================
// 5. NOTIFICATIONS & HELPERS
// ==========================================
function timeAgo(dateString) {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return Math.floor(seconds/60) + "m ago";
    if (seconds < 86400) return Math.floor(seconds/3600) + "h ago";
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function loadTopBarNotifications() {
    const email = localStorage.getItem("agencyEmail");
    if (!email) return;
    $.get(`https://quantifire-iris-backend.onrender.com/api/top-notifications/get?email=${email}`, function (res) {
        $('.notif-count').text(res.unreadCount).toggle(res.unreadCount > 0);
        const list = $('.notif-list').empty();
        res.notifications.slice(0, 4).forEach(log => {
            list.append(`<li class="notif-item ${log.read ? '' : 'unread'}">
                <div class="n-icon ${log.type.toLowerCase()}"><i class="fa-solid fa-bell"></i></div>
                <div class="n-text"><p><strong>${log.title}</strong></p><span>${log.message}</span></div>
                <span class="n-time">${timeAgo(log.createdAt)}</span>
            </li>`);
        });
    });
}

// Mark Read Logic
$(document).on('click', '.mark-read', function() {
    const email = localStorage.getItem("agencyEmail");
    $('.notif-item').removeClass('unread');
    $('.notif-count').fadeOut();
    $.post(`https://quantifire-iris-backend.onrender.com/api/top-notifications/mark-read?email=${email}`);
});

// 🔴 Helper for Health Check
async function handleHealthCheck() {
    const statusText = document.getElementById('statusMessage');
    statusText.innerText = "Checking...";
    try {
        const response = await fetch('https://quantifire-iris-backend.onrender.com/api/health');
        statusText.innerText = response.ok ? "✅ Server Online" : "❌ Server Error";
        statusText.style.color = response.ok ? "green" : "red";
    } catch (e) {
        statusText.innerText = "❌ Server Offline";
        statusText.style.color = "orange";
    }
}