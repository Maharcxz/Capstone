// Firebase Authentication handlers
// Using Firebase Auth from the compatibility version

// Initialize Firebase Auth
// auth is already declared in FirebaseConfig.js
// let isAdminMode = false; // Will be declared globally

// Monitor auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in through Firebase
        switchToAdminMode();
        // Redirect to admin dashboard if on login page
        if (window.location.pathname.includes('login.html')) {
            console.log('AuthHandlers: Redirecting to admin dashboard');
            setTimeout(function() {
                window.location.replace('admin-dashboard.html');
            }, 500);
        }
    } else {
        // Check if user is logged in with hardcoded credentials
        const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
        if (isAdminLoggedIn) {
            // Only switch to admin mode on admin-specific pages
            if (window.location.pathname.includes('admin-dashboard.html') || 
                window.location.pathname.includes('preorders.html')) {
                switchToAdminMode();
            } else if (window.location.pathname.includes('login.html')) {
                // Redirect to admin dashboard if on login page
                window.location.href = 'admin-dashboard.html';
            } else {
                // For other pages (like index), allow guest mode but keep login status
                setGuestMode();
            }
        } else {
            // User is signed out
            setGuestMode();
            // Only redirect to login if not already being redirected and not on login page
            if ((window.location.pathname.includes('admin-dashboard.html') || 
                window.location.pathname.includes('preorders.html')) && 
                !window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
    }
});

function handleAuthClick() {
    if (isAdminMode) {
        toggleAdminDropdown();
    } else {
        showLoginModal();
    }
}

function showLoginModal() {
    const loginModal = document.getElementById('loginModalOverlay');
    if (loginModal) {
        loginModal.classList.add('active');
    }
}

function hideLoginModal() {
    const loginModal = document.getElementById('loginModalOverlay');
    if (loginModal) {
        loginModal.classList.remove('active');
    }
}

function toggleAdminDropdown() {
    const dropdown = document.getElementById('adminDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
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
    const authButton = document.getElementById('authButtonText');
    const preOrdersNav = document.getElementById('preOrdersNav');
    const adminDashboardNav = document.getElementById('adminDashboardNav');
    const adminButtons = document.querySelectorAll('.admin-buttons');
    const editButtons = document.querySelectorAll('.edit-content-btn');
    const adminNavArea = document.querySelector('.admin-nav-area');
    
    console.log('authButton found:', authButton !== null);
    if (authButton) {
        authButton.textContent = 'Admin Mode';
        console.log('Set authButton text to:', authButton.textContent);
    }
    
    if (preOrdersNav) preOrdersNav.style.display = 'block';
    if (adminDashboardNav) adminDashboardNav.style.display = 'block';
    
    // Add admin-mode class to body to show admin-only elements
    if (document.body) {
        document.body.classList.add('admin-mode');
        console.log('Added admin-mode class to body');
    }
    
    // Show admin navigation area
    if (adminNavArea) {
        adminNavArea.style.display = 'block';
        console.log('Admin navigation area shown');
    }
    
    // Show admin buttons on product cards
    adminButtons.forEach(btn => btn.style.display = 'flex');
    
    // Show edit buttons on content pages
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
    const adminDashboardNav = document.getElementById('adminDashboardNav');
    const adminButtons = document.querySelectorAll('.admin-buttons');
    const editButtons = document.querySelectorAll('.edit-content-btn');
    const adminNavArea = document.querySelector('.admin-nav-area');
    
    if (authButton) authButton.textContent = 'Log In';
    if (preOrdersNav) preOrdersNav.style.display = 'none';
    if (adminDashboardNav) adminDashboardNav.style.display = 'none';
    
    // Remove admin-mode class to show guest-only elements
    document.body.classList.remove('admin-mode');
    
    // Hide admin navigation area
    if (adminNavArea) adminNavArea.style.display = 'none';
    
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
    } else if (window.location.pathname.includes('admin-dashboard.html')) {
        window.location.href = 'login.html';
    }
}

function setGuestMode() {
    isAdminMode = false;
    const authButton = document.getElementById('authButtonText');
    const preOrdersNav = document.getElementById('preOrdersNav');
    const adminDashboardNav = document.getElementById('adminDashboardNav');
    const adminButtons = document.querySelectorAll('.admin-buttons');
    const editButtons = document.querySelectorAll('.edit-content-btn');
    const adminNavArea = document.querySelector('.admin-nav-area');
    
    if (authButton) authButton.textContent = 'Log In';
    if (preOrdersNav) preOrdersNav.style.display = 'none';
    if (adminDashboardNav) adminDashboardNav.style.display = 'none';
    
    // Ensure admin-mode class is removed
    if (document.body) {
        document.body.classList.remove('admin-mode');
    }
    
    // Hide admin navigation area
    if (adminNavArea) adminNavArea.style.display = 'none';
    
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