// Firebase Authentication handlers
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Initialize Firebase Auth
const auth = getAuth();
let isAdminMode = false;

// Monitor auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        switchToAdminMode();
    } else {
        // User is signed out
        setGuestMode();
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
    signInWithEmailAndPassword(auth, email, password)
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
    signOut(auth).then(() => {
        // Sign-out successful
        switchToGuestMode();
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

function switchToAdminMode() {
    isAdminMode = true;
    const authButton = document.getElementById('authButtonText');
    const preOrdersNav = document.getElementById('preOrdersNav');
    const adminButtons = document.querySelectorAll('.admin-buttons');
    const editButtons = document.querySelectorAll('.edit-content-btn');
    
    if (authButton) authButton.textContent = 'Admin View';
    if (preOrdersNav) preOrdersNav.style.display = 'block';
    
    // Add admin-mode class to body to hide guest-only elements
    document.body.classList.add('admin-mode');
    
    // Show admin buttons on product cards
    adminButtons.forEach(btn => btn.style.display = 'flex');
    
    // Show edit buttons on content pages
    editButtons.forEach(btn => btn.style.display = 'block');
    
    hideLoginModal();
    hideAdminDropdown();
}

function switchToGuestMode() {
    // Sign out from Firebase
    firebaseServices.signOut()
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
}

function hideAdminDropdown() {
    const dropdown = document.getElementById('adminDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}