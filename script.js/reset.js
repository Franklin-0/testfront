import { API_BASE_URL } from "./config.js";
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reset-form');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const messageEl = document.getElementById('form-message');

  // --- DOM Element Existence Check ---
  if (!form || !passwordInput || !confirmPasswordInput || !messageEl) {
    console.warn('Reset form elements not found. Aborting script.');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageEl.textContent = '';
    const submitBtn = form.querySelector('button[type="submit"]');

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) {
      messageEl.style.color = 'red';
      messageEl.textContent = 'Passwords do not match.';
      return;
    }

    // --- Password Strength Validation ---
    if (password.length < 8) {
      messageEl.style.color = 'red';
      messageEl.textContent = 'Password must be at least 8 characters long.';
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      messageEl.style.color = 'red';
      messageEl.textContent = 'Password must contain an uppercase letter, a lowercase letter, and a number.';
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      messageEl.style.color = 'red';
      messageEl.textContent = 'Password must include at least one special character.';
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      messageEl.style.color = 'red';
      messageEl.textContent = 'No reset token found. Please request a new link.';
      return;
    }

    submitBtn.disabled = true; // Disable button to prevent double submission
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        messageEl.style.color = 'green';
        messageEl.textContent = 'Password reset successfully! Redirecting to login...';
        setTimeout(() => { window.location.href = 'login.html'; }, 3000); // Increased timeout
      } else {
        messageEl.style.color = 'red';
        // Avoid leaking backend error details to the user
        messageEl.textContent = 'Could not reset password. The link may be invalid or expired.';
        submitBtn.disabled = false; // Re-enable button on failure
      }
    } catch (error) {
      messageEl.style.color = 'red';
      messageEl.textContent = 'Could not connect to the server.';
      submitBtn.disabled = false; // Re-enable button on failure
    }
  });
});