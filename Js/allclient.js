$(document).ready(function () {
            // 1. Master Close Function
            function closeAll() {
                $('.sidebar, .sidebar-overlay, #notifDropdown, #profileDropdown').removeClass('active');
            }

            // 2. Notification Toggle (Ye HTML line 65 ke liye hai)
            window.toggleNotification = function (event) {
                event.stopPropagation();
                const isActive = $('#notifDropdown').hasClass('active');
                closeAll(); // Pehle sab band
                if (!isActive) $('#notifDropdown').addClass('active');
            };

            // 3. Profile & Nav Toggle (Ye HTML line 64 aur 101 ke liye hai)
            window.toggleNavDropdown = function (event, id) {
                event.stopPropagation();
                const target = $(`#${id}`);
                const isActive = target.hasClass('active');
                closeAll(); // Pehle sab band
                if (!isActive) target.addClass('active');
            };

            // 4. Sidebar Toggle (Mobile support ke saath)
            $('#sidebarToggle').click(function (e) {
                e.stopPropagation();
                closeAll();
                if ($(window).width() <= 768) {
                    $('.sidebar, .sidebar-overlay').addClass('active');
                } else {
                    $('.sidebar').toggleClass('collapsed');
                }
            });

            // 5. Close Button & Overlay
            $('#sidebarClose, .sidebar-overlay').click(function () {
                closeAll();
            });

            // 6. Outside Click (Kahin bhi bahar click karne par band)
            $(document).on('click', function (e) {
                if (!$(e.target).closest('.sidebar, .notification-wrapper, .profile-info').length) {
                    closeAll();
                }
            });
        });


        // --- Logout Model Logic --- //
        
        function openLogoutModal() {
            const modal = document.getElementById('logoutModal');
            if (modal) {
                modal.classList.add('active');
                console.log("Logout Modal Opened");
            }

            const dropdown = document.getElementById('profileDropdown');
            if (dropdown) dropdown.classList.remove('active');
        }

        function closeLogoutModal() {
            const modal = document.getElementById('logoutModal');
            if (modal) {
                modal.classList.remove('active');
            }
        }

        function confirmLogout() {
            window.location.href = "AgencyLoginPage.html";
        }

        document.addEventListener('click', function (event) {
            const modal = document.getElementById('logoutModal');
            const modalContent = document.querySelector('.modal-content');

            if (modal && modal.classList.contains('active') && event.target === modal) {
                closeLogoutModal();
            }
        });
