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

// Helper: get recipient email with optional admin override via localStorage
function getRecipientEmail(defaultEmail) {
    try {
        const override = (localStorage.getItem('adminEmailOverride') || '').trim();
        return override || (defaultEmail || '').trim();
    } catch (e) {
        return (defaultEmail || '').trim();
    }
}

// Disable Gmail compose fallback on preorders page and keep send in-app
function disableGmailFallbackOnPreorders() {
    try {
        const currentFile = (window.location.pathname.split('/').pop() || '').toLowerCase();
        if (currentFile !== 'preorders.html') return;
        // If preorders.html defined a Gmail fallback, override it to a no-op with user feedback
        if (typeof window.openGmailCompose === 'function') {
            window.openGmailCompose = function(to, subject, bodyText) {
                // Reset button UI if it was set to "Opening Gmail..."
                const sendBtn = document.getElementById('sendMailButton');
                if (sendBtn) sendBtn.textContent = 'Send Mail';
                // Prefer the page's confirm modal if available; else alert
                if (typeof window.openConfirmModal === 'function') {
                    window.openConfirmModal({
                        title: 'Email Sending Failed',
                        message: 'Email API is unavailable. Gmail redirect is disabled.',
                        confirmText: 'OK',
                        showCancel: false
                    });
                } else {
                    alert('Email API is unavailable. Gmail redirect is disabled.');
                }
                // Do not redirect to Gmail or mailto
                return false;
            };
        }
    } catch (e) {
        console.warn('disableGmailFallbackOnPreorders error:', e);
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

    // Ensure Gmail fallback is disabled on preorders page
    disableGmailFallbackOnPreorders();
    
    // Authentication state is handled by AuthHandlers.js
    // No need for duplicate auth state listener here
});

