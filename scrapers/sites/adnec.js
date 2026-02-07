const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');
const { classifyIndustry } = require('../utils/industry-map');

const EVENTS_URL = 'https://adnec.ae/en/eventlisting';

class AdnecScraper extends BaseScraper {
  constructor() {
    super('ADNEC');
  }

  async scrape() {
    logger.info(this.name, `Fetching: ${EVENTS_URL}`);
    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    });

    await this.page.goto(EVENTS_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);

    // Check for 403
    const bodyText = await this.page.evaluate(() => document.body.innerText.substring(0, 200));
    if (bodyText.includes('403') || bodyText.includes('Forbidden')) {
      logger.warn(this.name, 'Site returned 403 Forbidden');
      return [];
    }

    // Extract events from the page structure
    // ADNEC renders events as card-like blocks with date, title, venue
    const events = await this.page.evaluate(() => {
      const results = [];
      // Find all links to event detail pages
      const eventLinks = document.querySelectorAll('a[href*="/en/event/"], a[href*="/event/"]');

      for (const link of eventLinks) {
        const container = link.closest('div') || link.parentElement;
        if (!container) continue;

        const title = link.textContent.trim();
        if (!title || title.length < 3) continue;

        // Look for date info in sibling/parent elements
        const parentBlock = container.parentElement || container;
        const allText = parentBlock.innerText;

        // Date pattern: "03\n-\n07  Feb" or "07\n-\n14  Feb"
        const dateMatch = allText.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        const singleDateMatch = !dateMatch ? allText.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) : null;

        const year = new Date().getFullYear();
        let startDate = null;
        let endDate = null;

        if (dateMatch) {
          startDate = `${dateMatch[1]} ${dateMatch[3]} ${year}`;
          endDate = `${dateMatch[2]} ${dateMatch[3]} ${year}`;
        } else if (singleDateMatch) {
          startDate = `${singleDateMatch[1]} ${singleDateMatch[2]} ${year}`;
        }

        // Look for venue info
        const venueEl = parentBlock.querySelector('[class*="venue"], [class*="location"]');
        const venueText = venueEl ? venueEl.textContent.trim() : null;

        const img = parentBlock.querySelector('img');
        const slug = link.href.split('/').filter(Boolean).pop();

        results.push({
          title,
          startDate,
          endDate,
          venue: venueText,
          href: link.href,
          img: img?.src || null,
          slug,
        });
      }

      return results;
    });

    // If no links found, try heading-based extraction
    if (events.length === 0) {
      const headingEvents = await this.extractFromHeadings();
      if (headingEvents.length > 0) return headingEvents;
    }

    // Deduplicate by title
    const seen = new Set();
    const deduped = [];
    for (const ev of events) {
      if (!seen.has(ev.title)) {
        seen.add(ev.title);
        deduped.push(ev);
      }
    }

    logger.info(this.name, `Got ${deduped.length} events`);

    return deduped.map(ev => ({
      title: ev.title,
      description: '',
      start_date: ev.startDate,
      end_date: ev.endDate || null,
      venue_name: ev.venue || 'ADNEC',
      venue_address: null,
      city: 'Abu Dhabi',
      organizer: 'ADNEC',
      industry: classifyIndustry(ev.title),
      is_free: false,
      registration_url: ev.href,
      image_url: ev.img,
      source: 'ADNEC',
      source_event_id: `adnec-${ev.slug || ev.title.toLowerCase().replace(/\s+/g, '-')}`,
    }));
  }

  async extractFromHeadings() {
    // Fallback: find h2/h3 headings that look like event names
    const headings = await this.page.$$eval('h2, h3', els =>
      els.map(el => {
        const link = el.closest('a') || el.querySelector('a') || el.parentElement?.closest('a');
        const parent = el.closest('[class*="event"], [class*="card"]') || el.parentElement;
        const dateEl = parent?.querySelector('[class*="date"], time');
        return {
          title: el.textContent.trim(),
          href: link?.href || null,
          dateText: dateEl?.textContent?.trim() || null,
        };
      }).filter(h => h.title.length > 5 && !['Upcoming Events', 'Latest Press Releases', 'Footer', 'Latest Events'].includes(h.title))
    );

    return headings.map(h => ({
      title: h.title,
      description: '',
      start_date: h.dateText,
      end_date: null,
      venue_name: 'ADNEC',
      venue_address: null,
      city: 'Abu Dhabi',
      organizer: 'ADNEC',
      industry: classifyIndustry(h.title),
      is_free: false,
      registration_url: h.href,
      image_url: null,
      source: 'ADNEC',
      source_event_id: `adnec-${h.href?.split('/').filter(Boolean).pop() || h.title.toLowerCase().replace(/\s+/g, '-')}`,
    }));
  }
}

module.exports = AdnecScraper;
