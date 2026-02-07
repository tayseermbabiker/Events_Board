const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');
const { classifyIndustry } = require('../utils/industry-map');

const EVENTS_URL = 'https://www.dwtc.com/en/events';

class DwtcScraper extends BaseScraper {
  constructor() {
    super('DWTC');
  }

  async scrape() {
    logger.info(this.name, `Fetching: ${EVENTS_URL}`);
    await this.page.goto(EVENTS_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3000);

    // Dismiss cookie consent if present
    try {
      const acceptBtn = await this.page.$('.cc-btn.cc-allow');
      if (acceptBtn) {
        await acceptBtn.click();
        await this.page.waitForTimeout(2000);
        logger.info(this.name, 'Accepted cookie consent');
      }
    } catch { /* no cookie banner */ }

    await this.page.waitForTimeout(3000);

    // Extract events from event links (styled-components SSR)
    const events = await this.page.$$eval('a[href*="/en/events/"][href$="/"]', links => {
      return links
        .filter(a => {
          // Skip language toggle and generic links
          const href = a.href;
          return href.includes('/en/events/') && href !== 'https://www.dwtc.com/en/events/' && !href.includes('/ar/');
        })
        .map(a => {
          const text = a.textContent.trim();
          // Patterns: "4 - 5 Feb 2026...", "19 Feb - 20 Mar 2026...", "4 Feb 2026..."
          const crossMonthMatch = text.match(/^(\d{1,2})\s+(\w+)\s*[-–]\s*(\d{1,2})\s+(\w+)\s+(\d{4})/);
          const sameMonthMatch = !crossMonthMatch ? text.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(\w+)\s+(\d{4})/) : null;
          const singleDateMatch = (!crossMonthMatch && !sameMonthMatch) ? text.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})/) : null;

          let startDate = null;
          let endDate = null;
          let title = text;

          if (crossMonthMatch) {
            // "19 Feb - 20 Mar 2026"
            startDate = `${crossMonthMatch[1]} ${crossMonthMatch[2]} ${crossMonthMatch[5]}`;
            endDate = `${crossMonthMatch[3]} ${crossMonthMatch[4]} ${crossMonthMatch[5]}`;
            title = text.replace(/^\d{1,2}\s+\w+\s*[-–]\s*\d{1,2}\s+\w+\s+\d{4}/, '').trim();
          } else if (sameMonthMatch) {
            // "4 - 5 Feb 2026"
            startDate = `${sameMonthMatch[1]} ${sameMonthMatch[3]} ${sameMonthMatch[4]}`;
            endDate = `${sameMonthMatch[2]} ${sameMonthMatch[3]} ${sameMonthMatch[4]}`;
            title = text.replace(/^\d{1,2}\s*[-–]\s*\d{1,2}\s+\w+\s+\d{4}/, '').trim();
          } else if (singleDateMatch) {
            startDate = `${singleDateMatch[1]} ${singleDateMatch[2]} ${singleDateMatch[3]}`;
            title = text.replace(/^\d{1,2}\s+\w+\s+\d{4}/, '').trim();
          }

          // Title sometimes has the name duplicated — take the first part
          const parts = title.split(title.substring(0, Math.min(20, title.length)));
          if (parts.length > 2) title = title.substring(0, title.length / 2).trim();

          const img = a.querySelector('img');
          const slug = a.href.split('/').filter(Boolean).pop();

          return { title, startDate, endDate, href: a.href, img: img?.src || null, slug };
        })
        .filter(e => e.title && e.title.length > 3);
    });

    // Deduplicate by slug (each event appears twice in links)
    const seen = new Set();
    const deduped = [];
    for (const ev of events) {
      if (!seen.has(ev.slug)) {
        seen.add(ev.slug);
        deduped.push(ev);
      }
    }

    logger.info(this.name, `Got ${deduped.length} events from event links`);

    return deduped.map(ev => ({
      title: ev.title,
      description: '',
      start_date: ev.startDate,
      end_date: ev.endDate || null,
      venue_name: 'Dubai World Trade Centre',
      venue_address: null,
      city: 'Dubai',
      organizer: 'DWTC',
      industry: classifyIndustry(ev.title),
      is_free: false,
      registration_url: ev.href,
      image_url: ev.img,
      source: 'DWTC',
      source_event_id: `dwtc-${ev.slug}`,
    }));
  }
}

module.exports = DwtcScraper;
