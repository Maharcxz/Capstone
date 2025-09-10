// Firebase Authentication handlers
// Using Firebase Auth from the compatibility version

// Initialize Firebase Auth
const auth = firebase.auth();
let isAdminMode = false;

// Monitor auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in through Firebase
        switchToAdminMode();
    } else {
        // Check if user is logged in with hardcoded credentials
        const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
        if (isAdminLoggedIn) {
            // User is logged in with hardcoded credentials
            switchToAdminMode();
        } else {
            // User is signed out
            setGuestMode();
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
    const adminButtons = document.querySelectorAll('.admin-buttons');
    const editButtons = document.querySelectorAll('.edit-content-btn');
    
    console.log('authButton found:', authButton !== null);
    if (authButton) {
        authButton.textContent = 'Admin View';
        console.log('Set authButton text to:', authButton.textContent);
    }
    
    if (preOrdersNav) preOrdersNav.style.display = 'block';
    
    // Add admin-mode class to body to hide guest-only elements
    document.body.classList.add('admin-mode');
    console.log('Added admin-mode class to body');
    
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
    
    // Sign out from Firebase
    auth.signOut()
        .then(() => {
            isAdminMode = false;
            const authButton = document.getElementById('authButtonText');
            const preOrdersNav = document.getElementById('preOrdersNav');
            const adminButtons = document.querySelectorAll('.admin-buttons');
            const editButtons = document.querySelectorAll('.edit-content-btn');
            
            if (authButton) authButton.textContent = 'Admin Mode';
            if (preOrdersNav) preOrdersNav.style.display = 'none';
            
            // Remove admin-mode class to show guest-only elements
            document.body.classList.remove('admin-mode');
            
            // Hide admin buttons
            adminButtons.forEach(btn => btn.style.display = 'none');
            editButtons.forEach(btn => btn.style.display = 'none');
            
            hideAdminDropdown();
            
            // Redirect from preorders page if currently there
            if (window.location.pathname.includes('preorders.html')) {
                window.location.href = 'index.html';
            }
        })
        .catch(error => {
            console.error('Error signing out:', error);
        });
}

function setGuestMode() {
    isAdminMode = false;
    const authButton = document.getElementById('authButtonText');
    const preOrdersNav = document.getElementById('preOrdersNav');
    const adminButtons = document.querySelectorAll('.admin-buttons');
    const editButtons = document.querySelectorAll('.edit-content-btn');
    
    if (authButton) authButton.textContent = 'Admin Mode';
    if (preOrdersNav) preOrdersNav.style.display = 'none';
    
    // Ensure admin-mode class is removed
    document.body.classList.remove('admin-mode');
    
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