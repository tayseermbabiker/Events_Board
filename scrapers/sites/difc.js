const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');
const { classifyIndustry } = require('../utils/industry-map');

// DIFC moved from difc.ae to difc.com (301 redirect, Feb 2026)
const PAGE_URL = 'https://www.difc.com/whats-on/events';

// Skip non-professional lifestyle events
const SKIP_PATTERNS = [
  /pop.?up/i, /sculpture/i, /roofline/i, /art\s+exhibition/i,
  /brunch/i, /dine/i, /dining/i, /dessert/i, /chocolate/i,
  /fashion\s+show/i, /yoga/i, /fitness/i, /run\s+club/i,
];

class DifcScraper extends BaseScraper {
  constructor() {
    super('DIFC');
  }

  async scrape() {
    logger.info(this.name, `Fetching: ${PAGE_URL}`);
    await this.page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(8000);

    // Click "Load More" to get all events
    let loadMoreClicks = 0;
    while (loadMoreClicks < 5) {
      const loadMore = await this.page.$('button:has-text("Load More"), button:has-text("Show More"), [class*="load-more"]');
      if (!loadMore) break;
      try {
        await loadMore.click();
        await this.page.waitForTimeout(3000);
        loadMoreClicks++;
        logger.info(this.name, `Clicked Load More (${loadMoreClicks})`);
      } catch { break; }
    }

    // Extract events from card-wrapper elements
    const events = await this.page.evaluate(() => {
      const cards = document.querySelectorAll('.card-wrapper');
      const results = [];
      const seen = new Set();

      for (const card of cards) {
        const link = card.querySelector('a[href*="/whats-on/events/"], a[href*="/events/"]');
        if (!link) continue;

        const href = link.href;
        if (href.endsWith('/events') || href.endsWith('/events/') || href.includes('host-an-event')) continue;

        const slug = href.split('/').filter(Boolean).pop();
        if (seen.has(slug)) continue;
        seen.add(slug);

        const title = link.textContent.trim();
        if (!title || title.length < 3) continue;

        const cardText = card.textContent;

        // Parse dates: "Date : 03 Feb 2026" or "Available till 31 March 2026" or "Open to public until 31 May 2026"
        let dateText = null;
        const exactDate = cardText.match(/Date\s*:\s*(\d{1,2}\s+\w+\s+\d{4})/i);
        const tillDate = cardText.match(/(?:Available till|Open to public until)\s+(\d{1,2}\s+\w+\s+\d{4})/i);

        if (exactDate) {
          dateText = exactDate[1];
        } else if (tillDate) {
          // For ongoing events, use today as start date
          const now = new Date();
          dateText = `${now.getDate()} ${now.toLocaleString('en', {month: 'short'})} ${now.getFullYear()}`;
        }

        const img = card.querySelector('img');

        results.push({
          title,
          href,
          slug,
          dateText,
          img: img?.src || null,
        });
      }

      return results;
    });

    logger.info(this.name, `Got ${events.length} events from card wrappers`);

    // Filter out non-professional lifestyle events
    const professional = events.filter(ev => {
      if (SKIP_PATTERNS.some(p => p.test(ev.title))) {
        logger.info(this.name, `Skipping non-professional: ${ev.title}`);
        return false;
      }
      return true;
    });

    logger.info(this.name, `${professional.length} professional events (${events.length - professional.length} skipped)`);

    return professional.map(ev => ({
      title: ev.title,
      description: '',
      start_date: ev.dateText,
      end_date: null,
      venue_name: 'Dubai International Financial Centre',
      venue_address: 'DIFC, Sheikh Zayed Road, Dubai',
      city: 'Dubai',
      organizer: 'DIFC',
      industry: classifyIndustry(ev.title, 'Finance'),
      is_free: false,
      registration_url: ev.href,
      image_url: ev.img,
      source: 'DIFC',
      source_event_id: `difc-${ev.slug}`,
    }));
  }
}

module.exports = DifcScraper;
