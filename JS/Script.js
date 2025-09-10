// Global state
let isAdminMode = false;
let currentEditTarget = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase listeners
    firebaseServices.listenForNewPreOrders(newPreOrder => {
        // Update UI when new pre-orders are added
        updateNotificationBadge();
        updateNotificationsList();
    });
    
    // Initial UI updates
    updateNotificationBadge();
    initializeEventListeners();
    
    // Start in guest mode
    setGuestMode();
    
    // Check authentication state
    firebaseServices.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            switchToAdminMode();
        } else {
            // User is signed out
            setGuestMode();
        }
    });
});

