const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');

/**
 * eMedEvents scraper — medical conferences and CME events.
 * Uses __NEXT_DATA__ extraction from the homepage.
 * All events are classified as Healthcare industry.
 */
class EMedEventsScraper extends BaseScraper {
  constructor() {
    super('eMedEvents');
  }

  async scrape() {
    const url = 'https://www.emedevents.com/';
    logger.info(this.name, `Fetching: ${url}`);

    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);

    const events = await this.page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      if (!el) return [];
      const data = JSON.parse(el.textContent);
      const homeData = data.props?.pageProps?.homeData;
      if (!homeData) return [];

      // Collect from all conference collections
      const all = [];
      const seen = new Set();
      const collections = [
        'featured_conferences',
        'inperson_hybrid',
        'Internal_Medicine_Conferences',
        'live_webinar',
        'free_conferences',
      ];

      for (const key of collections) {
        const items = homeData[key];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (!item.id || seen.has(item.id)) continue;
          seen.add(item.id);
          all.push(item);
        }
      }

      return all;
    });

    logger.info(this.name, `Extracted ${events.length} events from __NEXT_DATA__`);

    return events.map(ev => this.mapEvent(ev)).filter(Boolean);
  }

  mapEvent(ev) {
    if (!ev.title) return null;

    // Parse dates like "11 Jul'26" or "18 Jul'26"
    const startDate = this.parseEmedDate(ev.startdate);
    const endDate = this.parseEmedDate(ev.enddate);

    // Filter to USA only
    const location = ev.location || '';
    if (!location.toLowerCase().includes('usa') && !location.toLowerCase().includes('united states')) {
      // Check for US state abbreviations
      const usStates = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;
      if (!usStates.test(location)) return null;
    }

    const city = this.detectCity(location);
    const isFree = ev.display_price === '0' || ev.display_price === 'Free' || /free/i.test(ev.title);

    return {
      title: ev.title,
      description: ev.specialities ? `Specialties: ${ev.specialities.join(', ')}. ${ev.display_cme || ''}` : '',
      start_date: startDate,
      end_date: endDate,
      venue_name: null,
      venue_address: location,
      city,
      organizer: ev.organization_name || null,
      industry: 'Healthcare',
      is_free: Boolean(isFree),
      registration_url: ev.detailpage_url ? `https://www.emedevents.com/${ev.detailpage_url}` : null,
      image_url: ev.conference_image || ev.featured_image || null,
      source: 'eMedEvents',
      source_event_id: `emed-${ev.id}`,
    };
  }

  /**
   * Parse eMedEvents date format: "11 Jul'26" -> ISO date
   */
  parseEmedDate(raw) {
    if (!raw) return null;
    // "11 Jul'26" -> "11 Jul 2026"
    const normalized = raw.replace(/'(\d{2})/, ' 20$1');
    const d = new Date(normalized);
    return isNaN(d) ? null : d.toISOString();
  }

  detectCity(text) {
    const lower = (text || '').toLowerCase();
    if (lower.includes('austin')) return 'Austin';
    if (lower.includes('san francisco')) return 'San Francisco';
    if (lower.includes('new york') || lower.includes('nyc')) return 'New York';
    if (lower.includes('los angeles')) return 'Los Angeles';
    if (lower.includes('miami')) return 'Miami';
    if (lower.includes('chicago')) return 'Chicago';
    if (lower.includes('seattle')) return 'Seattle';
    if (lower.includes('denver')) return 'Denver';
    if (lower.includes('boston')) return 'Boston';
    if (lower.includes('washington') || lower.includes(' dc')) return 'Washington DC';
    if (lower.includes('houston')) return 'Houston';
    if (lower.includes('dallas') || lower.includes('irving')) return 'Dallas';
    if (lower.includes('philadelphia')) return 'Philadelphia';
    if (lower.includes('atlanta')) return 'Atlanta';
    if (lower.includes('nashville')) return 'Nashville';
    if (lower.includes('phoenix')) return 'Phoenix';
    if (lower.includes('anaheim') || lower.includes('california')) return 'Los Angeles';
    return null;
  }
}

module.exports = EMedEventsScraper;
