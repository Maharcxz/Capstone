// Global variables
// isAdminMode is declared globally
// currentEditTarget is declared in ContentEditingFunc.js

// Credential saving and loading functions
function saveCredentials(email, password) {
    if (document.getElementById('rememberMeCheckbox').checked) {
        localStorage.setItem('savedEmail', email);
        localStorage.setItem('savedPassword', password);
        localStorage.setItem('rememberMe', 'true');
    } else {
        // Clear saved credentials if remember me is unchecked
        localStorage.removeItem('savedEmail');
        localStorage.removeItem('savedPassword');
        localStorage.removeItem('rememberMe');
    }
}

function loadSavedCredentials() {
    const rememberMe = localStorage.getItem('rememberMe');
    if (rememberMe === 'true') {
        const savedEmail = localStorage.getItem('savedEmail');
        const savedPassword = localStorage.getItem('savedPassword');
        
        if (savedEmail && savedPassword) {
            const emailInput = document.getElementById('modalEmailInput');
            const passwordInput = document.getElementById('modalPasswordInput');
            const rememberCheckbox = document.getElementById('rememberMeCheckbox');
            
            if (emailInput) emailInput.value = savedEmail;
            if (passwordInput) passwordInput.value = savedPassword;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }
}

function clearSavedCredentials() {
    localStorage.removeItem('savedEmail');
    localStorage.removeItem('savedPassword');
    localStorage.removeItem('rememberMe');
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

