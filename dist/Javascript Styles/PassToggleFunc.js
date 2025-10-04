function togglePassword() {
    const passwordInput = document.getElementById('modalPasswordInput') || document.getElementById('passwordInput') || document.getElementById('password');
    const passwordToggle = document.querySelector('.password-toggle');
    if (passwordInput && passwordToggle) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordToggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg>';
            passwordToggle.setAttribute('aria-label','Hide password');
        } else {
            passwordInput.type = 'password';
            passwordToggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            passwordToggle.setAttribute('aria-label','Show password');
        }
    }
}