// ==========================================
// 1. SMART AJAX PREFILTER (Auto-Detect Local vs Live)
// ==========================================
$.ajaxPrefilter(function (options) {
    var localBase = "http://localhost:8080";
    var liveBase = "https://quantifire-iris-backend.onrender.com";

    // Agar hum github pages ya live server par hain, tabhi Render par bhejo
    var isLocalFrontend = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (!isLocalFrontend && options.url.indexOf(localBase) !== -1) {
        options.url = options.url.replace(localBase, liveBase);
        console.log("Redirecting AJAX to Live: ", options.url);
    }
});

// ==========================================
// 2. GLOBAL UI SYNC (Logos & Names)
// ==========================================
function syncGlobalAgencyUI() {
    const agencyEmail = localStorage.getItem("agencyEmail");
    if (!agencyEmail) return;

    // Smart URL Detect
    const baseUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") 
                    ? "http://localhost:8080" 
                    : "https://quantifire-iris-backend.onrender.com";

    $.ajax({
        url: baseUrl + "/api/agency/profile",
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
                    finalPath = baseUrl + "/uploads/logos/" + finalPath;
                }

                $("#sidebarAgencyLogo, #headerAgencyLogo, #leftAgencyLogo, .avatar-circle img").attr("src", finalPath);
            }

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
// 4. DOCUMENT READY (Sidebar Fix included)
// ==========================================
$(document).ready(function () {
    const $sidebar = $('.sidebar');
    const $notifDropdown = $('#notifDropdown');
    const $profileDropdown = $('#profileDropdown');
    const $profileChevron = $('#profileChevron');

    syncGlobalAgencyUI();
    loadTopBarNotifications();

    // SIDEBAR TOGGLE
    $('#sidebarToggle').on('click', function (e) {
        e.stopPropagation();
        $sidebar.toggleClass('collapsed');
    });

    // CLOSE SIDEBAR BUTTON (Mobile Fix)
    $('#closeSidebarBtn').on('click', function (e) {
        e.stopPropagation();
        $sidebar.removeClass('collapsed');
    });

    // DROPDOWN TOGGLES
    window.toggleNotification = function (event) {
        event.stopPropagation();
        $('.sidebar').removeClass('collapsed');
        $notifDropdown.toggleClass('active');
        $profileDropdown.removeClass('active');
    };

    window.toggleProfileDropdown = function (event) {
        event.stopPropagation();
        $('.sidebar').removeClass('collapsed');
        const isActive = $profileDropdown.toggleClass('active').hasClass('active');
        $profileChevron.css("transform", isActive ? "rotate(180deg)" : "rotate(0deg)");
        $notifDropdown.removeClass('active');
    };

    // GLOBAL CLICK (Outside Click to close everything)
    $(document).on('click', function (event) {
        // Sidebar close logic
        if (!$(event.target).closest('.sidebar, #sidebarToggle').length) {
            $sidebar.removeClass('collapsed');
        }

        // Dropdowns close logic
        if (!$(event.target).closest('.notification-wrapper, .profile-info, .notif-dropdown, .profile-dropdown').length) {
            $notifDropdown.removeClass('active');
            $profileDropdown.removeClass('active');
            $profileChevron.css("transform", "rotate(0deg)");
        }

        // Modal close
        if ($(event.target).is('#logoutModal')) closeLogoutModal();
    });

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
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return "Just now";
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    
    const days = Math.floor(hours / 24);
    if (days < 7) return days + "d ago";
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function loadTopBarNotifications() {
    const email = localStorage.getItem("agencyEmail");
    if (!email) return;

    // Smart URL Detect
    const baseUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") 
                    ? "http://localhost:8080" 
                    : "https://quantifire-iris-backend.onrender.com";

    $.get(`${baseUrl}/api/top-notifications/get?email=${email}`, function (res) {
        $('.notif-count').text(res.unreadCount).toggle(res.unreadCount > 0);
        const list = $('.notif-list').empty();
        if (res.notifications.length === 0) {
            list.append('<li style="padding:15px; text-align:center; color:#888;">No notifications</li>');
            return;
        }
        res.notifications.slice(0, 4).forEach(log => {
            list.append(`<li class="notif-item ${log.read ? '' : 'unread'}">
                <div class="n-icon ${log.type.toLowerCase()}"><i class="fa-solid fa-bell"></i></div>
                <div class="n-text"><p><strong>${log.title}</strong></p><span>${log.message}</span></div>
                <span class="n-time">${timeAgo(log.createdAt)}</span>
            </li>`);
        });
    });
}

$(document).on('click', '.mark-read', function () {
    const email = localStorage.getItem("agencyEmail");
    const baseUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") 
                    ? "http://localhost:8080" 
                    : "https://quantifire-iris-backend.onrender.com";

    $('.notif-item').removeClass('unread');
    $('.notif-count').fadeOut();
    $.post(`${baseUrl}/api/top-notifications/mark-read?email=${email}`);
});

async function handleHealthCheck() {
    const statusText = document.getElementById('statusMessage');
    if (!statusText) return;
    statusText.innerText = "Checking...";

    const baseUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") 
                    ? "http://localhost:8080" 
                    : "https://quantifire-iris-backend.onrender.com";

    try {
        const response = await fetch(`${baseUrl}/api/health`);
        statusText.innerText = response.ok ? "✅ Server Online" : "❌ Server Error";
        statusText.style.color = response.ok ? "green" : "red";
    } catch (e) {
        statusText.innerText = "❌ Server Offline";
        statusText.style.color = "orange";
    }
}