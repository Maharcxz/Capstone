// Global variables
// isAdminMode is declared globally
// currentEditTarget is declared in ContentEditingFunc.js

// Credential saving and loading functions
function saveCredentials(email, password) {
    // No-op: credentials are not persisted client-side.
}

function loadSavedCredentials() {
    // No-op: no persisted credentials to load.
}

function clearSavedCredentials() {
    // No-op: no persisted credentials to clear.
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Load saved credentials if available
    loadSavedCredentials();
    
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

