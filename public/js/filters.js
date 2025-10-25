// Filters Logic (Month, Industry, City)

let allEvents = []; // Store all events for client-side filtering
let activeFilters = {
  month: '',
  industry: '',
  cost: '',
  city: ''
};

/**
 * Initialize filter dropdowns
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

    // Add event listener
    monthFilter.addEventListener('change', (e) => {
      activeFilters.month = e.target.value;
      applyFilters();
    });
  }

  // Industry filter
  const industryFilter = document.getElementById('filter-industry');
  if (industryFilter) {
    industryFilter.addEventListener('change', (e) => {
      activeFilters.industry = e.target.value;
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

  // City filter
  const cityFilter = document.getElementById('filter-city');
  if (cityFilter) {
    cityFilter.addEventListener('change', (e) => {
      activeFilters.city = e.target.value;
      applyFilters();
    });
  }

  // Clear filters button
  const clearBtn = document.getElementById('clear-filters-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearFilters);
  }
}

/**
 * Apply active filters to event list
 */
function applyFilters() {
  let filteredEvents = [...allEvents];

  // Filter by month (YYYY-MM format)
  if (activeFilters.month) {
    filteredEvents = filteredEvents.filter(event => {
      const eventMonth = event.start_date.substring(0, 7); // Extract YYYY-MM
      return eventMonth === activeFilters.month;
    });
  }

  // Filter by industry
  if (activeFilters.industry) {
    filteredEvents = filteredEvents.filter(event =>
      event.industry === activeFilters.industry
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

  // Filter by city
  if (activeFilters.city) {
    filteredEvents = filteredEvents.filter(event =>
      event.city === activeFilters.city
    );
  }

  // Render filtered events
  renderEventCards(filteredEvents);

  // Update filter button visibility
  updateClearButtonVisibility();
}

/**
 * Clear all active filters
 */
function clearFilters() {
  activeFilters = {
    month: '',
    industry: '',
    cost: '',
    city: ''
  };

  // Reset all filter dropdowns
  const monthFilter = document.getElementById('filter-month');
  const industryFilter = document.getElementById('filter-industry');
  const costFilter = document.getElementById('filter-cost');
  const cityFilter = document.getElementById('filter-city');

  if (monthFilter) monthFilter.value = '';
  if (industryFilter) industryFilter.value = '';
  if (costFilter) costFilter.value = '';
  if (cityFilter) cityFilter.value = '';

  // Show all events
  renderEventCards(allEvents);

  // Hide clear button
  updateClearButtonVisibility();
}

/**
 * Update clear button visibility based on active filters
 */
function updateClearButtonVisibility() {
  const clearBtn = document.getElementById('clear-filters-btn');
  if (!clearBtn) return;

  const hasActiveFilters = activeFilters.month || activeFilters.industry || activeFilters.cost || activeFilters.city;
  clearBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
}

/**
 * Set all events (called when events are loaded from API)
 * @param {Array} events - Array of event objects
 */
function setAllEvents(events) {
  allEvents = events || [];

  // Populate industry filter options dynamically
  populateIndustryFilter();

  // Populate city filter options dynamically
  populateCityFilter();

  // Render all events initially
  renderEventCards(allEvents);
}

/**
 * Populate industry filter with unique industries from events
 */
function populateIndustryFilter() {
  const industryFilter = document.getElementById('filter-industry');
  if (!industryFilter) return;

  // Get unique industries
  const industries = [...new Set(allEvents.map(e => e.industry).filter(Boolean))];
  industries.sort();

  // Clear existing options (keep "All Industries")
  industryFilter.innerHTML = '<option value="">All Industries</option>';

  // Add industry options
  industries.forEach(industry => {
    const option = document.createElement('option');
    option.value = industry;
    option.textContent = industry;
    industryFilter.appendChild(option);
  });
}

/**
 * Populate city filter with unique cities from events
 */
function populateCityFilter() {
  const cityFilter = document.getElementById('filter-city');
  if (!cityFilter) return;

  // Get unique cities
  const cities = [...new Set(allEvents.map(e => e.city).filter(Boolean))];
  cities.sort();

  // Clear existing options (keep "All Emirates")
  cityFilter.innerHTML = '<option value="">All Emirates</option>';

  // Add city options
  cities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    cityFilter.appendChild(option);
  });
}

/**
 * Get filter query string for API request (future use)
 * @returns {string} Query string
 */
function getFilterQueryString() {
  const params = new URLSearchParams();

  if (activeFilters.month) params.append('month', activeFilters.month);
  if (activeFilters.industry) params.append('industry', activeFilters.industry);
  if (activeFilters.cost) params.append('cost', activeFilters.cost);
  if (activeFilters.city) params.append('city', activeFilters.city);

  return params.toString();
}

// Export functions globally
window.initializeFilters = initializeFilters;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.setAllEvents = setAllEvents;
window.getFilterQueryString = getFilterQueryString;
