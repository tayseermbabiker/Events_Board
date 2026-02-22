const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');
const { classifyIndustry } = require('../utils/industry-map');

const LISTING_URL = 'https://www.dmgevents.com/events/?country=United+Arab+Emirates&year=2026';
const MAX_RETRIES = 3;

const UAE_CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];

// Sub-zones that should be deduplicated into the parent event
const DEDUP_PREFIXES = [
  'ADIPEC',
  'Big 5',
  'The Big 5',
];

class DmgScraper extends BaseScraper {
  constructor() {
    super('DMG');
  }

  async scrape() {
    let pageLoaded = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(this.name, `Attempt ${attempt}/${MAX_RETRIES}: Fetching ${LISTING_URL}`);
        await this.page.goto(LISTING_URL, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(8000);

        // Check if WAF blocked us
        const bodyText = await this.page.evaluate(() => document.body.innerText.substring(0, 500));
        if (bodyText.includes('Request unsuccessful') || bodyText.includes('Incapsula')) {
          logger.warn(this.name, `WAF challenge detected on attempt ${attempt}`);
          if (attempt < MAX_RETRIES) {
            await this.page.waitForTimeout(5000 * attempt);
            continue;
          }
          throw new Error('WAF blocked all retry attempts');
        }

        pageLoaded = true;
        break;
      } catch (err) {
        if (attempt === MAX_RETRIES) throw err;
        logger.warn(this.name, `Attempt ${attempt} failed: ${err.message}`);
        await this.page.waitForTimeout(5000 * attempt);
      }
    }

    if (!pageLoaded) return [];

    // DMG events link to EXTERNAL domains (e.g. middleeastcoatingsshow.com)
    // Link text format: "EVENT NAME | DD - DD Month YYYY , Country"
    const rawEvents = await this.page.evaluate(() => {
      const results = [];
      const links = document.querySelectorAll('a[href]');

      for (const link of links) {
        const text = link.textContent.trim();
        if (!text || text.length < 10) continue;

        // Match: "EVENT NAME | date range , Country"
        const pipeMatch = text.match(/^(.+?)\s*\|\s*(.+?)\s*,\s*(.+?)$/);
        if (pipeMatch) {
          results.push({
            title: pipeMatch[1].trim(),
            dateText: pipeMatch[2].trim(),
            country: pipeMatch[3].trim(),
            href: link.href,
          });
        }
      }

      return results;
    });

    logger.info(this.name, `Found ${rawEvents.length} raw events from link text`);

    // Filter to UAE only
    const uaeEvents = rawEvents.filter(ev => {
      if (/united arab emirates/i.test(ev.country)) return true;
      logger.info(this.name, `Skipping non-UAE: ${ev.title} (${ev.country})`);
      return false;
    });

    logger.info(this.name, `${uaeEvents.length} UAE events`);

    // Deduplicate sub-zone events
    const seen = new Map();
    for (const ev of uaeEvents) {
      let normalizedTitle = ev.title;
      for (const prefix of DEDUP_PREFIXES) {
        if (ev.title.toUpperCase().startsWith(prefix.toUpperCase())) {
          normalizedTitle = prefix;
          break;
        }
      }
      if (!seen.has(normalizedTitle) || ev.title.length < seen.get(normalizedTitle).title.length) {
        seen.set(normalizedTitle, ev);
      }
    }

    const deduplicated = Array.from(seen.values());
    logger.info(this.name, `${deduplicated.length} events after deduplication`);

    const events = [];

    for (const ev of deduplicated) {
      // Parse date range: "14 - 16 April 2026" or "30 March - 1 April 2026"
      let startDate = ev.dateText;
      let endDate = null;

      // "DD - DD Month YYYY"
      const simpleRange = ev.dateText.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(\w+)\s+(\d{4})$/);
      if (simpleRange) {
        startDate = `${simpleRange[1]} ${simpleRange[3]} ${simpleRange[4]}`;
        endDate = `${simpleRange[2]} ${simpleRange[3]} ${simpleRange[4]}`;
      }

      // "DD Month - DD Month YYYY"
      const crossRange = ev.dateText.match(/^(\d{1,2})\s+(\w+)\s*[-–]\s*(\d{1,2})\s+(\w+)\s+(\d{4})$/);
      if (crossRange) {
        startDate = `${crossRange[1]} ${crossRange[2]} ${crossRange[5]}`;
        endDate = `${crossRange[3]} ${crossRange[4]} ${crossRange[5]}`;
      }

      // Try to get detail from external event site
      let description = '';
      let image = null;
      let venueName = null;

      try {
        await this.page.waitForTimeout(1500);
        logger.info(this.name, `Fetching detail: ${ev.href}`);
        await this.page.goto(ev.href, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(5000);

        const detail = await this.page.evaluate(() => {
          // JSON-LD
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of scripts) {
            try {
              const data = JSON.parse(script.textContent);
              if (data['@type'] === 'Event') return { jsonLd: data };
              if (Array.isArray(data)) {
                const ev = data.find(d => d['@type'] === 'Event');
                if (ev) return { jsonLd: ev };
              }
            } catch {}
          }

          // Fallback meta
          const desc = document.querySelector('meta[name="description"]');
          const ogImage = document.querySelector('meta[property="og:image"]');
          return {
            jsonLd: null,
            description: desc?.content || '',
            image: ogImage?.content || null,
          };
        });

        if (detail.jsonLd) {
          const jl = detail.jsonLd;
          description = jl.description || '';
          image = jl.image?.url || jl.image || null;
          if (jl.location?.name) venueName = jl.location.name;
        } else {
          description = detail.description || '';
          image = detail.image;
        }
      } catch (err) {
        logger.warn(this.name, `Failed to fetch detail for ${ev.title}: ${err.message}`);
      }

      // Determine city
      let city = null;
      const locationText = [venueName, description, ev.title].join(' ').toLowerCase();
      for (const c of UAE_CITIES) {
        if (locationText.includes(c.toLowerCase())) {
          city = c;
          break;
        }
      }
      if (!city) city = 'Dubai';

      const slug = ev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      events.push({
        title: ev.title,
        description: (description || '').substring(0, 5000),
        start_date: startDate,
        end_date: endDate,
        venue_name: venueName,
        venue_address: null,
        city,
        organizer: 'DMG Events',
        industry: classifyIndustry(ev.title + ' ' + description),
        is_free: false,
        registration_url: ev.href,
        image_url: image,
        source: 'DMG',
        source_event_id: `dmg-${slug}`,
      });

      logger.info(this.name, `Added: ${ev.title} (${city})`);
    }

    return events;
  }
}

module.exports = DmgScraper;
