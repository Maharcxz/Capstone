// Global state
let isAdminMode = false;
let currentEditTarget = null;

// Pre-order notifications functionality
let preOrderNotifications = JSON.parse(localStorage.getItem('preOrderNotifications')) || [];

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    updateNotificationBadge();
    initializeEventListeners();
    
    // Start in guest mode
    setGuestMode();
});

