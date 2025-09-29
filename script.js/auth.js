console.log("API_BASE_URL from config:", API_BASE_URL);
import { API_BASE_URL } from "./config.js";
document.addEventListener('DOMContentLoaded', () => {
  // --- Google Login Button ---
  const googleLoginBtn = document.getElementById('google-login-btn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = `${API_BASE_URL}/api/auth/google`;
    });
  }

  if (window.location.pathname.endsWith('login.html')) {
    (async function redirectIfLoggedIn() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/status`, { credentials: 'include' });
        const data = await response.json();
        if (data.isLoggedIn) {
          console.log('User is already logged in. Redirecting to homepage.');
          window.location.href = 'index.html';
        }
      } catch (error) {
        console.error('Could not check auth status on login page load:', error);
      }
    })();
  }
 
  const form = document.getElementById('auth-form');
  const formTitle = document.getElementById('form-title');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('submit-btn');
  const switchLink = document.getElementById('switch-form-link');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const messageEl = document.getElementById('form-message');
 
  let formState = 'login'; // can be 'login', 'signup', or 'forgot'

  function updateFormUI() { // Dynamically updates what the form looks like depending on formState.
    messageEl.textContent = '';
    if (formState === 'login') {
      formTitle.textContent = 'My Account';
      submitBtn.textContent = 'Login';
      nameInput.style.display = 'none';
      passwordInput.style.display = 'block';
      switchLink.textContent = 'Need an account? Sign Up';
      forgotPasswordLink.style.display = 'inline';
    } else if (formState === 'signup') {
      formTitle.textContent = 'Sign Up';
      submitBtn.textContent = 'Sign Up';
      nameInput.style.display = 'block';
      passwordInput.style.display = 'block';
      switchLink.textContent = 'Have an account? Login';
      forgotPasswordLink.style.display = 'none';
    } else if (formState === 'forgot') {
      formTitle.textContent = 'Reset Password';
      submitBtn.textContent = 'Send Reset Link';
      nameInput.style.display = 'none';
      passwordInput.style.display = 'none';
      switchLink.textContent = 'Back to Login';
      forgotPasswordLink.style.display = 'none';
    }
  }
 
  switchLink.addEventListener('click', e => {
    e.preventDefault();
    if (formState === 'login' || formState === 'forgot') {
      formState = 'signup';
    } else {
      formState = 'login';
    }
    updateFormUI();
  });
 
  forgotPasswordLink.addEventListener('click', e => {
    e.preventDefault();
    formState = 'forgot';
    updateFormUI();
  });

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let endpoint = '';
    let payload = {};
    messageEl.textContent = ''; // Clear previous messages

    // --- Client-side validation ---    
    if (formState === 'signup') {
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
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      messageEl.style.color = 'red';
      messageEl.textContent = 'Please enter a valid email address.';
      return;
    }

    if (formState === 'login') {
      endpoint = '/api/login';
      payload = { email, password };
    } else if (formState === 'signup') {
      endpoint = '/api/register';
      payload = { name, email, password };
    } else if (formState === 'forgot') {
      endpoint = '/api/forgot-password';
      payload = { email };
    }

    const url = `${API_BASE_URL}${endpoint}`;

    try {
      submitBtn.disabled = true; // Disable button to prevent double submission
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        messageEl.style.color = 'green';
        if (formState === 'login') {
          messageEl.textContent = 'Login successful! Redirecting...';
          // Redirect with a flag that can be used on the homepageto trigger a welcome message after fetching user data.
          setTimeout(() => { window.location.href = `index.html?login_success=true`; }, 1500);
        } else if (formState === 'signup') {
          messageEl.textContent = 'Registration successful! Please login.';
          formState = 'login';
          form.reset(); // Clear the form fields
          updateFormUI();
        } else if (formState === 'forgot') {
          messageEl.textContent = 'If an account with that email exists, a reset link has been sent.';
        }
      } else {
        messageEl.style.color = 'red';
        messageEl.textContent = data.error || 'An error occurred.';
        submitBtn.disabled = false; // Re-enable on failure
      }
    } catch (error) {
      messageEl.style.color = 'red';
      messageEl.textContent = 'Could not connect to the server.';
      submitBtn.disabled = false; // Re-enable on failure
    }
  });

  // Initial UI setup
  updateFormUI();
});
