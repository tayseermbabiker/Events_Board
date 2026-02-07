const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');

const EVENTS_URL = 'https://www.adgm.com/events';

class AdgmScraper extends BaseScraper {
  constructor() {
    super('ADGM');
  }

  async scrape() {
    // Intercept XHR/fetch responses for event data
    let apiEvents = [];
    this.page.on('response', async response => {
      const url = response.url();
      if (url.includes('Event') || url.includes('event')) {
        try {
          const json = await response.json();
          const arr = json.events || json.data || json.items || json.Results;
          if (Array.isArray(arr) && arr.length > 0) {
            apiEvents = arr;
          } else {
            // Try to find array in response
            for (const val of Object.values(json)) {
              if (Array.isArray(val) && val.length > 0 && val[0].Title) {
                apiEvents = val;
                break;
              }
            }
          }
        } catch { /* not JSON */ }
      }
    });

    logger.info(this.name, `Fetching: ${EVENTS_URL}`);
    await this.page.goto(EVENTS_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(8000);

    // Check if API interception got data
    if (apiEvents.length > 0) {
      logger.info(this.name, `Got ${apiEvents.length} events from API interception`);
      return apiEvents.map(ev => this.mapApiEvent(ev)).filter(Boolean);
    }

    // Extract events from page links and content
    const events = await this.page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Look for event links
      const links = document.querySelectorAll('a[href*="/events/"], a[href*="event"]');
      for (const link of links) {
        const href = link.href;
        if (href.endsWith('/events') || href.endsWith('/events/')) continue;

        const slug = href.split('/').filter(Boolean).pop();
        if (seen.has(slug) || slug === 'events') continue;
        seen.add(slug);

        const title = link.textContent.trim();
        if (!title || title.length < 3) continue;

        // Look for date in nearby content
        const container = link.closest('div, article, li') || link.parentElement;
        const parent = container?.parentElement || container;
        const allText = parent?.innerText || '';
        const dateMatch = allText.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i);

        const img = (container || link).querySelector('img');

        results.push({
          title,
          href,
          slug,
          dateText: dateMatch ? dateMatch[1] : null,
          img: img?.src || null,
        });
      }

      return results;
    });

    logger.info(this.name, `Got ${events.length} events from page links`);

    return events.map(ev => ({
      title: ev.title,
      description: '',
      start_date: ev.dateText,
      end_date: null,
      venue_name: 'ADGM',
      venue_address: null,
      city: 'Abu Dhabi',
      organizer: 'ADGM',
      industry: 'Finance',
      is_free: false,
      registration_url: ev.href,
      image_url: ev.img,
      source: 'ADGM',
      source_event_id: `adgm-${ev.slug}`,
    }));
  }

  mapApiEvent(ev) {
    const title = ev.Title || ev.title || ev.Name || ev.name;
    if (!title) return null;

    const id = ev.Id || ev.id || ev.Slug || title.toLowerCase().replace(/\s+/g, '-');

    return {
      title,
      description: ev.Description || ev.description || ev.Summary || '',
      start_date: ev.StartDate || ev.startDate || ev.EventDate || ev.Date,
      end_date: ev.EndDate || ev.endDate || null,
      venue_name: ev.Venue || ev.venue || 'ADGM',
      venue_address: ev.Address || null,
      city: 'Abu Dhabi',
      organizer: ev.Organizer || 'ADGM',
      industry: 'Finance',
      is_free: ev.IsFree === true || ev.Price === 0,
      registration_url: ev.RegistrationUrl || ev.Url || ev.Link || (ev.Slug ? `https://www.adgm.com/events/${ev.Slug}` : null),
      image_url: ev.ImageUrl || ev.Image || null,
      source: 'ADGM',
      source_event_id: `adgm-${id}`,
    };
  }
}

module.exports = AdgmScraper;
