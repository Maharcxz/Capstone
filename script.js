// Sidebar functions
function toggleSidebar() {
    const sidebar = document.getElementById('frameSidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('shifted');
    overlay.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('frameSidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.remove('active');
    mainContent.classList.remove('shifted');
    overlay.classList.remove('active');
}

// Login modal functions
function showLoginModal() {
    const loginModal = document.getElementById('loginModalOverlay');
    loginModal.classList.add('active');
}

function hideLoginModal() {
    const loginModal = document.getElementById('loginModalOverlay');
    loginModal.classList.remove('active');
}

// Pre-order modal functions (disabled for now)
function showPreOrderModal() {
    // Function disabled - leave blank for now
}

function hidePreOrderModal() {
    // Function disabled - leave blank for now
}

// Password toggle function
function togglePassword() {
    const passwordInput = document.getElementById('passwordInput');
    const passwordToggle = document.querySelector('.password-toggle');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordToggle.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        passwordToggle.textContent = '👁';
    }
}

// Frame type header functionality
function updateFrameTypeTitle(categoryName) {
    const frameTypeTitle = document.getElementById('frameTypeTitle');
    if (frameTypeTitle) {
        frameTypeTitle.textContent = categoryName;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    
    // Close sidebar when clicking outside
    document.addEventListener('click', function(event) {
        const sidebar = document.getElementById('frameSidebar');
        const frameMenu = document.querySelector('.frame-types-menu');
        
        if (sidebar && frameMenu && !sidebar.contains(event.target) && !frameMenu.contains(event.target)) {
            closeSidebar();
        }
    });

    // Handle login form submission
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            // Add your login logic here
            console.log('Login form submitted');
            hideLoginModal();
        });
    }

    // Handle pre-order form submission
    const preorderPageForm = document.querySelector('.preorder-page-form');
    if (preorderPageForm) {
        preorderPageForm.addEventListener('submit', function(event) {
            event.preventDefault();
            // Add your pre-order logic here
            console.log('Pre-order form submitted');
            
            // Get form data (optional - for future backend integration)
            const formData = new FormData(preorderPageForm);
            
            // Redirect to confirmation page
            window.location.href = 'preorder-confirmation.html';
        });
    }
});

// Utility functions
function navigateToHome() {
    window.location.href = 'index.html';
}

// Frame category selection
function selectFrameCategory(category) {
    console.log('Selected frame category:', category);
    updateFrameTypeTitle(category);
    closeSidebar();
    // Add category filtering logic here
    filterProductsByCategory(category);
}

function filterProductsByCategory(category) {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        // This would filter based on data attributes or product categories
        // For now, just log the category selection
        card.style.display = 'block';
    });
}

// Admin functions (for future expansion)
function enableAdminMode() {
    console.log('Admin mode enabled');
    // Add admin-specific functionality here
}

function updateFrameDetails(frameId, details) {
    console.log('Updating frame:', frameId, details);
    // Add frame update logic here
}

