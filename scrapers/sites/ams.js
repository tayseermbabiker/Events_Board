const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');

/**
 * American Medical Seminars scraper — CME conferences calendar.
 * Uses FullCalendar event links from the seminar-calendar page.
 * All events classified as Healthcare.
 */
class AMSScraper extends BaseScraper {
  constructor() {
    super('AMS');
  }

  async scrape() {
    const url = 'https://www.americanmedicalseminars.com/seminar-calendar/';
    logger.info(this.name, `Fetching: ${url}`);

    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);

    // Extract events from the calendar grid
    const events = await this.page.$$eval('a.fc-event[href*="/events/"]', links => {
      const seen = new Set();
      return links.map(a => {
        const title = a.querySelector('.fc-event-title')?.textContent?.trim();
        const href = a.href;
        const startTime = a.querySelector('.event-start-time')?.textContent?.trim();
        const endTime = a.querySelector('.event-end-time')?.textContent?.trim();
        const isExpired = a.classList.contains('expired');

        if (!title || !href || seen.has(href) || isExpired) return null;
        seen.add(href);

        return { title, href, startTime, endTime };
      }).filter(Boolean);
    });

    logger.info(this.name, `Found ${events.length} calendar events`);

    // Visit each event page for more details
    const detailed = [];
    for (const ev of events) {
      try {
        await this.page.goto(ev.href, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(2000);

        const details = await this.page.evaluate(() => {
          const text = document.body.textContent || '';
          const h1 = document.querySelector('h1')?.textContent?.trim();

          // Look for date patterns
          const dateMatch = text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:\s*[-–,]\s*\d{1,2})?,?\s*\d{4}/);

          // Location
          const locationMatch = text.match(/(?:Location|Venue|Where)[:\s]+([^\n]{5,100})/i);

          // CME credits
          const cmeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:CME|CE|Credit|AMA)/i);

          // Price
          const priceMatch = text.match(/\$[\d,]+(?:\.\d{2})?/);

          return {
            h1,
            date: dateMatch?.[0] || null,
            location: locationMatch?.[1]?.trim() || null,
            cmeCredits: cmeMatch?.[1] || null,
            price: priceMatch?.[0] || null,
          };
        });

        detailed.push({
          title: details.h1 || ev.title,
          description: details.cmeCredits ? `CME/CE Conference. ${details.cmeCredits} credits available.` : 'CME/CE Conference.',
          start_date: details.date,
          end_date: null,
          venue_name: null,
          venue_address: details.location || null,
          city: null,
          organizer: 'American Medical Seminars',
          industry: 'Healthcare',
          is_free: false,
          registration_url: ev.href,
          image_url: null,
          source: 'AMS',
          source_event_id: `ams-${ev.href.split('datetime=')[1] || ev.href.split('/').pop()}`,
        });
      } catch (err) {
        logger.warn(this.name, `Failed to get details for ${ev.title}: ${err.message}`);
      }
    }

    return detailed;
  }
}

module.exports = AMSScraper;
