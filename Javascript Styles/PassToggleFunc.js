// Password toggle function
function togglePassword() {
    // Try to find password input with different IDs
    const passwordInput = document.getElementById('modalPasswordInput') || document.getElementById('passwordInput') || document.getElementById('password');
    const passwordToggle = document.querySelector('.password-toggle');
    
    if (passwordInput && passwordToggle) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordToggle.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            passwordToggle.textContent = '👁';
        }
    }
}