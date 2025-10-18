// Event listeners initialization
// Bind global UI event listeners
// Bind global UI event listeners (dropdowns, forms, navigation)
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
    if (loginForm && !loginForm.dataset.loginBound) {
        // Prevent duplicate bindings if initializeEventListeners() is called multiple times
        loginForm.dataset.loginBound = 'true';
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            // Robust input selection: support multiple selectors and guard against null
            const emailInput = loginForm.querySelector('input[type="email"], #modalEmailInput, input[name="email"]');
            const passwordInput = loginForm.querySelector('input[type="password"], #modalPasswordInput, input[name="password"]');
            if (!emailInput || !passwordInput) {
                console.error('Login form inputs not found:', {
                    hasEmail: !!emailInput,
                    hasPassword: !!passwordInput
                });
                showLoginErrorModal('Login form is missing email or password field.');
                return;
            }
            const email = (emailInput.value || '').trim();
            const password = passwordInput.value || '';
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('loading');
            }
            
            // Save credentials if remember me is checked
            if (typeof saveCredentials === 'function') {
                saveCredentials(email, password);
            }
            
            // Use Firebase Authentication
            console.log('Attempting login with email:', email);
            try {
                const user = await firebaseServices.signInWithEmailAndPassword(email, password);
                console.log('Logged in successfully:', user.email);
                console.log('User object:', user);
                switchToAdminMode();
            } catch (error) {
                console.error('Login error details:', {
                    code: error.code,
                    message: error.message,
                    email: email
                });

                // More specific error messages (cover newer SDKs too)
                let errorMessage = '';
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'No account found with this email address.';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Incorrect password. Double-check and try again.';
                        break;
                    case 'auth/invalid-email':
                    case 'auth/missing-email':
                        errorMessage = 'Invalid email address format.';
                        break;
                    case 'auth/missing-password':
                        errorMessage = 'Please enter your password.';
                        break;
                    case 'auth/invalid-credential':
                    case 'auth/invalid-login-credentials':
                        errorMessage = 'Invalid email or password.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'This account has been disabled.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Too many failed attempts. Please try again later.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Network error. Check your connection and try again.';
                        break;
                    default:
                        errorMessage = error.message || 'Login failed. Please try again.';
                }

                // Show error in a modal with clear feedback
                showLoginErrorModal(errorMessage);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('loading');
                }
            }
        });
    }

    // Pre-order form submit is handled in preorder.html with unified save logic
    // Intentionally not binding here to prevent duplicate submissions/redirects

    // Admin button handlers
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('edit-btn')) {
            openFrameEditModal(event.target);
        } else if (event.target.classList.contains('delete-btn')) {
            // Removed legacy confirm; deletion is handled via Admin Dashboard modal
            // Intentionally no-op here to avoid conflicting UI
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
// Navigate to public home page
function navigateToHome() {
    window.location.href = 'index.html';
}

// Navigate to admin-only preorders page
function navigateToPreorders() {
    try {
        window.location.href = 'preorders.html';
    } catch (error) {
        console.error('Navigation error:', error);
        // Fallback navigation method
        window.location.replace('preorders.html');
    }
}

// Navigate to admin dashboard product management
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
// Enable admin UI and switch to admin mode
function enableAdminMode() {
    switchToAdminMode();
}

// Update frame card UI with provided details
function updateFrameDetails(frameId, details) {
    console.log('Updating frame:', frameId, details);
}

// Modal for login error feedback
// Display login error message in modal
function showLoginErrorModal(message) {
    // Remove any existing instance to ensure retrigger works reliably
    const existing = document.getElementById('loginErrorModalOverlay');
    if (existing) existing.remove();

    // Create overlay with fade animation
    const overlay = document.createElement('div');
    overlay.id = 'loginErrorModalOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '10000';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 180ms ease';

    // Dialog with fade/slide animation
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.style.background = '#1f1f1f';
    dialog.style.color = 'white';
    dialog.style.borderRadius = '12px';
    dialog.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    dialog.style.maxWidth = '420px';
    dialog.style.width = '90%';
    dialog.style.padding = '18px 20px';
    dialog.style.opacity = '0';
    dialog.style.transform = 'translateY(-8px)';
    dialog.style.transition = 'opacity 180ms ease, transform 180ms ease';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    
    const title = document.createElement('h3');
    title.textContent = 'Login Error';
    title.style.margin = '0';
    title.style.fontSize = '18px';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '22px';
    closeBtn.style.cursor = 'pointer';

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.style.marginTop = '12px';
    const msg = document.createElement('p');
    msg.textContent = message;
    msg.style.margin = '0';
    body.appendChild(msg);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.justifyContent = 'flex-end';
    actions.style.gap = '8px';
    actions.style.marginTop = '16px';

    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.className = 'admin-btn';
    okBtn.style.padding = '8px 12px';
    okBtn.style.borderRadius = '8px';
    okBtn.style.cursor = 'pointer';
    okBtn.style.background = '#540000';
    okBtn.style.color = '#fff';
    okBtn.style.border = 'none';

    actions.appendChild(okBtn);

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(actions);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Trigger fade-in animations on next frame
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        dialog.style.opacity = '1';
        dialog.style.transform = 'translateY(0)';
    });

    // Close interactions
    function closeWithAnimation() {
        // Start fade-out
        overlay.style.opacity = '0';
        dialog.style.opacity = '0';
        dialog.style.transform = 'translateY(-8px)';

        const removeAll = () => {
            document.removeEventListener('keydown', onKey);
            overlay.remove();
        };

        // Remove after transition ends, with a timeout fallback
        const timeoutId = setTimeout(removeAll, 220);
        overlay.addEventListener('transitionend', function handler() {
            overlay.removeEventListener('transitionend', handler);
            clearTimeout(timeoutId);
            removeAll();
        });
    }

    closeBtn.addEventListener('click', closeWithAnimation);
    okBtn.addEventListener('click', closeWithAnimation);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeWithAnimation(); });
    function onKey(e) {
        if (e.key === 'Escape') closeWithAnimation();
    }
    document.addEventListener('keydown', onKey);
}