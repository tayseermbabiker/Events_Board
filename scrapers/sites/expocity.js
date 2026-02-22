const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');
const { classifyIndustry } = require('../utils/industry-map');

const LISTING_URL = 'https://www.expocitydubai.com/en/things-to-do/events-and-workshops/';

// Subtype slugs that indicate entertainment/lifestyle (from Contentful CMS)
const ENTERTAINMENT_SUBTYPES = new Set([
  'event-type-or-entertainment',
  'entertainment',
  'tag-movie',
]);

// Title patterns for non-professional events
const SKIP_PATTERNS = [
  /\byoga\b/i, /\bpilates\b/i, /\bfitness\b/i, /\bzumba\b/i,
  /\bkids?\b/i, /\bchildren\b/i, /\bjunior\b/i, /\bfamily fun\b/i,
  /\bmovie\b/i, /\bcinema\b/i, /\bfilm screening\b/i, /\bshort films?\b/i,
  /\bconcert\b/i, /\blive music\b/i, /\bstand.?up\b/i, /\bcomedy\b/i,
  /\bballet\b/i, /\bdance class\b/i, /\bchoir\b/i, /\borchestra\b/i,
  /\bcooking class\b/i, /\bcraft\b/i, /\bpainting\b/i, /\bart workshop\b/i,
  /\bart exhibition\b/i, /\blight art\b/i,
  /\bbirthday\b/i, /\bbrunch\b/i, /\bnight market\b/i, /\bpop.?up\b/i,
  /\bgarden\b/i, /\bplant\b/i, /\bnature walk\b/i,
  /\bskating\b/i, /\bswimming\b/i, /\bsports camp\b/i,
  /\bmarathon\b/i, /\bhalf marathon\b/i, /\brun\s/i, /\bcycle\b/i,
  /\bduathlon\b/i, /\btriathlon\b/i, /\bfitfest\b/i,
  /\bcamp\b/i, /\bwinter city\b/i, /\bcarols\b/i, /\bnew year\b/i,
  /\bcelebrat/i, /\bnational day\b/i, /\beid\b/i, /\bramadan\b/i,
  /\biftar\b/i, /\bhag al laila\b/i,
  /\bwomen'?s day\b/i, /\bwomen'?s run\b/i,
  /\btechno festival\b/i, /\besports\b/i, /\bgaming\b/i,
  /\bopera\b/i, /\bclassical\b/i,
  /\bwellness\b/i, /\bsephori/i,
  /green day live/i, /eric prydz/i, /holo in dubai/i,
];

// Positive patterns for professional events
const PROFESSIONAL_PATTERNS = [
  /\bsummit\b/i, /\bconference\b/i, /\bcongress\b/i, /\bforum\b/i,
  /\bexpo\b/i, /\bexhibition\b/i, /\btrade show\b/i,
  /\bsymposium\b/i, /\bseminar\b/i,
  /\bindustry\b/i, /\bb2b\b/i, /\bprofessional\b/i,
  /\bgulfood\b/i, /\bwhx\b/i, /\bgitex\b/i, /\bwetex\b/i,
  /\bbeautyworld\b/i, /\bautomechanika\b/i,
  /\bworld health\b/i, /\binnovators\b/i,
  /\bcarbon assessment\b/i, /\bsustainable\b/i,
  /\bcities.*summit\b/i, /\bmayors\b/i,
];

class ExpocityScraper extends BaseScraper {
  constructor() {
    super('ExpoCity');
  }

  async scrape() {
    logger.info(this.name, `Fetching: ${LISTING_URL}`);
    await this.page.goto(LISTING_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(8000);

    // Extract events from __NUXT__.data[0].eventsRaw
    const nuxtEvents = await this.page.evaluate(() => {
      try {
        const raw = window.__NUXT__ && window.__NUXT__.data && window.__NUXT__.data[0] && window.__NUXT__.data[0].eventsRaw;
        if (!raw || !Array.isArray(raw)) return null;

        return raw.map(ev => {
          // Extract image URL from deeply nested Contentful structure
          let imageUrl = null;
          try {
            const mediaItems = ev.mediaCollection && ev.mediaCollection.items;
            if (mediaItems && mediaItems[0]) {
              const innerItems = mediaItems[0].itemsCollection && mediaItems[0].itemsCollection.items;
              if (innerItems && innerItems[0]) {
                const focal = innerItems[0].assetWithFocalPoint;
                if (focal && focal.image) {
                  imageUrl = focal.image.url;
                } else if (innerItems[0].videoCover) {
                  imageUrl = innerItems[0].videoCover.url;
                } else if (innerItems[0].asset && innerItems[0].asset.contentType && innerItems[0].asset.contentType.startsWith('image/')) {
                  imageUrl = innerItems[0].asset.url;
                }
              }
            }
          } catch (e) {}

          // Extract subtype slugs for filtering
          const subtypeSlugs = [];
          try {
            const subtypes = ev.subtypeCollection && ev.subtypeCollection.items;
            if (subtypes) {
              subtypes.forEach(s => { if (s.slug) subtypeSlugs.push(s.slug); });
            }
          } catch (e) {}

          // Extract dates from eventTimingJson.dates[]
          // Format: "2026-02-19T20:15+04:00 - 2026-02-19T22:00+04:00"
          let dates = [];
          try {
            if (ev.eventTimingJson && ev.eventTimingJson.dates && Array.isArray(ev.eventTimingJson.dates)) {
              dates = ev.eventTimingJson.dates;
            }
          } catch (e) {}

          return {
            title: ev.title || '',
            slug: ev.slug || '',
            dates: dates,
            subtypeSlugs: subtypeSlugs,
            imageUrl: imageUrl,
            price: ev.price && ev.price.adult ? ev.price.adult : null,
          };
        });
      } catch (e) {
        return null;
      }
    });

    if (!nuxtEvents || nuxtEvents.length === 0) {
      logger.warn(this.name, 'No events found in __NUXT__.data[0].eventsRaw');
      return [];
    }

    logger.info(this.name, `Raw events from __NUXT__: ${nuxtEvents.length}`);

    const events = [];

    for (const raw of nuxtEvents) {
      if (!raw.title || raw.title.length < 3) continue;

      // Filter by Contentful subtypes first
      const isEntertainmentSubtype = raw.subtypeSlugs.some(s => ENTERTAINMENT_SUBTYPES.has(s));

      // Filter by title patterns
      if (SKIP_PATTERNS.some(p => p.test(raw.title))) {
        logger.info(this.name, `Skipping (title filter): ${raw.title}`);
        continue;
      }

      const hasProfessionalKeyword = PROFESSIONAL_PATTERNS.some(p => p.test(raw.title));

      // If it's tagged as entertainment AND has no professional keyword, skip
      if (isEntertainmentSubtype && !hasProfessionalKeyword) {
        logger.info(this.name, `Skipping (entertainment subtype): ${raw.title}`);
        continue;
      }

      // If no professional keyword at all, skip ambiguous events
      if (!hasProfessionalKeyword) {
        logger.info(this.name, `Skipping (no professional keyword): ${raw.title}`);
        continue;
      }

      // Parse dates from "2026-02-19T20:15+04:00 - 2026-02-19T22:00+04:00" format
      let startDate = null;
      let endDate = null;

      if (raw.dates.length > 0) {
        // Each date entry is a time range; we want the earliest date and latest date
        const allDates = [];
        for (const dateStr of raw.dates) {
          // Split "start - end" and take the start part
          const startPart = dateStr.split(' - ')[0].trim();
          allDates.push(startPart);
        }

        allDates.sort();
        startDate = allDates[0];
        if (allDates.length > 1) {
          endDate = allDates[allDates.length - 1];
        }
      }

      if (!startDate) {
        logger.warn(this.name, `No date for: ${raw.title}`);
        continue;
      }

      const registrationUrl = `https://www.expocitydubai.com/en/things-to-do/events-and-workshops/${raw.slug}/`;

      events.push({
        title: raw.title,
        description: '',
        start_date: startDate,
        end_date: endDate,
        venue_name: 'Expo City Dubai',
        venue_address: 'Expo City Dubai, Dubai South',
        city: 'Dubai',
        organizer: 'Expo City Dubai',
        industry: classifyIndustry(raw.title),
        is_free: false,
        registration_url: registrationUrl,
        image_url: raw.imageUrl,
        source: 'ExpoCity',
        source_event_id: `expocity-${raw.slug}`,
      });

      logger.info(this.name, `Added: ${raw.title} (${startDate.substring(0, 10)})`);
    }

    return events;
  }
}

module.exports = ExpocityScraper;
