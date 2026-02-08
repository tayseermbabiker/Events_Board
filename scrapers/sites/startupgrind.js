const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');

/**
 * Startup Grind scraper — startup/founder events.
 * The events page loads dynamically (Bevy/Algolia). We extract from
 * rendered DOM after waiting for JS to load.
 * All events classified as Startup.
 */

// US city chapters to search for
const US_CHAPTERS = [
  'austin', 'san-francisco', 'new-york', 'nyc', 'miami', 'chicago',
  'los-angeles', 'seattle', 'denver', 'boston', 'washington-dc',
];

class StartupGrindScraper extends BaseScraper {
  constructor() {
    super('StartupGrind');
  }

  async scrape() {
    const url = 'https://www.startupgrind.com/events/';
    logger.info(this.name, `Fetching: ${url}`);

    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(8000); // Extra wait for JS-rendered content

    // Extract event cards from the rendered page
    const events = await this.page.$$eval('.event, [class*="EventCard"], [class*="event-card"], a[href*="/events/details/"]', els => {
      const seen = new Set();
      return els.map(el => {
        const link = el.tagName === 'A' ? el : el.querySelector('a[href*="/events/details/"]');
        if (!link) return null;

        const href = link.href;
        if (seen.has(href)) return null;
        seen.add(href);

        const text = el.textContent || '';
        // Look for title in various selectors
        const title = el.querySelector('h3, h4, .event-title, [class*="Title"]')?.textContent?.trim()
          || link.textContent?.trim();

        // Try to find date text
        const dateEl = el.querySelector('time, [class*="date"], [class*="Date"]');
        const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || null;

        // Location
        const locationEl = el.querySelector('[class*="location"], [class*="Location"], [class*="chapter"]');
        const location = locationEl?.textContent?.trim() || '';

        return { title, href, dateText, location, fullText: text.substring(0, 300) };
      }).filter(Boolean);
    });

    logger.info(this.name, `Found ${events.length} events on page`);

    // Filter to US events only
    const usEvents = events.filter(ev => {
      const text = `${ev.location} ${ev.fullText}`.toLowerCase();
      return US_CHAPTERS.some(ch => text.includes(ch.replace(/-/g, ' '))) ||
        /\b(usa|united states|texas|california|new york|florida|illinois)\b/i.test(text);
    });

    logger.info(this.name, `${usEvents.length} US events after filtering`);

    return usEvents.map(ev => ({
      title: ev.title || 'Startup Grind Event',
      description: '',
      start_date: ev.dateText,
      end_date: null,
      venue_name: null,
      venue_address: ev.location || null,
      city: this.detectCity(ev.location || ev.fullText),
      organizer: 'Startup Grind',
      industry: 'Startup',
      is_free: /free/i.test(ev.fullText),
      registration_url: ev.href,
      image_url: null,
      source: 'StartupGrind',
      source_event_id: `sg-${ev.href.split('/details/')[1]?.replace(/\/$/, '').substring(0, 50) || Math.random().toString(36).substring(2, 10)}`,
    }));
  }

  detectCity(text) {
    const lower = (text || '').toLowerCase();
    if (lower.includes('austin')) return 'Austin';
    if (lower.includes('san francisco') || lower.includes('sf')) return 'San Francisco';
    if (lower.includes('new york') || lower.includes('nyc')) return 'New York';
    if (lower.includes('miami')) return 'Miami';
    if (lower.includes('chicago')) return 'Chicago';
    if (lower.includes('los angeles') || lower.includes('la')) return 'Los Angeles';
    if (lower.includes('seattle')) return 'Seattle';
    if (lower.includes('denver')) return 'Denver';
    if (lower.includes('boston')) return 'Boston';
    if (lower.includes('washington') || lower.includes(' dc')) return 'Washington DC';
    return null;
  }
}

module.exports = StartupGrindScraper;
