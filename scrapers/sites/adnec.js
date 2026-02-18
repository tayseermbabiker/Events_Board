const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');
const { classifyIndustry } = require('../utils/industry-map');

// ADNEC redesigned in 2025 — now a Livewire app with Tailwind
// URL pattern changed from /en/event/ to /en/eventlisting/
const EVENTS_URL = 'https://www.adnec.ae/en/eventlisting';

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

    // ADNEC intermittently returns 403 — retry up to 3 times
    let response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      response = await this.page.goto(EVENTS_URL, { waitUntil: 'domcontentloaded' });
      if (response.status() === 200) break;
      logger.warn(this.name, `Attempt ${attempt}: got ${response.status()}, retrying...`);
      await this.page.waitForTimeout(3000);
    }

    if (!response || response.status() !== 200) {
      logger.warn(this.name, `Site returned ${response?.status()} after retries`);
      return [];
    }

    await this.page.waitForTimeout(5000);

    // Click "Show more" to load all events
    let showMoreClicks = 0;
    while (showMoreClicks < 10) {
      const showMore = await this.page.$('button:has-text("Show more")');
      if (!showMore || !await showMore.isVisible()) break;
      try {
        await showMore.click();
        await this.page.waitForTimeout(2000);
        showMoreClicks++;
        logger.info(this.name, `Clicked Show more (${showMoreClicks})`);
      } catch { break; }
    }

    // Extract events from individual card containers
    // Each card has an <a> with title attr and href to /en/eventlisting/slug
    const events = await this.page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Find all event links with title attr
      const links = document.querySelectorAll('a[href*="/en/eventlisting/"][title]');

      for (const link of links) {
        const href = link.href;
        const slug = href.split('/').filter(Boolean).pop();

        // Skip the listing page itself
        if (slug === 'eventlisting' || seen.has(slug)) continue;
        seen.add(slug);

        const title = link.getAttribute('title');
        if (!title || title.length < 3) continue;

        // Get image from within the link
        const img = link.querySelector('img');
        const imgSrc = img ? img.src : null;

        // Find the parent card container for date/venue info
        const card = link.closest('article')
          || link.closest('[wire\\:key]')
          || link.closest('.group')
          || link.parentElement;

        let dateText = '';
        let venue = '';
        let description = '';

        if (card) {
          const cardText = card.innerText;

          // Date format in ADNEC: "18  Feb\n-\n18  Mar" or "28\n-\n29  Mar"
          // Extract month abbreviations and numbers
          const months = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';

          // Cross-month range: "18  Feb\n-\n18  Mar"
          const crossMonth = cardText.match(new RegExp(
            `(\\d{1,2})\\s+(${months})\\s*[-–]\\s*(\\d{1,2})\\s+(${months})`, 'i'
          ));
          // Same-month range: "28\n-\n29  Mar"
          const sameMonth = !crossMonth ? cardText.match(new RegExp(
            `(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+(${months})`, 'i'
          )) : null;
          // Single date: "18  Feb"
          const single = (!crossMonth && !sameMonth) ? cardText.match(new RegExp(
            `(\\d{1,2})\\s+(${months})`, 'i'
          )) : null;

          const year = new Date().getFullYear();

          if (crossMonth) {
            dateText = `${crossMonth[1]} ${crossMonth[2]} ${year}`;
          } else if (sameMonth) {
            dateText = `${sameMonth[1]} ${sameMonth[3]} ${year}`;
          } else if (single) {
            dateText = `${single[1]} ${single[2]} ${year}`;
          }

          // Look for venue/hall info
          const venueMatch = cardText.match(/(?:Hall[s]?\s+[\w\s&-]+|Marina Hall|Conference Hall[s]?\s+[\w\s&]+)/i);
          if (venueMatch) venue = venueMatch[0].trim();

          // Get description if available (usually after the title)
          const descEl = card.querySelector('p, [class*="description"], [class*="excerpt"]');
          if (descEl) description = descEl.textContent.trim();
        }

        results.push({
          title,
          href,
          slug,
          dateText,
          venue,
          description: description.substring(0, 1000),
          img: imgSrc,
        });
      }

      return results;
    });

    logger.info(this.name, `Got ${events.length} events`);

    return events.map(ev => ({
      title: ev.title,
      description: ev.description,
      start_date: ev.dateText || null,
      end_date: null,
      venue_name: ev.venue || 'ADNEC',
      venue_address: null,
      city: 'Abu Dhabi',
      organizer: 'ADNEC',
      industry: classifyIndustry(`${ev.title} ${ev.description}`),
      is_free: false,
      registration_url: ev.href,
      image_url: ev.img,
      source: 'ADNEC',
      source_event_id: `adnec-${ev.slug}`,
    }));
  }
}

module.exports = AdnecScraper;
