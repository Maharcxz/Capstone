// Global variables
// isAdminMode is declared globally
// currentEditTarget is declared in ContentEditingFunc.js

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
    
    // Authentication state is handled by AuthHandlers.js
    // No need for duplicate auth state listener here
});

