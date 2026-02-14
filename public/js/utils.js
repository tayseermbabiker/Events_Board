// Utility helper functions

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "Tue, Oct 15")
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format time for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time (e.g., "9:00 AM")
 */
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format full date and time
 * @param {string} dateString - ISO date string
 * @returns {string} Full formatted date and time
 */
function formatFullDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum character length
 * @returns {string} Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Get random placeholder gradient for cards without images
 * @returns {string} CSS gradient string
 */
function getRandomGradient() {
  const gradients = [
    'linear-gradient(135deg, #142952 0%, #00875A 100%)',
    'linear-gradient(135deg, #1E2A38 0%, #FFD700 100%)',
    'linear-gradient(135deg, #00875A 0%, #142952 100%)',
    'linear-gradient(135deg, #2C5364 0%, #203A43 100%)',
    'linear-gradient(135deg, #134E5E 0%, #71B280 100%)'
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
}

/**
 * Debounce function for performance
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Show loading spinner
 */
function showLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'block';
}

/**
 * Hide loading spinner
 */
function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

/**
 * Show empty state
 */
function showEmptyState() {
  const emptyState = document.getElementById('empty-state');
  if (emptyState) emptyState.style.display = 'block';
}

/**
 * Hide empty state
 */
function hideEmptyState() {
  const emptyState = document.getElementById('empty-state');
  if (emptyState) emptyState.style.display = 'none';
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  const eventsGrid = document.getElementById('events-grid');
  if (eventsGrid) {
    eventsGrid.innerHTML = `
      <div class="error-message" style="text-align: center; padding: 2rem; color: var(--error);">
        <p>${message}</p>
        <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">
          Try Again
        </button>
      </div>
    `;
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get logged in user from localStorage
 * @returns {object|null} User object or null
 */
function getLoggedInUser() {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
}

/**
 * Save user to localStorage
 * @param {object} user - User object
 */
function saveUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Remove user from localStorage
 */
function removeUser() {
  localStorage.removeItem('user');
}

/**
 * Update UI for logged in user
 * @param {object} user - User object
 */
function updateUIForLoggedInUser(user) {
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn && user) {
    loginBtn.textContent = `Hi, ${user.first_name || 'User'}`;
    loginBtn.onclick = () => {
      // Could open user menu in future
      console.log('User menu clicked');
    };
  }
}

/**
 * Generate next 12 months for filter dropdown
 * @returns {Array} Array of {value, label} objects
 */
function getNext6Months() {
  const months = [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthName = monthNames[date.getMonth()];

    months.push({
      value: `${year}-${month}`,
      label: `${monthName} ${year}`
    });
  }

  return months;
}

// Industry-specific gradient for placeholder images
function getIndustryGradient(industry) {
  const gradients = {
    'Tech & AI': 'linear-gradient(135deg, #0B1426 0%, #0EA5E9 100%)',
    'Finance': 'linear-gradient(135deg, #1C2333 0%, #10B981 100%)',
    'Legal': 'linear-gradient(135deg, #2D3748 0%, #8B5CF6 100%)',
    'Healthcare': 'linear-gradient(135deg, #0B1426 0%, #EF4444 100%)',
    'Real Estate & Construction': 'linear-gradient(135deg, #1C2333 0%, #F59E0B 100%)',
    'Hospitality & F&B': 'linear-gradient(135deg, #2D3748 0%, #EC4899 100%)',
    'Energy & Government': 'linear-gradient(135deg, #0B1426 0%, #6366F1 100%)',
    'Startups': 'linear-gradient(135deg, #1C2333 0%, #14B8A6 100%)',
    'General': 'linear-gradient(135deg, #142952 0%, #00875A 100%)',
  };
  return gradients[industry] || gradients['General'];
}

// Export functions globally
window.formatDate = formatDate;
window.formatTime = formatTime;
window.formatFullDateTime = formatFullDateTime;
window.truncateText = truncateText;
window.getRandomGradient = getRandomGradient;
window.debounce = debounce;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showEmptyState = showEmptyState;
window.hideEmptyState = hideEmptyState;
window.showError = showError;
window.escapeHtml = escapeHtml;
window.getLoggedInUser = getLoggedInUser;
window.saveUser = saveUser;
window.removeUser = removeUser;
window.updateUIForLoggedInUser = updateUIForLoggedInUser;
window.getNext6Months = getNext6Months;
window.getIndustryGradient = getIndustryGradient;
