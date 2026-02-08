const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');

/**
 * Clio Events scraper — legal industry conferences and webinars.
 * Extracts from the MEC (Modern Events Calendar) on clio.com/events/.
 * All events classified as Legal.
 */
class ClioScraper extends BaseScraper {
  constructor() {
    super('Clio');
  }

  async scrape() {
    const url = 'https://www.clio.com/events/';
    logger.info(this.name, `Fetching: ${url}`);

    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);

    // Extract event links from the calendar and page
    const eventLinks = await this.page.$$eval('a[href*="/events/"]', links => {
      const seen = new Set();
      return links
        .filter(a => {
          const href = a.href;
          // Only actual event pages (not navigation, not anchors)
          return href.includes('/events/') &&
            !href.endsWith('/events/') &&
            !href.endsWith('/events/#') &&
            !href.includes('?') &&
            !seen.has(href) &&
            (seen.add(href), true);
        })
        .map(a => ({
          href: a.href,
          text: a.textContent.trim().substring(0, 100),
        }));
    });

    logger.info(this.name, `Found ${eventLinks.length} unique event links`);

    // Visit each event page for details
    const events = [];
    for (const link of eventLinks) {
      if (link.text === 'Register Now' || link.text === 'Watch Now' || link.text.length < 3) continue;

      try {
        await this.page.goto(link.href, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(2000);

        const data = await this.page.evaluate(() => {
          const h1 = document.querySelector('h1')?.textContent?.trim();
          const text = document.body.textContent || '';

          // Date patterns
          const dateMatch = text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:\s*[-–,]\s*\d{1,2})?,?\s*\d{4}/);

          // Location
          const locationMatch = text.match(/(?:Location|Venue|Where)[:\s]+([^\n]{5,100})/i);

          // Check if it's on-demand (past)
          const isOnDemand = /on[- ]demand|watch now|recorded/i.test(text);

          // Check if free
          const isFree = /free|no cost|complimentary/i.test(text);

          // Image
          const ogImage = document.querySelector('meta[property="og:image"]')?.content;

          // Description
          const desc = document.querySelector('meta[name="description"]')?.content ||
            document.querySelector('meta[property="og:description"]')?.content || '';

          return { h1, date: dateMatch?.[0], location: locationMatch?.[1]?.trim(), isOnDemand, isFree, ogImage, desc };
        });

        // Skip on-demand/past webinars
        if (data.isOnDemand) {
          logger.info(this.name, `Skipping on-demand: ${data.h1}`);
          continue;
        }

        if (!data.h1) continue;

        events.push({
          title: data.h1,
          description: data.desc || '',
          start_date: data.date || null,
          end_date: null,
          venue_name: null,
          venue_address: data.location || null,
          city: null,
          organizer: 'Clio',
          industry: 'Legal',
          is_free: Boolean(data.isFree),
          registration_url: link.href,
          image_url: data.ogImage || null,
          source: 'Clio',
          source_event_id: `clio-${link.href.split('/events/')[1]?.replace(/\/$/, '') || link.href.split('/').pop()}`,
        });

        logger.info(this.name, `Found: ${data.h1}`);
      } catch (err) {
        logger.warn(this.name, `Failed: ${link.href} — ${err.message}`);
      }
    }

    return events;
  }
}

module.exports = ClioScraper;
