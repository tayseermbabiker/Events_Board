const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');
const { classifyIndustry } = require('../utils/industry-map');

/**
 * US Chamber of Commerce scraper — high-profile business events.
 * Extracts from the events listing page.
 */
class USChamberScraper extends BaseScraper {
  constructor() {
    super('USChamber');
  }

  async scrape() {
    const url = 'https://www.uschamber.com/events';
    logger.info(this.name, `Fetching: ${url}`);

    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);

    // Extract event data from the upcoming events section
    const events = await this.page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Find links to events.uschamber.com (actual event registration pages)
      const links = document.querySelectorAll('a[href*="events.uschamber.com"]');

      links.forEach(a => {
        const href = a.href;
        if (seen.has(href)) return;
        seen.add(href);

        // Get the parent card/container for context
        const container = a.closest('div, article, li') || a;
        const text = container.textContent || '';

        // Extract date pattern like "Wednesday, March 11" or "March 11, 2026"
        const dateMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?,?\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s*\d{4})?/);

        // Extract time
        const timeMatch = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM)\s*(?:E[SD]T|C[SD]T|M[SD]T|P[SD]T)/i);

        // Extract title (usually the first meaningful text)
        const titleEl = container.querySelector('h2, h3, h4') || a;
        const title = titleEl.textContent.trim().replace(/\s+/g, ' ').substring(0, 200);

        // Extract category
        const category = text.match(/^(Technology|Infrastructure|Small Business|Health|Energy|International|Workforce)\b/)?.[1] || '';

        // Location
        const locationMatch = text.match(/U\.S\.\s*Chamber[^,]*,[^,]*,\s*\w+\s+\d{5}/);

        if (title.length > 5) {
          results.push({
            title: title.replace(category, '').trim(),
            href,
            date: dateMatch?.[0] || null,
            time: timeMatch?.[0] || null,
            category,
            location: locationMatch?.[0] || 'U.S. Chamber of Commerce, Washington, DC',
          });
        }
      });

      return results;
    });

    logger.info(this.name, `Found ${events.length} events`);

    return events.map(ev => {
      // Try to build a proper date
      let startDate = null;
      if (ev.date) {
        // Add year if missing
        const dateStr = ev.date.includes('2026') || ev.date.includes('2027')
          ? ev.date
          : `${ev.date}, 2026`;
        const d = new Date(dateStr);
        startDate = isNaN(d) ? null : d.toISOString();
      }

      return {
        title: ev.title,
        description: ev.category ? `${ev.category} event hosted by the U.S. Chamber of Commerce.` : '',
        start_date: startDate,
        end_date: null,
        venue_name: 'U.S. Chamber of Commerce',
        venue_address: '1615 H St NW, Washington, DC 20062',
        city: 'Washington DC',
        organizer: 'U.S. Chamber of Commerce',
        industry: classifyIndustry(`${ev.title} ${ev.category}`),
        is_free: false,
        registration_url: ev.href,
        image_url: null,
        source: 'USChamber',
        source_event_id: `usc-${ev.href.split('/').pop() || ev.title.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}`,
      };
    });
  }
}

module.exports = USChamberScraper;
