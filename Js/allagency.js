// ==========================================
// 1. GLOBAL FUNCTIONS (Ready ke bahar taaki HTML onclick kaam karein)
// ==========================================


$.ajaxPrefilter(function(options) {
    // 1. Woh purana address jo aapne 50 jagah likha hai
    var oldBase = "http://localhost:8080";

    // 2. Aapka naya Render wala backend URL
    var liveBase = "https://quantifire-iris-backend.onrender.com"; 

    // Ye line har AJAX request ko intercept karegi
    if (options.url.indexOf(oldBase) !== -1) {
        // Purane localhost ko naye live URL se replace kar do
        options.url = options.url.replace(oldBase, liveBase);
        console.log("Redirecting AJAX to Live Backend: ", options.url);
    }
});




function openLogoutModal() {
    console.log("Opening Logout Modal...");
    // jQuery use karke modal ko 'flex' display dein aur active class lagayein
    $("#logoutModal").fadeIn(200).css("display", "flex").addClass('active');
    $("#profileDropdown").removeClass('active');
    $("#profileChevron").css("transform", "rotate(0deg)");
}

function closeLogoutModal() {
    $("#logoutModal").fadeOut(200).removeClass('active');
}

function confirmLogout() {
    console.log("Cleaning session and redirecting...");
    // 1. LocalStorage saaf karein
    localStorage.clear();

    // 2. Cookie ko expire karein (Security ke liye)
    document.cookie = "isAgencyLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // 3. Login page par bhejein
    window.location.href = "AgencyLogin.html";
}

// ==========================================
// 2. DOCUMENT READY LOGIC
// ==========================================

$(document).ready(function () {
    const agencyEmail = localStorage.getItem("agencyEmail");
    const $sidebar = $('.sidebar');
    const $notifDropdown = $('#notifDropdown');
    const $profileDropdown = $('#profileDropdown');
    const $profileChevron = $('#profileChevron');

    // --- A. Profile Loading ---
    function loadGlobalProfile() {
        if (!agencyEmail) return;
        $.ajax({
            url: "http://localhost:8080/api/agency/profile",
            type: "GET",
            data: { email: agencyEmail },
            success: function (data) {
                if (data.agencyLogo) {
                    let finalPath = "http://localhost:8080/uploads/logos/" + encodeURIComponent(data.agencyLogo);
                    $("#sidebarAgencyLogo, #headerAgencyLogo, #leftAgencyLogo").attr("src", finalPath);
                }
                const aName = data.agencyName || "Agency User";
                $(".display-agency-name, .user-mini-profile p, .d-name").text(aName);
                $("#display-agency-email").text(data.email);
            }
        });
    }
    loadGlobalProfile();

    // --- B. Sidebar Toggle Logic ---
    $('#sidebarToggle').click(function (e) {
        e.stopPropagation();
        $notifDropdown.removeClass('active');
        $profileDropdown.removeClass('active');
        $profileChevron.css("transform", "rotate(0deg)");
        $sidebar.toggleClass('collapsed');
        
        // Map resize fix
        setTimeout(() => { if (typeof map !== 'undefined') map.invalidateSize(); }, 300);
    });

    // --- C. Dropdowns Toggles ---
    window.toggleNotification = function (event) {
        event.stopPropagation();
        $sidebar.removeClass('collapsed');
        $profileDropdown.removeClass('active');
        $profileChevron.css("transform", "rotate(0deg)");
        $notifDropdown.toggleClass('active');
    };

    window.toggleProfileDropdown = function (event) {
        event.stopPropagation();
        $sidebar.removeClass('collapsed');
        $notifDropdown.removeClass('active');
        const isActive = $profileDropdown.toggleClass('active').hasClass('active');
        $profileChevron.css("transform", isActive ? "rotate(180deg)" : "rotate(0deg)");
    };

    // --- D. Global Click Close ---
    $(document).click(function (event) {
        if (!$(event.target).closest('.sidebar, .notification-wrapper, .profile-info, .notif-dropdown, .profile-dropdown').length) {
            $sidebar.removeClass('collapsed');
            $notifDropdown.removeClass('active');
            $profileDropdown.removeClass('active');
            $profileChevron.css("transform", "rotate(0deg)");
        }
        // Modal ke bahar click karne par band ho (Optional)
        if ($(event.target).is('#logoutModal')) {
            closeLogoutModal();
        }
    });

    $('#closeSidebarBtn').click(function () {
        $sidebar.removeClass('collapsed');
    });
});


// ==========================================
// TOP BAR NOTIFICATIONS LOGIC (Global)
// ==========================================

// ==========================================
// TIME AGO FORMATTER FUNCTION
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

$(document).ready(function () {
    // Page load hote hi notifications fetch karo
    loadTopBarNotifications();
});

function loadTopBarNotifications() {
    const email = localStorage.getItem("agencyEmail");
    if (!email) return;

    $.ajax({
        url: `http://localhost:8080/api/top-notifications/get?email=${email}`,
        type: "GET",
        success: function (res) {
            const count = res.unreadCount;
            const notifs = res.notifications;

            // 1. Update Red Badge (Bell icon ke upar ka number)
            if (count > 0) {
                $('.notif-count').text(count).show();
            } else {
                $('.notif-count').hide();
            }

            // 2. Clear Purana Static HTML
            const notifListUI = $('.notif-list');
            if (notifListUI.length === 0) return; // Agar kisi page par top bar nahi hai toh error na aaye

            notifListUI.empty();

            if (notifs.length === 0) {
                notifListUI.append('<li style="padding:15px; text-align:center; color:#888;">No new notifications</li>');
                return;
            }

            // 3. Loop lagakar naye notifications UI me daalo
            const recentNotifs = notifs.slice(0, 3); 

            recentNotifs.forEach(log => {
                let iconClass = "info";
                let iconHtml = '<i class="fa-solid fa-bell"></i>';
                if (log.type === "SUCCESS") {
                    iconClass = "success"; 
                    iconHtml = '<i class="fa-solid fa-check"></i>';
                } else if (log.type === "INFO") {
                    iconClass = "info"; 
                    iconHtml = '<i class="fa-solid fa-user-plus"></i>';
                } else if (log.type === "WARNING" || log.type === "ERROR") {
                    iconClass = "warning"; 
                    iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>';
                }

                let readClass = log.read ? "" : "unread";

                let html = `
                    <li class="notif-item ${readClass}">
                        <div class="n-icon ${iconClass}">${iconHtml}</div>
                        <div class="n-text">
                            <p><strong>${log.title}</strong></p>
                            <span>${log.message}</span>
                        </div>
                        <span class="n-time">${timeAgo(log.createdAt)}</span> 
                    </li>
                `;
                notifListUI.append(html);
            });
        },
        error: function(err) {
            console.error("Failed to fetch top notifications", err);
        }
    });
}

// "Mark all read" Button ka click logic (Global Event Delegation)
$(document).on('click', '.mark-read', function(e) {
    e.stopPropagation(); 
    const email = localStorage.getItem("agencyEmail");
    if (!email) return;

    // UI ko turant update karo
    $('.notif-item').removeClass('unread');
    $('.notif-count').fadeOut(); 

    // Background me DB update karo
    $.ajax({
        url: `http://localhost:8080/api/top-notifications/mark-read?email=${email}`,
        type: "POST",
        success: function() {
            console.log("Database updated: All notifications marked as read.");
        }
    });
});