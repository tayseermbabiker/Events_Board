const config = require('./config');
const logger = require('./utils/logger');
const pLimit = require('p-limit');

// Import all scrapers
const EventbriteScraper = require('./sites/eventbrite');
const DifcScraper = require('./sites/difc');
const AdgmScraper = require('./sites/adgm');
const MeetupScraper = require('./sites/meetup');
const DwtcScraper = require('./sites/dwtc');
const AdnecScraper = require('./sites/adnec');
const TerrapinnScraper = require('./sites/terrapinn');
const InformaScraper = require('./sites/informa');
const DmgScraper = require('./sites/dmg');
const ExpocityScraper = require('./sites/expocity');

const ALL_SCRAPERS = [
  { key: 'eventbrite', source: 'Eventbrite', Cls: EventbriteScraper },
  { key: 'dwtc',       source: 'DWTC',       Cls: DwtcScraper },
  { key: 'adnec',      source: 'ADNEC',      Cls: AdnecScraper },
  { key: 'difc',       source: 'DIFC',       Cls: DifcScraper },
  { key: 'adgm',       source: 'ADGM',       Cls: AdgmScraper },
  { key: 'meetup',     source: 'Meetup',     Cls: MeetupScraper },
  { key: 'terrapinn',  source: 'Terrapinn',  Cls: TerrapinnScraper },
  { key: 'informa',    source: 'Informa',    Cls: InformaScraper },
  { key: 'dmg',        source: 'DMG',        Cls: DmgScraper },
  { key: 'expocity',   source: 'ExpoCity',   Cls: ExpocityScraper },
];

const CONCURRENCY = 4;

async function postBatch(payload) {
  const url = config.webhookUrl;
  logger.info('Runner', `POSTing ${payload.events.length} ${payload.source} events to webhook`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  logger.info('Runner', `${payload.source} response: ${json.message || JSON.stringify(json.results)}`);
  return json;
}

// Scrape + POST a single source, isolated so a failure can't take down the run
async function runSource({ key, source, Cls }) {
  if (!config.scrapers[key]?.enabled) {
    logger.info('Runner', `Skipping ${key} (disabled)`);
    return { key, status: 'skipped', count: 0 };
  }

  logger.info('Runner', `--- ${key} START ---`);
  try {
    const scraper = new Cls();
    const events = await scraper.run();

    if (events.length === 0) {
      logger.info('Runner', `${key}: no events scraped`);
      return { key, status: 'empty', count: 0 };
    }

    await postBatch({ source, events });
    logger.info('Runner', `--- ${key} DONE (${events.length} events) ---`);
    return { key, status: 'ok', count: events.length };
  } catch (err) {
    logger.error('Runner', `${key} failed: ${err.message}`);
    return { key, status: 'error', count: 0, error: err.message };
  }
}

async function main() {
  const startTime = Date.now();
  logger.info('Runner', `=== Scrape run started (concurrency=${CONCURRENCY}) ===`);

  const limit = pLimit(CONCURRENCY);

  // Run all sources in parallel (4 at a time). Promise.allSettled means one
  // scraper crashing doesn't kill the others — each result is independent.
  const settled = await Promise.allSettled(
    ALL_SCRAPERS.map(s => limit(() => runSource(s)))
  );

  const summary = {};
  let totalEvents = 0;
  let errorCount = 0;

  for (const r of settled) {
    if (r.status === 'fulfilled') {
      const { key, status, count, error } = r.value;
      summary[key] = { status, count, ...(error && { error }) };
      totalEvents += count;
      if (status === 'error') errorCount++;
    } else {
      // Should be unreachable since runSource catches its own errors,
      // but defensive: record the rejection too.
      logger.error('Runner', `Unexpected rejection: ${r.reason}`);
      errorCount++;
    }
  }

  logger.info('Runner', `Total events posted: ${totalEvents}, Source errors: ${errorCount}`);
  printSummary(summary, startTime);
}

function printSummary(summary, startTime) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info('Runner', '=== Summary ===');
  for (const [key, val] of Object.entries(summary)) {
    const suffix = val.error ? ` — ${val.error}` : '';
    logger.info('Runner', `  ${key}: ${val.status} (${val.count} events)${suffix}`);
  }
  logger.info('Runner', `Total time: ${elapsed}s`);
  logger.info('Runner', '=== Scrape run complete ===');
  logger.close();
}

main().catch(err => {
  logger.error('Runner', `Fatal: ${err.message}`);
  logger.close();
  process.exit(1);
});
