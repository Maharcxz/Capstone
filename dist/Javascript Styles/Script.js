// Global variables
// isAdminMode is declared globally
// currentEditTarget is declared in ContentEditingFunc.js

// Credential saving and loading functions
// No-op stub: credentials are not persisted client-side
function saveCredentials(email, password) {
    // No-op: credentials are not persisted client-side.
}

// No-op stub: no persisted credentials to load
function loadSavedCredentials() {
    // No-op: no persisted credentials to load.
}

// No-op stub: no persisted credentials to clear
function clearSavedCredentials() {
    // No-op: no persisted credentials to clear.
}

// Mark the current page's nav link as active
// Highlight current page link (call on DOMContentLoaded)
function setActiveNavLink() {
    try {
        const currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        const links = document.querySelectorAll('.nav .nav-left .nav-link');
        links.forEach(link => {
            const href = (link.getAttribute('href') || '').split('/').pop().toLowerCase();
            if (!href) return;
            if (href === currentFile) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    } catch (e) {
        console.warn('setActiveNavLink failed:', e);
    }
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

    // Set persistent active state for the current nav item
    setActiveNavLink();
    
    // Authentication state is handled by AuthHandlers.js
    // No need for duplicate auth state listener here
});

