// Modal System (Single Reusable Modal - Inspired by HalaUAE)

/**
 * Open event detail modal with dynamic content
 * @param {object} event - Event data object
 */
function openEventModal(event) {
  const modal = document.getElementById('event-modal');
  const modalBody = document.getElementById('modal-body');

  if (!modal || !modalBody) {
    console.error('Modal elements not found');
    return;
  }

  // Build modal content dynamically
  const content = buildEventModalContent(event);
  modalBody.innerHTML = content;

  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scroll

  // Add escape key listener
  document.addEventListener('keydown', handleEscapeKey);
}

/**
 * Close event modal
 */
function closeEventModal() {
  const modal = document.getElementById('event-modal');

  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scroll

    // Remove escape key listener
    document.removeEventListener('keydown', handleEscapeKey);
  }
}

/**
 * Build event modal content HTML
 * @param {object} event - Event data object
 * @returns {string} HTML content
 */
function buildEventModalContent(event) {
  // Event image or gradient placeholder
  const imageHtml = event.image_url
    ? `<img src="${escapeHtml(event.image_url)}" alt="${escapeHtml(event.title)}" class="modal-image">`
    : `<div class="modal-image" style="background: ${getRandomGradient()};"></div>`;

  // Format dates
  const startDate = formatFullDateTime(event.start_date);
  const startTime = formatTime(event.start_date);
  const endTime = event.end_date ? formatTime(event.end_date) : '';

  // Build tags HTML
  const tagsHtml = event.tags && event.tags.length > 0
    ? `<div class="tags">${event.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`
    : '';

  // Build venue info
  const venueHtml = event.venue_name
    ? `
      <div class="meta-block">
        <strong>📍 Venue</strong>
        <p>${escapeHtml(event.venue_name)}</p>
        ${event.venue_address ? `<p style="font-size: 14px; color: var(--grey-dark);">${escapeHtml(event.venue_address)}</p>` : ''}
      </div>
    `
    : '';

  // Build organizer info
  const organizerHtml = event.organizer
    ? `
      <div class="meta-block">
        <strong>👤 Organized by</strong>
        <p>${escapeHtml(event.organizer)}</p>
      </div>
    `
    : '';

  // Build description
  const descriptionHtml = event.description
    ? `
      <div class="description">
        <strong>About this event</strong>
        <p>${escapeHtml(event.description)}</p>
      </div>
    `
    : '';

  // Build capacity info
  const capacityHtml = event.capacity
    ? `
      <div class="meta-block">
        <strong>👥 Capacity</strong>
        <p>${event.capacity} attendees</p>
      </div>
    `
    : '';

  return `
    ${imageHtml}

    <h2 style="margin-bottom: var(--space-md); color: var(--navy-dark);">
      ${escapeHtml(event.title)}
    </h2>

    <p class="modal-subtitle">
      ${event.is_free ? '<strong style="color: var(--success);">FREE EVENT</strong>' : '<strong style="color: var(--gold);">PAID EVENT</strong>'}
    </p>

    <div class="modal-event-meta">
      <div class="meta-block">
        <strong>📅 Date & Time</strong>
        <p>${startDate}</p>
        <p>${startTime}${endTime ? ' - ' + endTime : ''}</p>
      </div>

      ${venueHtml}

      <div class="meta-block">
        <strong>🏙️ City</strong>
        <p>${escapeHtml(event.city || 'Dubai')}</p>
      </div>

      ${organizerHtml}

      ${capacityHtml}

      <div class="meta-block">
        <strong>🏢 Industry</strong>
        <p>${escapeHtml(event.industry || 'General')}</p>
        ${tagsHtml}
      </div>
    </div>

    ${descriptionHtml}

    <button
      class="btn-primary btn-full"
      onclick="handleBooking('${event.id}', '${escapeHtml(event.registration_url)}')"
      style="margin-top: var(--space-lg);"
    >
      ${event.is_free ? 'Register for Free' : 'Book Now'}
    </button>

    <div class="share-buttons" style="margin-top: var(--space-lg); text-align: center;">
      <p style="font-size: 14px; color: var(--grey-dark); margin-bottom: var(--space-sm);">Share this event</p>
      <div style="display: flex; gap: var(--space-sm); justify-content: center; flex-wrap: wrap;">
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(event.registration_url)}"
           target="_blank" rel="noopener"
           style="padding: 8px 16px; background: #0077B5; color: white; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
          LinkedIn
        </a>
        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title + ' - ' + (event.city || 'UAE'))}&url=${encodeURIComponent(event.registration_url)}"
           target="_blank" rel="noopener"
           style="padding: 8px 16px; background: #1DA1F2; color: white; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
          Twitter
        </a>
        <a href="https://wa.me/?text=${encodeURIComponent(event.title + ' - Check out this event: ' + event.registration_url)}"
           target="_blank" rel="noopener"
           style="padding: 8px 16px; background: #25D366; color: white; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
          WhatsApp
        </a>
      </div>
    </div>

    <p class="privacy-note" style="margin-top: var(--space-md);">
      You'll be redirected to the event organizer's registration page
    </p>
  `;
}

/**
 * Open login modal
 */
function openLoginModal() {
  const modal = document.getElementById('login-modal');
  const modalBody = document.getElementById('login-modal-body');

  if (!modal || !modalBody) {
    console.error('Login modal elements not found');
    return;
  }

  // Build login form
  const content = buildLoginModalContent();
  modalBody.innerHTML = content;

  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Add escape key listener
  document.addEventListener('keydown', handleEscapeKey);
}

/**
 * Close login modal
 */
function closeLoginModal() {
  const modal = document.getElementById('login-modal');

  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';

    // Remove escape key listener
    document.removeEventListener('keydown', handleEscapeKey);
  }
}

/**
 * Build login modal content HTML
 * @returns {string} HTML content
 */
function buildLoginModalContent() {
  return `
    <h2 style="margin-bottom: var(--space-sm); color: var(--navy-dark);">
      Join UAE Events
    </h2>

    <p class="modal-subtitle">
      Get personalized event recommendations and never miss an update
    </p>

    <form id="login-form" onsubmit="handleLoginSubmit(event)">
      <input
        type="text"
        id="login-name"
        class="input-field"
        placeholder="Your Name"
        required
        autocomplete="name"
      />

      <input
        type="email"
        id="login-email"
        class="input-field"
        placeholder="Your Email"
        required
        autocomplete="email"
      />

      <button type="submit" class="btn-primary btn-full">
        Continue
      </button>

      <div id="login-message"></div>
    </form>

    <p class="privacy-note">
      We respect your privacy. Your email will only be used for event updates.
      No spam, unsubscribe anytime.
    </p>
  `;
}

/**
 * Handle escape key to close modals
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    closeEventModal();
    closeLoginModal();
  }
}

// Export functions globally
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
