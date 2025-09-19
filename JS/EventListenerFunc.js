// Event listeners initialization
function initializeEventListeners() {
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.auth-section')) {
            hideAdminDropdown();
        }
        
        if (!event.target.closest('.sidebar') && !event.target.closest('.frame-types-menu')) {
            closeSidebar();
        }
        
        if (!event.target.closest('.notifications-panel') && !event.target.closest('.notification-wrapper')) {
            hideNotifications();
        }
    });

    // Handle login form submission
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            
            // Save credentials if remember me is checked
            if (typeof saveCredentials === 'function') {
                saveCredentials(email, password);
            }
            
            // Use Firebase Authentication
            console.log('Attempting login with email:', email);
            firebaseServices.signInWithEmailAndPassword(email, password)
                .then(user => {
                    console.log('Logged in successfully:', user.email);
                    console.log('User object:', user);
                    switchToAdminMode();
                })
                .catch(error => {
                    console.error('Login error details:', {
                        code: error.code,
                        message: error.message,
                        email: email
                    });
                    
                    // More specific error messages
                    let errorMessage = 'Login failed: ';
                    switch(error.code) {
                        case 'auth/user-not-found':
                            errorMessage += 'No account found with this email address.';
                            break;
                        case 'auth/wrong-password':
                            errorMessage += 'Incorrect password.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage += 'Invalid email address format.';
                            break;
                        case 'auth/user-disabled':
                            errorMessage += 'This account has been disabled.';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage += 'Too many failed attempts. Please try again later.';
                            break;
                        default:
                            errorMessage += error.message;
                    }
                    
                    alert(errorMessage);
                });
        });
    }

    // Handle pre-order form submission if on preorder page
    const preorderPageForm = document.querySelector('.preorder-page-form');
    if (preorderPageForm) {
        preorderPageForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const formData = new FormData(preorderPageForm);
            const firstName = formData.get('firstName') || preorderPageForm.querySelector('input[placeholder="First Name"]')?.value || '';
            const lastName = formData.get('lastName') || preorderPageForm.querySelector('input[placeholder="Last Name"]')?.value || '';
            const customerName = `${firstName} ${lastName}`.trim() || 'Customer';
            
            addPreOrderNotification('Titanium Slim Frame', customerName);
            window.location.href = 'preorder-confirmation.html';
        });
    }

    // Admin button handlers
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('edit-btn')) {
            openFrameEditModal(event.target);
        } else if (event.target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this product?')) {
                console.log('Delete product confirmed');
            }
        } else if (event.target.classList.contains('visible-btn')) {
            const button = event.target;
            if (button.textContent === 'Visible') {
                button.textContent = 'Hidden';
                button.style.background = '#666';
            } else {
                button.textContent = 'Visible';
                button.style.background = '#540000';
            }
        }
    });

    // Initialize search
    initializeSearch();
}

// Utility functions
function navigateToHome() {
    window.location.href = 'index.html';
}

function navigateToPreorders() {
    try {
        window.location.href = 'preorders.html';
    } catch (error) {
        console.error('Navigation error:', error);
        // Fallback navigation method
        window.location.replace('preorders.html');
    }
}

function navigateToProductManagement() {
    try {
        window.location.href = 'admin-dashboard.html';
    } catch (error) {
        console.error('Navigation error:', error);
        // Fallback navigation method
        window.location.replace('admin-dashboard.html');
    }
}

// Admin functions for future expansion
function enableAdminMode() {
    switchToAdminMode();
}

function updateFrameDetails(frameId, details) {
    console.log('Updating frame:', frameId, details);
}