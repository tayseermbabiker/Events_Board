const BaseScraper = require('../base-scraper');
const logger = require('../utils/logger');
const { classifyIndustry } = require('../utils/industry-map');

// Single listing page is sufficient — all MEA events appear on /mea/events/
const LISTING_URL = 'https://www.informaconnect.com/mea/events/';

const UAE_CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];

// Navigation/utility slugs to skip
const SKIP_SLUGS = new Set([
  'mea', 'mea/', 'cookie-policy', 'terms-of-use', 'code-of-conduct',
  'mea/training-courses', 'mea/conferences', 'mea/consulting',
  'mea/marketing-solutions', 'mea/exhibitions', 'mea/contact',
  'mea/events', 'about-us', 'investors', 'talent', 'privacy-policy',
]);

class InformaScraper extends BaseScraper {
  constructor() {
    super('Informa');
  }

  async scrape() {
    logger.info(this.name, `Fetching listing: ${LISTING_URL}`);
    await this.page.goto(LISTING_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);

    // Click "Show More" to reveal all events
    let loadMoreClicks = 0;
    while (loadMoreClicks < 10) {
      const loadMore = await this.page.$('button:has-text("Load More"), button:has-text("Show More"), a:has-text("Load More"), [class*="load-more"]');
      if (!loadMore) break;
      try {
        await loadMore.click();
        await this.page.waitForTimeout(2000);
        loadMoreClicks++;
        logger.info(this.name, `Clicked Load More (${loadMoreClicks})`);
      } catch { break; }
    }

    // Extract event links — events are at root level: informaconnect.com/{slug}/
    // Link text embeds title + date + location, e.g.:
    // "MEA EventAsset Recovery Middle East28 Apr, 20262 daysDubai, UAEBook Now..."
    const stubs = await this.page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href]');
      const results = [];
      const seen = new Set();

      for (const a of anchors) {
        const href = a.href;
        if (!href.includes('informaconnect.com/')) continue;

        const url = new URL(href);
        const path = url.pathname.replace(/\/$/, '');
        const segments = path.split('/').filter(Boolean);

        // Event detail pages have exactly 1 path segment (the slug)
        if (segments.length !== 1) continue;
        const slug = segments[0];
        if (seen.has(slug)) continue;

        const text = a.textContent.trim();
        if (!text || text.length < 10) continue;

        // Must contain "UAE" or a UAE city to be a relevant event link
        if (!/UAE|Dubai|Abu Dhabi|Sharjah/i.test(text)) continue;

        seen.add(slug);
        results.push({ href, slug, rawText: text });
      }

      return results;
    });

    logger.info(this.name, `Found ${stubs.length} UAE event links on listing page`);

    const events = [];

    for (const stub of stubs) {
      // Skip nav/utility pages
      if (SKIP_SLUGS.has(stub.slug)) continue;

      try {
        await this.page.waitForTimeout(1500);
        logger.info(this.name, `Fetching detail: ${stub.href}`);
        await this.page.goto(stub.href, { waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(3000);

        // Extract JSON-LD
        const jsonLd = await this.page.evaluate(() => {
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of scripts) {
            try {
              const data = JSON.parse(script.textContent);
              if (data['@type'] === 'Event') return data;
              if (Array.isArray(data)) {
                const ev = data.find(d => d['@type'] === 'Event');
                if (ev) return ev;
              }
              if (data['@graph']) {
                const ev = data['@graph'].find(d => d['@type'] === 'Event');
                if (ev) return ev;
              }
            } catch {}
          }
          return null;
        });

        // Fallback meta
        const pageMeta = await this.page.evaluate(() => {
          const desc = document.querySelector('meta[name="description"]');
          const ogImage = document.querySelector('meta[property="og:image"]');
          const ogTitle = document.querySelector('meta[property="og:title"]');
          return {
            title: ogTitle?.content || '',
            description: desc?.content || '',
            image: ogImage?.content || null,
          };
        });

        let title = pageMeta.title || stub.slug.replace(/-/g, ' ');
        let startDate = null;
        let endDate = null;
        let venueName = null;
        let venueAddress = null;
        let description = pageMeta.description;
        let image = pageMeta.image;
        let city = null;

        if (jsonLd) {
          title = jsonLd.name || title;
          startDate = jsonLd.startDate || null;
          endDate = jsonLd.endDate || null;
          description = jsonLd.description || description;
          image = jsonLd.image?.url || jsonLd.image || image;

          const loc = jsonLd.location;
          if (loc) {
            if (loc.name) venueName = loc.name;
            const addr = loc.address;
            if (typeof addr === 'string') {
              venueAddress = addr;
            } else if (addr) {
              venueAddress = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.addressCountry]
                .filter(Boolean).join(', ');
              if (addr.addressLocality) {
                for (const c of UAE_CITIES) {
                  if (addr.addressLocality.toLowerCase().includes(c.toLowerCase())) {
                    city = c;
                    break;
                  }
                }
              }
            }
          }
        }

        // Determine city from all available text
        if (!city) {
          const locationText = [venueName, venueAddress, stub.rawText].join(' ').toLowerCase();
          for (const c of UAE_CITIES) {
            if (locationText.includes(c.toLowerCase())) {
              city = c;
              break;
            }
          }
        }

        // Default to Dubai for UAE events
        if (!city) city = 'Dubai';

        if (!startDate) {
          // Try to parse date from listing text: "28 Apr, 2026"
          const dateMatch = stub.rawText.match(/(\d{1,2}\s+\w{3},?\s+\d{4})/);
          if (dateMatch) startDate = dateMatch[1];
        }

        if (!startDate) {
          logger.warn(this.name, `No date found for: ${title}`);
          continue;
        }

        events.push({
          title,
          description: (description || '').substring(0, 5000),
          start_date: startDate,
          end_date: endDate,
          venue_name: venueName,
          venue_address: venueAddress,
          city,
          organizer: 'Informa Connect',
          industry: classifyIndustry(title + ' ' + (description || '')),
          is_free: false,
          registration_url: stub.href,
          image_url: image,
          source: 'Informa',
          source_event_id: `informa-${stub.slug}`,
        });

        logger.info(this.name, `Added: ${title} (${city})`);
      } catch (err) {
        logger.warn(this.name, `Failed to scrape detail for ${stub.slug}: ${err.message}`);
      }
    }

    return events;
  }
}

module.exports = InformaScraper;
