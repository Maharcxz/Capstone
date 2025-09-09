// Password toggle function
function togglePassword() {
    const passwordInput = document.getElementById('passwordInput');
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