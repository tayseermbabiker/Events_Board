// Optional Login System (Email Collection)

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 */
async function handleLoginSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('login-name');
  const emailInput = document.getElementById('login-email');
  const messageDiv = document.getElementById('login-message');

  if (!nameInput || !emailInput || !messageDiv) {
    console.error('Login form elements not found');
    return;
  }

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();

  // Basic validation
  if (!name || !email) {
    showLoginMessage('Please fill in all fields', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showLoginMessage('Please enter a valid email address', 'error');
    return;
  }

  try {
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    // Send to Netlify Function
    const response = await fetch('/.netlify/functions/quick-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: name.split(' ')[0], // First word as first name
        last_name: name.split(' ').slice(1).join(' ') || '', // Rest as last name
        email: email,
        source: 'web_optional_login',
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Save user to localStorage
      saveUser({
        id: data.user.id,
        first_name: data.user.first_name,
        email: data.user.email
      });

      // Update UI
      updateUIForLoggedInUser(data.user);

      // Show success message
      showLoginMessage('Welcome! You\'re all set 🎉', 'success');

      // Close modal after 1.5 seconds
      setTimeout(() => {
        closeLoginModal();
      }, 1500);

    } else {
      throw new Error(data.error || 'Login failed');
    }

  } catch (error) {
    console.error('Login error:', error);
    showLoginMessage('Something went wrong. Please try again.', 'error');

    // Reset button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Continue';
    submitBtn.disabled = false;
  }
}

/**
 * Show login message (success or error)
 * @param {string} message - Message text
 * @param {string} type - 'success' or 'error'
 */
function showLoginMessage(message, type) {
  const messageDiv = document.getElementById('login-message');
  if (!messageDiv) return;

  messageDiv.className = `message ${type}`;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if user is logged in and update UI on page load
 */
function initializeLoginState() {
  const user = getLoggedInUser();

  if (user) {
    updateUIForLoggedInUser(user);
  } else {
    // Show default login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.textContent = 'Login';
      loginBtn.onclick = openLoginModal;
    }
  }
}

/**
 * Logout user (clear localStorage)
 */
function handleLogout() {
  removeUser();

  // Reset login button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.textContent = 'Login';
    loginBtn.onclick = openLoginModal;
  }

  // Optional: Show confirmation
  alert('You have been logged out');
}

/**
 * Show user menu (future enhancement)
 * Currently just shows a simple logout option
 */
function showUserMenu() {
  const user = getLoggedInUser();
  if (!user) return;

  // Simple confirmation for logout
  const confirmLogout = confirm(`Hi ${user.first_name}!\n\nWould you like to logout?`);
  if (confirmLogout) {
    handleLogout();
  }
}

/**
 * Override updateUIForLoggedInUser to add user menu
 * @param {object} user - User object
 */
function updateUIForLoggedInUser(user) {
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn && user) {
    loginBtn.textContent = `Hi, ${user.first_name || 'User'}`;
    loginBtn.onclick = showUserMenu;
  }
}

// Export functions globally
window.handleLoginSubmit = handleLoginSubmit;
window.initializeLoginState = initializeLoginState;
window.handleLogout = handleLogout;
window.showUserMenu = showUserMenu;
