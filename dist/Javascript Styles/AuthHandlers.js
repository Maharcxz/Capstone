// Firebase Authentication handlers
// Using Firebase Auth from the compatibility version

// Initialize Firebase Auth
// auth is already declared in FirebaseConfig.js
// isAdminMode is declared globally in FirebaseConfig.js

// Monitor auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        switchToAdminMode();
        console.log('AuthHandlers: User signed in, switching to admin mode');
    } else {
        setGuestMode();
        const path = window.location.pathname || '';
        if (path.includes('preorders.html') || path.includes('admin-dashboard.html')) {
            window.location.href = 'index.html';
        }
    }
});

// Handle auth button click; toggles login modal or admin menu
function handleAuthClick() {
    console.log('handleAuthClick called, isAdminMode:', isAdminMode);
    if (isAdminMode) {
        console.log('Admin mode detected, calling toggleAdminDropdown');
        toggleAdminDropdown();
    } else {
        console.log('Guest mode detected, showing login modal');
        showLoginModal();
    }
}

// Open login modal and preload saved credentials if available
function showLoginModal() {
    const loginModal = document.getElementById('loginModalOverlay');
    if (loginModal) {
        loginModal.classList.add('active');
        // Load saved credentials when modal is opened
        if (typeof loadSavedCredentials === 'function') {
            loadSavedCredentials();
        }
    }
}

// Close login modal overlay
function hideLoginModal() {
    const loginModal = document.getElementById('loginModalOverlay');
    if (loginModal) {
        loginModal.classList.remove('active');
    }
}

// Toggle visibility of the admin dropdown panel
function toggleAdminDropdown() {
    console.log('toggleAdminDropdown called, isAdminMode:', isAdminMode);
    const dropdown = document.getElementById('adminDropdown');
    console.log('dropdown element found:', dropdown !== null);
    if (dropdown) {
        dropdown.classList.toggle('active');
        console.log('dropdown classes after toggle:', dropdown.className);
        console.log('dropdown display style:', window.getComputedStyle(dropdown).display);
    }
}

// Sign in using Firebase email/password and enable admin mode
function loginWithFirebase(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in successfully
            const user = userCredential.user;
            console.log('Logged in as:', user.email);
            switchToAdminMode();
        })
        .catch((error) => {
            console.error('Login error:', error.code, error.message);
            alert('Login failed: ' + error.message);
        });
}

// Sign out from Firebase and revert to guest mode
function logoutFromFirebase() {
    auth.signOut().then(() => {
        // Sign-out successful
        switchToGuestMode();
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

// Enable admin UI, update nav, and mark admin mode
function switchToAdminMode() {
    console.log('Switching to admin mode...');
    isAdminMode = true;
    const authButton = document.getElementById('authButtonText');
    const preOrdersNav = document.getElementById('preOrdersNav');
    const productManagementNav = document.getElementById('productManagementNav');
    const adminButtons = document.querySelectorAll('.admin-buttons');
    const editButtons = document.querySelectorAll('.edit-content-btn');
    if (authButton) {
        authButton.textContent = 'Admin Mode';
    }
    if (preOrdersNav) preOrdersNav.style.display = 'block';
    if (productManagementNav) productManagementNav.style.display = 'block';
    if (document.body) {
        document.body.classList.add('admin-mode');
    }
    updateAdminButtonVisibility();
    editButtons.forEach(btn => btn.style.display = 'block');
    hideLoginModal();
    hideAdminDropdown();
}

// Disable admin UI, hide protected nav, and enforce guest state
function switchToGuestMode() {
    // Update UI immediately
    isAdminMode = false;
    const authButton = document.getElementById('authButtonText');
    const preOrdersNav = document.getElementById('preOrdersNav');
    const productManagementNav = document.getElementById('productManagementNav');
    const adminButtons = document.querySelectorAll('.admin-buttons');
    const editButtons = document.querySelectorAll('.edit-content-btn');
    if (authButton) authButton.textContent = 'Log In';
    if (preOrdersNav) preOrdersNav.style.display = 'none';
    if (productManagementNav) productManagementNav.style.display = 'none';
    document.body.classList.remove('admin-mode');
    adminButtons.forEach(btn => btn.style.display = 'none');
    editButtons.forEach(btn => btn.style.display = 'none');
    hideAdminDropdown();
    auth.signOut().catch(error => {
        console.error('Error signing out:', error);
    });
    if (window.location.pathname.includes('preorders.html')) {
        window.location.href = 'index.html';
    }
}

// Initialize guest mode UI without triggering sign-out
function setGuestMode() {
    isAdminMode = false;
    const authButton = document.getElementById('authButtonText');
    const preOrdersNav = document.getElementById('preOrdersNav');
    const productManagementNav = document.getElementById('productManagementNav');
    const adminButtons = document.querySelectorAll('.admin-buttons');
    const editButtons = document.querySelectorAll('.edit-content-btn');
    
    if (authButton) authButton.textContent = 'Log In';
    if (preOrdersNav) preOrdersNav.style.display = 'none';
    
    // Ensure admin-mode class is removed
    if (document.body) {
        document.body.classList.remove('admin-mode');
    }
    
    adminButtons.forEach(btn => btn.style.display = 'none');
    editButtons.forEach(btn => btn.style.display = 'none');
    
    console.log('Guest mode set successfully');
}

// Hide admin dropdown if open
function hideAdminDropdown() {
    const dropdown = document.getElementById('adminDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

// Utility function to handle admin button visibility based on current page
function updateAdminButtonVisibility() {
    const adminButtons = document.querySelectorAll('.admin-buttons');
    const isAdminDashboard = window.location.pathname.includes('admin-dashboard.html');
    
    if (isAdminMode && isAdminDashboard) {
        // Show admin buttons only on admin dashboard when in admin mode
        adminButtons.forEach(btn => btn.style.display = 'flex');
    } else {
        // Hide admin buttons on all other pages or when not in admin mode
        adminButtons.forEach(btn => btn.style.display = 'none');
    }
}

// Temporary function for testing admin mode
function enableTestAdminMode() {
    console.log('Enabling test admin mode...');
    switchToAdminMode();
}

// Make functions globally available
window.enableTestAdminMode = enableTestAdminMode;
window.updateAdminButtonVisibility = updateAdminButtonVisibility;
