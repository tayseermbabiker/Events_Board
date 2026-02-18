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

    // Wait for event cards to render
    try {
      await this.page.waitForSelector('.event_slide', { timeout: 10000 });
    } catch {
      logger.warn(this.name, '.event_slide not found, trying longer wait...');
      await this.page.waitForTimeout(5000);
    }

    // Extract events from .event_slide cards using structured selectors
    const events = await this.page.$$eval('.event_slide', slides => {
      return slides.map(slide => {
        const link = slide.querySelector('a[href*="/en/events/"]');
        if (!link) return null;

        const href = link.href;
        if (href.endsWith('/events/') || href.includes('/ar/')) return null;

        // Use specific selectors inside each card
        const dateEl = slide.querySelector('time.e-date');
        const titleEl = slide.querySelector('h3.e-title.e-grid');
        const img = slide.querySelector('img');
        const slug = href.split('/').filter(Boolean).pop();

        const dateText = dateEl ? dateEl.textContent.trim() : null;
        const title = titleEl ? titleEl.textContent.trim() : null;

        if (!title || title.length < 3) return null;

        // Parse date text: "4 - 5 Feb 2026", "19 Feb - 20 Mar 2026", "4 Feb 2026"
        let startDate = null;
        let endDate = null;

        if (dateText) {
          const crossMonth = dateText.match(/^(\d{1,2})\s+(\w+)\s*[-–]\s*(\d{1,2})\s+(\w+)\s+(\d{4})/);
          const sameMonth = !crossMonth ? dateText.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(\w+)\s+(\d{4})/) : null;
          const single = (!crossMonth && !sameMonth) ? dateText.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})/) : null;

          if (crossMonth) {
            startDate = `${crossMonth[1]} ${crossMonth[2]} ${crossMonth[5]}`;
            endDate = `${crossMonth[3]} ${crossMonth[4]} ${crossMonth[5]}`;
          } else if (sameMonth) {
            startDate = `${sameMonth[1]} ${sameMonth[3]} ${sameMonth[4]}`;
            endDate = `${sameMonth[2]} ${sameMonth[3]} ${sameMonth[4]}`;
          } else if (single) {
            startDate = `${single[1]} ${single[2]} ${single[3]}`;
          }
        }

        // Get category from the card text for industry classification
        const categoryEl = slide.querySelector('.event-info') || slide.querySelector('[class*="EventInfo"]');
        const category = categoryEl ? categoryEl.textContent.trim() : '';

        return { title, startDate, endDate, href, img: img?.src || null, slug, category };
      }).filter(Boolean);
    });

    // Deduplicate by slug
    const seen = new Set();
    const deduped = [];
    for (const ev of events) {
      if (!seen.has(ev.slug)) {
        seen.add(ev.slug);
        deduped.push(ev);
      }
    }

    // Fallback: if .event_slide approach got nothing, try direct link extraction
    if (deduped.length === 0) {
      logger.warn(this.name, 'No .event_slide results, trying fallback...');
      const fallback = await this.page.$$eval('a[href*="/en/events/"][href$="/"]', links => {
        return links
          .filter(a => !a.href.endsWith('/events/') && !a.href.includes('/ar/'))
          .map(a => {
            const dateEl = a.querySelector('time.e-date');
            const titleEl = a.querySelector('h3.e-title.e-grid') || a.querySelector('.e-title');
            const slug = a.href.split('/').filter(Boolean).pop();
            const dateText = dateEl ? dateEl.textContent.trim() : null;
            const title = titleEl ? titleEl.textContent.trim() : null;

            let startDate = null;
            let endDate = null;
            if (dateText) {
              const crossMonth = dateText.match(/^(\d{1,2})\s+(\w+)\s*[-–]\s*(\d{1,2})\s+(\w+)\s+(\d{4})/);
              const sameMonth = !crossMonth ? dateText.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(\w+)\s+(\d{4})/) : null;
              const single = (!crossMonth && !sameMonth) ? dateText.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})/) : null;
              if (crossMonth) { startDate = `${crossMonth[1]} ${crossMonth[2]} ${crossMonth[5]}`; endDate = `${crossMonth[3]} ${crossMonth[4]} ${crossMonth[5]}`; }
              else if (sameMonth) { startDate = `${sameMonth[1]} ${sameMonth[3]} ${sameMonth[4]}`; endDate = `${sameMonth[2]} ${sameMonth[3]} ${sameMonth[4]}`; }
              else if (single) { startDate = `${single[1]} ${single[2]} ${single[3]}`; }
            }
            return title && title.length > 3 ? { title, startDate, endDate, href: a.href, img: null, slug, category: '' } : null;
          })
          .filter(Boolean);
      });

      const fbSeen = new Set();
      for (const ev of fallback) {
        if (!fbSeen.has(ev.slug)) {
          fbSeen.add(ev.slug);
          deduped.push(ev);
        }
      }
      logger.info(this.name, `Fallback got ${deduped.length} events`);
    }

    logger.info(this.name, `Got ${deduped.length} events from event cards`);

    return deduped.map(ev => ({
      title: ev.title,
      description: '',
      start_date: ev.startDate,
      end_date: ev.endDate || null,
      venue_name: 'Dubai World Trade Centre',
      venue_address: null,
      city: 'Dubai',
      organizer: 'DWTC',
      industry: classifyIndustry(`${ev.title} ${ev.category}`),
      is_free: false,
      registration_url: ev.href,
      image_url: ev.img,
      source: 'DWTC',
      source_event_id: `dwtc-${ev.slug}`,
    }));
  }
}

module.exports = DwtcScraper;
