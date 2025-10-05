// Main App Initialization & Event Loading

/**
 * Initialize application on page load
 */
async function initApp() {
  console.log('🚀 Initializing UAE Events App...');

  // Initialize login state
  initializeLoginState();

  // Initialize filters
  initializeFilters();

  // Load events from API
  await loadEvents();

  console.log('✅ App initialized successfully');
}

/**
 * Load events from Netlify Function
 */
async function loadEvents() {
  try {
    showLoading();

    // Build API URL with optional filters
    const queryString = getFilterQueryString();
    const apiUrl = `/.netlify/functions/get-events${queryString ? '?' + queryString : ''}`;

    // Fetch events
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.events) {
      // Set events in filter system (for client-side filtering)
      setAllEvents(data.events);

      // Hide loading
      hideLoading();

      console.log(`✅ Loaded ${data.events.length} events`);

    } else {
      throw new Error('Invalid API response');
    }

  } catch (error) {
    console.error('Failed to load events:', error);
    hideLoading();
    showError('Failed to load events. Please try again.');
  }
}

/**
 * Reload events (for manual refresh)
 */
async function reloadEvents() {
  console.log('🔄 Reloading events...');
  await loadEvents();
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export functions globally
window.initApp = initApp;
window.loadEvents = loadEvents;
window.reloadEvents = reloadEvents;
