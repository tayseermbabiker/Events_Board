// Filters Logic (Month, Industry, City) - Multi-select support

let allEvents = [];
let activeFilters = {
  month: '',
  industries: [],
  cost: '',
  cities: []
};

/**
 * Initialize filters
 */
function initializeFilters() {
  // Month filter (single select)
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

  // Cost filter (single select)
  const costFilter = document.getElementById('filter-cost');
  if (costFilter) {
    costFilter.addEventListener('change', (e) => {
      activeFilters.cost = e.target.value;
      applyFilters();
    });
  }

  // Industry multi-select
  setupMultiSelect('industry', 'industries', 'All Industries');

  // City multi-select
  setupMultiSelect('city', 'cities', 'All Emirates');

  // Clear filters
  const clearBtn = document.getElementById('clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearFilters);
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.multi-select')) {
      document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.remove('open'));
    }
  });
}

/**
 * Setup multi-select dropdown
 */
function setupMultiSelect(name, filterKey, defaultLabel) {
  const btn = document.getElementById(`${name}-btn`);
  const dropdown = document.getElementById(`${name}-dropdown`);

  if (!btn || !dropdown) return;

  // Toggle dropdown
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close other dropdowns
    document.querySelectorAll('.multi-select-dropdown').forEach(d => {
      if (d !== dropdown) d.classList.remove('open');
    });
    dropdown.classList.toggle('open');
  });

  // Handle checkbox changes
  dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = dropdown.querySelectorAll('input:checked');
      const values = Array.from(checked).map(c => c.value);
      activeFilters[filterKey] = values;

      // Update button text
      if (values.length === 0) {
        btn.textContent = defaultLabel + ' ▾';
      } else if (values.length === 1) {
        btn.textContent = values[0] + ' ▾';
      } else {
        btn.textContent = values.length + ' selected ▾';
      }

      applyFilters();
    });
  });
}

/**
 * Apply filters
 */
function applyFilters() {
  let filtered = [...allEvents];

  // Month
  if (activeFilters.month) {
    filtered = filtered.filter(e => e.start_date.substring(0, 7) === activeFilters.month);
  }

  // Industries (multi)
  if (activeFilters.industries.length > 0) {
    filtered = filtered.filter(e => activeFilters.industries.includes(e.industry));
  }

  // Cost
  if (activeFilters.cost) {
    filtered = filtered.filter(e => {
      if (activeFilters.cost === 'free') return e.is_free === true;
      if (activeFilters.cost === 'paid') return e.is_free === false;
      return true;
    });
  }

  // Cities (multi)
  if (activeFilters.cities.length > 0) {
    filtered = filtered.filter(e => activeFilters.cities.includes(e.city));
  }

  renderEventCards(filtered);
  updateClearButtonVisibility();
}

/**
 * Clear all filters
 */
function clearFilters() {
  activeFilters = { month: '', industries: [], cost: '', cities: [] };

  // Reset dropdowns
  const monthFilter = document.getElementById('filter-month');
  const costFilter = document.getElementById('filter-cost');
  if (monthFilter) monthFilter.value = '';
  if (costFilter) costFilter.value = '';

  // Reset checkboxes
  document.querySelectorAll('.multi-select-dropdown input').forEach(cb => cb.checked = false);

  // Reset button labels
  const industryBtn = document.getElementById('industry-btn');
  const cityBtn = document.getElementById('city-btn');
  if (industryBtn) industryBtn.textContent = 'All Industries ▾';
  if (cityBtn) cityBtn.textContent = 'All Emirates ▾';

  renderEventCards(allEvents);
  updateClearButtonVisibility();
}

/**
 * Update clear button visibility
 */
function updateClearButtonVisibility() {
  const clearBtn = document.getElementById('clear-filters');
  if (!clearBtn) return;

  const hasFilters = activeFilters.month || activeFilters.industries.length > 0 || activeFilters.cost || activeFilters.cities.length > 0;
  clearBtn.style.display = hasFilters ? 'inline-block' : 'none';
}

/**
 * Set all events
 */
function setAllEvents(events) {
  allEvents = events || [];
  renderEventCards(allEvents);
}

/**
 * Get filter query string
 */
function getFilterQueryString() {
  const params = new URLSearchParams();
  if (activeFilters.month) params.append('month', activeFilters.month);
  if (activeFilters.industries.length > 0) params.append('industries', activeFilters.industries.join(','));
  if (activeFilters.cost) params.append('cost', activeFilters.cost);
  if (activeFilters.cities.length > 0) params.append('cities', activeFilters.cities.join(','));
  return params.toString();
}

// Export
window.initializeFilters = initializeFilters;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.setAllEvents = setAllEvents;
window.getFilterQueryString = getFilterQueryString;
