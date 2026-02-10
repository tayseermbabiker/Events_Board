// Event Card Rendering & Booking Logic

/**
 * Create event card DOM element
 * @param {object} event - Event data from Airtable
 * @returns {HTMLElement} Event card element
 */
function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';
  card.setAttribute('data-event-id', event.id);
  card.onclick = () => openEventModal(event);

  // Image wrapper with gradient overlay
  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'event-card-image-wrapper';

  // Event image or random gradient placeholder
  if (event.image_url) {
    const img = document.createElement('img');
    img.className = 'event-card-image';
    img.src = event.image_url;
    img.alt = event.title;
    img.loading = 'lazy';
    imageWrapper.appendChild(img);
  } else {
    imageWrapper.style.background = getRandomGradient();
  }

  // Category badge (top-left)
  if (event.industry) {
    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'category-badge';
    categoryBadge.textContent = event.industry;
    imageWrapper.appendChild(categoryBadge);
  }

  // Cost badge (top-right)
  const costBadge = document.createElement('span');
  costBadge.className = 'cost-badge';
  costBadge.textContent = event.is_free ? 'FREE' : 'PAID';
  imageWrapper.appendChild(costBadge);

  card.appendChild(imageWrapper);

  // Card content
  const content = document.createElement('div');
  content.className = 'event-card-content';

  // Event title
  const title = document.createElement('h3');
  title.className = 'event-title';
  title.textContent = truncateText(event.title, 80);
  content.appendChild(title);

  // Event meta information
  const meta = document.createElement('div');
  meta.className = 'event-meta';

  // Date
  const dateItem = document.createElement('div');
  dateItem.className = 'event-meta-item';
  dateItem.innerHTML = `
    <span class="icon">📅</span>
    <span>${formatDate(event.start_date)} • ${formatTime(event.start_date)}</span>
  `;
  meta.appendChild(dateItem);

  // Venue (if available)
  if (event.venue_name) {
    const venueItem = document.createElement('div');
    venueItem.className = 'event-meta-item';
    venueItem.innerHTML = `
      <span class="icon">📍</span>
      <span>${escapeHtml(truncateText(event.venue_name, 40))}</span>
    `;
    meta.appendChild(venueItem);
  }

  content.appendChild(meta);

  // Organizer
  if (event.organizer) {
    const organizer = document.createElement('p');
    organizer.className = 'event-organizer';
    organizer.textContent = `By ${escapeHtml(event.organizer)}`;
    content.appendChild(organizer);
  }

  // Book Now button
  const bookBtn = document.createElement('button');
  bookBtn.className = 'btn-primary btn-full';
  bookBtn.textContent = event.is_free ? 'Register Free' : 'Book Now';
  bookBtn.onclick = (e) => {
    e.stopPropagation();
    handleBooking(event.id, event.registration_url);
  };
  content.appendChild(bookBtn);

  card.appendChild(content);

  return card;
}

/**
 * Render event cards to the grid
 * @param {Array} events - Array of event objects
 */
function renderEventCards(events) {
  const eventsGrid = document.getElementById('events-grid');

  if (!eventsGrid) {
    console.error('Events grid element not found');
    return;
  }

  // Clear existing cards
  eventsGrid.innerHTML = '';

  if (!events || events.length === 0) {
    showEmptyState();
    return;
  }

  hideEmptyState();

  // Create and append all event cards
  events.forEach(event => {
    const card = createEventCard(event);
    eventsGrid.appendChild(card);
  });
}

/**
 * Handle booking click (track affiliate + open registration)
 * @param {string} eventId - Event ID from Airtable
 * @param {string} registrationUrl - Event registration URL
 */
async function handleBooking(eventId, registrationUrl) {
  try {
    // Get logged in user (if any)
    const user = getLoggedInUser();

    // Track booking click via Netlify Function
    const trackingData = {
      event_id: eventId,
      user_id: user ? user.id : null,
      user_email: user ? user.email : null,
      timestamp: new Date().toISOString()
    };

    // Send tracking request (don't await - fire and forget)
    fetch('.netlify/functions/track-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackingData)
    }).catch(err => console.error('Tracking failed:', err));

    // Open registration URL in new tab
    if (registrationUrl) {
      window.open(registrationUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.error('No registration URL provided');
    }

  } catch (error) {
    console.error('Booking error:', error);
    // Still open the link even if tracking fails
    if (registrationUrl) {
      window.open(registrationUrl, '_blank', 'noopener,noreferrer');
    }
  }
}

// Export functions globally
window.createEventCard = createEventCard;
window.renderEventCards = renderEventCards;
window.handleBooking = handleBooking;
