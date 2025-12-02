// Filters Logic (Month, Industry, City) - Multi-select support

let allEvents = []; // Store all events for client-side filtering
let activeFilters = {
  month: '',
  industries: [], // Changed to array for multi-select
  cost: '',
  cities: [] // Changed to array for multi-select
};

/**
 * Initialize filter dropdowns and multi-select panels
 */
function initializeFilters() {
  // Populate month filter with next 6 months
  const monthFilter = document.getElementById('filter-month');
  if (monthFilter) {
    const months = getNext6Months();
    months.forEach(month => {
      const option = document.createElement('option');
      option.value = month.value;
      option.textContent = month.label;
      monthFilter.appendChild(option);
    });

    monthFilter.addEventListener('change', (e) => {
      activeFilters.month = e.target.value;
      applyFilters();
    });
  }

  // Cost filter
  const costFilter = document.getElementById('filter-cost');
  if (costFilter) {
    costFilter.addEventListener('change', (e) => {
      activeFilters.cost = e.target.value;
      applyFilters();
    });
  }

  // Industry multi-select
  initMultiSelect('industry', 'industries');

  // City multi-select
  initMultiSelect('city', 'cities');

  // Clear filters button
  const clearBtn = document.getElementById('clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearFilters);
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.filter-dropdown')) {
      closeAllDropdowns();
    }
  });
}

/**
 * Initialize a multi-select filter
 */
function initMultiSelect(name, filterKey) {
  const toggle = document.getElementById(`${name}-toggle`);
  const panel = document.getElementById(`${name}-panel`);

  if (!toggle || !panel) return;

  // Toggle panel on button click
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = panel.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen) {
      panel.classList.add('open');
      toggle.classList.add('active');
    }
  });

  // Handle checkbox changes
  const checkboxes = panel.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      updateMultiSelectFilter(name, filterKey);
      applyFilters();
    });
  });
}

/**
 * Update filter array from checkboxes
 */
function updateMultiSelectFilter(name, filterKey) {
  const panel = document.getElementById(`${name}-panel`);
  const toggle = document.getElementById(`${name}-toggle`);
  const countEl = document.getElementById(`${name}-count`);

  const checked = panel.querySelectorAll('input[type="checkbox"]:checked');
  const values = Array.from(checked).map(cb => cb.value);

  activeFilters[filterKey] = values;

  // Update button text and count
  if (values.length === 0) {
    toggle.innerHTML = name === 'industry' ? 'All Industries <span class="filter-count"></span>' : 'All Emirates <span class="filter-count"></span>';
  } else if (values.length === 1) {
    toggle.innerHTML = `${values[0]} <span class="filter-count"></span>`;
  } else {
    const label = name === 'industry' ? 'Industries' : 'Emirates';
    toggle.innerHTML = `${values.length} ${label} <span class="filter-count">(${values.length})</span>`;
  }
}

/**
 * Close all dropdown panels
 */
function closeAllDropdowns() {
  document.querySelectorAll('.filter-panel').forEach(panel => {
    panel.classList.remove('open');
  });
  document.querySelectorAll('.filter-toggle').forEach(toggle => {
    toggle.classList.remove('active');
  });
}

/**
 * Apply active filters to event list
 */
function applyFilters() {
  let filteredEvents = [...allEvents];

  // Filter by month (YYYY-MM format)
  if (activeFilters.month) {
    filteredEvents = filteredEvents.filter(event => {
      const eventMonth = event.start_date.substring(0, 7);
      return eventMonth === activeFilters.month;
    });
  }

  // Filter by industries (multi-select)
  if (activeFilters.industries.length > 0) {
    filteredEvents = filteredEvents.filter(event =>
      activeFilters.industries.includes(event.industry)
    );
  }

  // Filter by cost
  if (activeFilters.cost) {
    filteredEvents = filteredEvents.filter(event => {
      if (activeFilters.cost === 'free') {
        return event.is_free === true;
      } else if (activeFilters.cost === 'paid') {
        return event.is_free === false;
      }
      return true;
    });
  }

  // Filter by cities (multi-select)
  if (activeFilters.cities.length > 0) {
    filteredEvents = filteredEvents.filter(event =>
      activeFilters.cities.includes(event.city)
    );
  }

  // Render filtered events
  renderEventCards(filteredEvents);

  // Update clear button visibility
  updateClearButtonVisibility();
}

/**
 * Clear all active filters
 */
function clearFilters() {
  activeFilters = {
    month: '',
    industries: [],
    cost: '',
    cities: []
  };

  // Reset dropdowns
  const monthFilter = document.getElementById('filter-month');
  const costFilter = document.getElementById('filter-cost');
  if (monthFilter) monthFilter.value = '';
  if (costFilter) costFilter.value = '';

  // Reset checkboxes
  document.querySelectorAll('.filter-panel input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  // Reset toggle buttons
  const industryToggle = document.getElementById('industry-toggle');
  const cityToggle = document.getElementById('city-toggle');
  if (industryToggle) industryToggle.innerHTML = 'All Industries <span class="filter-count"></span>';
  if (cityToggle) cityToggle.innerHTML = 'All Emirates <span class="filter-count"></span>';

  // Show all events
  renderEventCards(allEvents);

  // Hide clear button
  updateClearButtonVisibility();
}

/**
 * Update clear button visibility based on active filters
 */
function updateClearButtonVisibility() {
  const clearBtn = document.getElementById('clear-filters');
  if (!clearBtn) return;

  const hasActiveFilters = activeFilters.month ||
    activeFilters.industries.length > 0 ||
    activeFilters.cost ||
    activeFilters.cities.length > 0;

  clearBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
}

/**
 * Set all events (called when events are loaded from API)
 */
function setAllEvents(events) {
  allEvents = events || [];
  renderEventCards(allEvents);
}

/**
 * Get filter query string for API request
 */
function getFilterQueryString() {
  const params = new URLSearchParams();

  if (activeFilters.month) params.append('month', activeFilters.month);
  if (activeFilters.industries.length > 0) params.append('industries', activeFilters.industries.join(','));
  if (activeFilters.cost) params.append('cost', activeFilters.cost);
  if (activeFilters.cities.length > 0) params.append('cities', activeFilters.cities.join(','));

  return params.toString();
}

// Export functions globally
window.initializeFilters = initializeFilters;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.setAllEvents = setAllEvents;
window.getFilterQueryString = getFilterQueryString;
