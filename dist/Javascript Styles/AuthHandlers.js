// Firebase Authentication handlers
// Using Firebase Auth from the compatibility version

// Initialize Firebase Auth
// auth is already declared in FirebaseConfig.js
// isAdminMode is declared globally in FirebaseConfig.js

// Monitor auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in through Firebase
        switchToAdminMode();
        // User is signed in through Firebase
        console.log('AuthHandlers: User signed in, switching to admin mode');
    } else {
        // Force guest mode on index page regardless of admin status
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
            setGuestMode();
            return;
        }
        
        // Check if user is logged in with hardcoded credentials
        const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
        if (isAdminLoggedIn) {
            // Only switch to admin mode on admin-specific pages
            if (window.location.pathname.includes('preorders.html')) {
                switchToAdminMode();
            } else {
                // For other pages, use guest mode
                setGuestMode();
            }
        } else {
            // User is signed out
            setGuestMode();
            // Redirect to index page if trying to access admin-only pages without authentication
            if (window.location.pathname.includes('preorders.html')) {
                window.location.href = 'index.html';
            }
        }
    }
});

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

function hideLoginModal() {
    const loginModal = document.getElementById('loginModalOverlay');
    if (loginModal) {
        loginModal.classList.remove('active');
    }
}

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

function logoutFromFirebase() {
    auth.signOut().then(() => {
        // Sign-out successful
        switchToGuestMode();
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

function switchToAdminMode() {
    console.log('Switching to admin mode...');
    isAdminMode = true;
    
    // Set localStorage flag for admin dashboard access
    localStorage.setItem('isAdminLoggedIn', 'true');
    const authButton = document.getElementById('authButtonText');
    const preOrdersNav = document.getElementById('preOrdersNav');
    const productManagementNav = document.getElementById('productManagementNav');
    const adminButtons = document.querySelectorAll('.admin-buttons');
    const editButtons = document.querySelectorAll('.edit-content-btn');
    
    console.log('authButton found:', authButton !== null);
    if (authButton) {
        authButton.textContent = 'Admin Mode';
        console.log('Set authButton text to:', authButton.textContent);
    }
    
    if (preOrdersNav) preOrdersNav.style.display = 'block';
    if (productManagementNav) productManagementNav.style.display = 'block';
    
    // Add admin-mode class to body to show admin-only elements
    if (document.body) {
        document.body.classList.add('admin-mode');
        console.log('Added admin-mode class to body');
    }
    
    // Update admin button visibility based on current page
    updateAdminButtonVisibility();
    
    // Show edit buttons on content pages (these are for content editing, not product management)
    editButtons.forEach(btn => btn.style.display = 'block');
    
    console.log('Admin mode set successfully');
    hideLoginModal();
    hideAdminDropdown();
}

function switchToGuestMode() {
    // Clear hardcoded admin login flag
    localStorage.removeItem('isAdminLoggedIn');
    
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
    
    // Remove admin-mode class to show guest-only elements
    document.body.classList.remove('admin-mode');
    
    // Hide admin buttons
    adminButtons.forEach(btn => btn.style.display = 'none');
    editButtons.forEach(btn => btn.style.display = 'none');
    
    hideAdminDropdown();
    
    // Sign out from Firebase (but don't wait for it to avoid auth loops)
    auth.signOut().catch(error => {
        console.error('Error signing out:', error);
    });
    
    // Redirect based on current page
    if (window.location.pathname.includes('preorders.html')) {
        window.location.href = 'index.html';
    }
}

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
