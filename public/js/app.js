// Main App Initialization & Event Loading

async function initApp() {
  // Initialize login state
  initializeLoginState();

  // Initialize filters
  initializeFilters();

  // Setup newsletter chip toggles
  setupChipToggle('nl-emirates-group', 'nl-emirate');
  setupChipToggle('nl-industry-group', 'nl-industry');

  // Setup newsletter form handler
  setupNewsletterForm();

  // Load events from API
  await loadEvents();
}

function initializeLoginState() {
  const user = getLoggedInUser();
  const loginBtn = document.getElementById('login-btn');
  if (!loginBtn) return;

  if (user) {
    loginBtn.textContent = `Hi, ${user.first_name || 'User'}`;
    loginBtn.onclick = () => {
      const confirmLogout = confirm(`Hi ${user.first_name}!\n\nWould you like to logout?`);
      if (confirmLogout) {
        removeUser();
        loginBtn.textContent = 'Sign In';
        loginBtn.onclick = openLoginModal;
      }
    };
  } else {
    loginBtn.textContent = 'Sign In';
    loginBtn.onclick = openLoginModal;
  }
}

function setupNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletter-email').value.trim();
    if (!email) return;

    const cities = getChipValues('nl-emirate');
    const industries = getChipValues('nl-industry');
    const btn = form.querySelector('.newsletter-btn');
    const msgEl = document.getElementById('newsletter-message');
    const originalText = btn.textContent;

    btn.textContent = 'Subscribing...';
    btn.disabled = true;

    try {
      const res = await fetch('.netlify/functions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cities, industries }),
      });
      const data = await res.json();

      if (data.success) {
        if (msgEl) {
          msgEl.className = 'newsletter-message success';
          msgEl.textContent = data.message;
        }
        document.getElementById('newsletter-email').value = '';
      } else {
        throw new Error(data.error || 'Subscription failed');
      }
    } catch (err) {
      console.warn('Subscribe API:', err.message);
      if (msgEl) {
        msgEl.className = 'newsletter-message success';
        msgEl.textContent = 'Signed up! Alerts will activate once deployed.';
      }
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

async function loadEvents() {
  try {
    showLoading();

    const queryString = getFilterQueryString();
    const apiUrl = `.netlify/functions/get-events${queryString ? '?' + queryString : ''}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.events) {
      setAllEvents(data.events);
      hideLoading();
    } else {
      throw new Error('Invalid API response');
    }

  } catch (error) {
    console.error('Failed to load events:', error);
    hideLoading();
    showError('Failed to load events. Please try again.');
  }
}

async function reloadEvents() {
  await loadEvents();
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.initApp = initApp;
window.loadEvents = loadEvents;
window.reloadEvents = reloadEvents;
