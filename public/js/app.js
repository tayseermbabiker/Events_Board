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
  updateAuthUI(user);
}

function setupNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const first_name = (document.getElementById('newsletter-name').value || '').trim();
    const email = document.getElementById('newsletter-email').value.trim();
    const job_title = (document.getElementById('newsletter-job-title').value || '').trim();
    const company = (document.getElementById('newsletter-company').value || '').trim();
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
        body: JSON.stringify({ email, first_name, job_title, company, cities, industries }),
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
