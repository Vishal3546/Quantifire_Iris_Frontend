// ==========================================
// 1. GLOBAL UI SYNC (Logos & Names)
// ==========================================
// Base URL constant taaki baar-baar type na karna pade
const BASE_URL = "https://quantifire-iris-backend.onrender.com";

function syncGlobalAgencyUI() {
    const agencyEmail = localStorage.getItem("agencyEmail");
    if (!agencyEmail) return;

    $.ajax({
        url: `${BASE_URL}/api/agency/profile`,
        type: "GET",
        data: { email: agencyEmail },
        success: function (data) {
            if (data.agencyLogo) {
                let finalPath = data.agencyLogo;

                // Supabase Cleaning Logic (Localhost check removed)
                if (finalPath.includes("https://egkhvxnutuiivybwibqx.supabase.co")) {
                    // Seedha URL use karein agar Supabase ka hai
                    finalPath = decodeURIComponent(finalPath);
                } 
                else if (!finalPath.startsWith('http')) {
                    // Agar relative path hai toh backend uploads folder se connect karein
                    finalPath = `${BASE_URL}/uploads/logos/${finalPath}`;
                }

                $("#sidebarAgencyLogo, #headerAgencyLogo, #leftAgencyLogo, .avatar-circle img").attr("src", finalPath);
                console.log("✅ Global Logo Updated:", finalPath);
            }

            const aName = data.agencyName || "Agency User";
            $(".display-agency-name, .user-mini-profile p, .d-name").text(aName);
            $("#display-agency-email").text(data.email);
        }
    });
}

// ==========================================
// 2. LOGOUT LOGIC
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
    // Cookie clear logic
    document.cookie = "isAgencyLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "AgencyLogin.html";
}

// ==========================================
// 3. DOCUMENT READY
// ==========================================
$(document).ready(function () {
    const $sidebar = $('.sidebar');
    const $notifDropdown = $('#notifDropdown');
    const $profileDropdown = $('#profileDropdown');
    const $profileChevron = $('#profileChevron');

    syncGlobalAgencyUI();
    loadTopBarNotifications();

    // SIDEBAR & DROPDOWN EVENTS
    $('#sidebarToggle').on('click', function (e) {
        e.stopPropagation();
        $sidebar.toggleClass('collapsed');
    });

    $('#closeSidebarBtn').on('click', function (e) {
        e.stopPropagation();
        $sidebar.removeClass('collapsed');
    });

    window.toggleNotification = function (event) {
        event.stopPropagation();
        $sidebar.removeClass('collapsed');
        $notifDropdown.toggleClass('active');
        $profileDropdown.removeClass('active');
    };

    window.toggleProfileDropdown = function (event) {
        event.stopPropagation();
        $sidebar.removeClass('collapsed');
        const isActive = $profileDropdown.toggleClass('active').hasClass('active');
        $profileChevron.css("transform", isActive ? "rotate(180deg)" : "rotate(0deg)");
        $notifDropdown.removeClass('active');
    };

    // Outside Click to close
    $(document).on('click', function (event) {
        if (!$(event.target).closest('.sidebar, #sidebarToggle').length) {
            $sidebar.removeClass('collapsed');
        }
        if (!$(event.target).closest('.notification-wrapper, .profile-info, .notif-dropdown, .profile-dropdown').length) {
            $notifDropdown.removeClass('active');
            $profileDropdown.removeClass('active');
            $profileChevron.css("transform", "rotate(0deg)");
        }
        if ($(event.target).is('#logoutModal')) closeLogoutModal();
    });

    const checkStatusBtn = document.getElementById('checkStatusBtn');
    if (checkStatusBtn) {
        checkStatusBtn.addEventListener('click', handleHealthCheck);
    }
});

// ==========================================
// 4. NOTIFICATIONS & HEALTH CHECK
// ==========================================
function timeAgo(dateString) {
    if (!dateString) return "Just now";
    
    // Parse the date and handle timezone offset
    const date = new Date(dateString);
    const now = new Date();
    
    // Difference in seconds
    const seconds = Math.floor((now - date) / 1000);
    
    // Agar difference minus mein ja raha ho (server/client sync issue) toh "Just now" dikhayein
    if (seconds < 30) return "Just now";
    
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
    
    $.get(`${BASE_URL}/api/top-notifications/get?email=${email}`, function (res) {
        $('.notif-count').text(res.unreadCount).toggle(res.unreadCount > 0);
        const list = $('.notif-list').empty();
        if (!res.notifications || res.notifications.length === 0) {
            list.append('<li style="padding:15px; text-align:center; color:#888;">No notifications</li>');
            return;
        }
        res.notifications.slice(0, 3).forEach(log => {
            list.append(`
                <li class="notif-item ${log.read ? '' : 'unread'}">
                    <div class="n-icon ${log.type.toLowerCase()}"><i class="fa-solid fa-bell"></i></div>
                    <div class="n-text"><p><strong>${log.title}</strong></p><span>${log.message}</span></div>
                    <span class="n-time">${timeAgo(log.createdAt)}</span>
                </li>`);
        });
    });
}

$(document).on('click', '.mark-read', function () {
    const email = localStorage.getItem("agencyEmail");
    $('.notif-item').removeClass('unread');
    $('.notif-count').fadeOut();
    $.post(`${BASE_URL}/api/top-notifications/mark-read?email=${email}`);
});

async function handleHealthCheck() {
    const statusText = document.getElementById('statusMessage');
    if (!statusText) return;
    statusText.innerText = "Checking...";
    try {
        const response = await fetch(`${BASE_URL}/api/health`);
        statusText.innerText = response.ok ? "✅ Server Online" : "❌ Server Error";
        statusText.style.color = response.ok ? "green" : "red";
    } catch (e) {
        statusText.innerText = "❌ Server Offline";
        statusText.style.color = "orange";
    }
}