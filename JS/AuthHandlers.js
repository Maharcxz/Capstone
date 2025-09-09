// Authentication handlers
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