const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');

/**
 * Pri-Med scraper — CME conferences for primary care clinicians.
 * Scrapes individual conference city pages from the nav menu.
 * All events classified as Healthcare.
 */

const CONFERENCE_PAGES = [
  { name: 'Pri-Med West',       url: 'https://www.pri-med.com/cme-conferences/west',                           city: 'Los Angeles' },
  { name: 'Pri-Med South',      url: 'https://www.pri-med.com/cme-conferences/south',                          city: 'Miami' },
  { name: 'Pri-Med Southwest',  url: 'https://www.pri-med.com/cme-conferences/southwest',                      city: 'Houston' },
  { name: 'Pri-Med East',       url: 'https://www.pri-med.com/cme-conferences/east',                           city: 'Boston' },
  { name: 'Pri-Med Atlanta',    url: 'https://www.pri-med.com/cme-conferences/regional-conference-atlanta',     city: 'Atlanta' },
  { name: 'Pri-Med Charleston', url: 'https://www.pri-med.com/cme-conferences/regional-conference-charleston',  city: 'Charleston' },
  { name: 'Pri-Med Irving',     url: 'https://www.pri-med.com/cme-conferences/regional-conference-irving',      city: 'Dallas' },
  { name: 'Pri-Med Nashville',  url: 'https://www.pri-med.com/cme-conferences/regional-conference-nashville',   city: 'Nashville' },
  { name: 'Pri-Med Philadelphia', url: 'https://www.pri-med.com/cme-conferences/regional-conference-philadelphia', city: 'Philadelphia' },
  { name: 'Pri-Med Phoenix',    url: 'https://www.pri-med.com/cme-conferences/regional-conference-phoenix',     city: 'Phoenix' },
  { name: 'Pri-Med Rosemont',   url: 'https://www.pri-med.com/cme-conferences/regional-conference-rosemont',    city: 'Chicago' },
  { name: 'Pri-Med Tampa',      url: 'https://www.pri-med.com/cme-conferences/regional-conference-tampa',       city: 'Tampa' },
  { name: 'Pri-Med DC',         url: 'https://www.pri-med.com/cme-conferences/regional-conference-washington-dc', city: 'Washington DC' },
];

class PriMedScraper extends BaseScraper {
  constructor() {
    super('Pri-Med');
  }

  async scrape() {
    const events = [];

    for (const conf of CONFERENCE_PAGES) {
      logger.info(this.name, `Fetching: ${conf.url}`);

      try {
        await this.page.goto(conf.url, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(3000);

        const data = await this.page.evaluate(() => {
          const text = document.body.textContent || '';
          const h1 = document.querySelector('h1')?.textContent?.trim();

          // Extract date pattern like "April 9–11, 2026" or "June 5-7, 2026"
          const dateMatch = text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}[–\-−]\d{1,2},?\s*\d{4}/);

          // Extract location (venue)
          const venueMatch = text.match(/([\w\s]+(?:Convention Center|Hotel|Resort|Center))[\s,|]+([^,\n]{5,50})/);

          // Extract CME credits
          const cmeMatch = text.match(/(?:Up to |Earn\s+)?(\d+(?:\.\d+)?)\s*(?:CME|CE|Credit)/i);

          return {
            h1,
            dateRange: dateMatch?.[0] || null,
            venue: venueMatch?.[1]?.trim() || null,
            venueLocation: venueMatch?.[2]?.trim() || null,
            cmeCredits: cmeMatch?.[1] || null,
          };
        });

        if (!data.dateRange) {
          logger.warn(this.name, `No date found for ${conf.name}`);
          continue;
        }

        // Parse date range "April 9–11, 2026"
        const { startDate, endDate } = this.parseDateRange(data.dateRange);
        if (!startDate) continue;

        const title = data.h1 || conf.name;
        const cmeDesc = data.cmeCredits ? `Earn up to ${data.cmeCredits} CME/CE Credits.` : '';

        events.push({
          title,
          description: `Primary care CME/CE conference. ${cmeDesc}`.trim(),
          start_date: startDate,
          end_date: endDate,
          venue_name: data.venue || null,
          venue_address: data.venueLocation || null,
          city: conf.city,
          organizer: 'Pri-Med',
          industry: 'Healthcare',
          is_free: false,
          registration_url: conf.url,
          image_url: null,
          source: 'Pri-Med',
          source_event_id: `primed-${conf.url.split('/').pop()}`,
        });

        logger.info(this.name, `Found: ${title} — ${data.dateRange}`);
      } catch (err) {
        logger.warn(this.name, `${conf.name} failed: ${err.message}`);
      }
    }

    return events;
  }

  /**
   * Parse "April 9–11, 2026" into start and end dates.
   */
  parseDateRange(range) {
    if (!range) return { startDate: null, endDate: null };

    // "April 9–11, 2026" or "June 5-7, 2026"
    const match = range.match(/(\w+)\s+(\d{1,2})[–\-−](\d{1,2}),?\s*(\d{4})/);
    if (match) {
      const [, month, startDay, endDay, year] = match;
      const start = new Date(`${month} ${startDay}, ${year}`);
      const end = new Date(`${month} ${endDay}, ${year}`);
      return {
        startDate: isNaN(start) ? null : start.toISOString(),
        endDate: isNaN(end) ? null : end.toISOString(),
      };
    }

    // Single date fallback
    const d = new Date(range);
    return { startDate: isNaN(d) ? null : d.toISOString(), endDate: null };
  }
}

module.exports = PriMedScraper;
