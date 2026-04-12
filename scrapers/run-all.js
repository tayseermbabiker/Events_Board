const config = require('./config');
const logger = require('./utils/logger');

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

async function postBatch(payload) {
  const url = config.webhookUrl;
  logger.info('Runner', `POSTing ${payload.events.length} ${payload.source} events to ${url}`);

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
  logger.info('Runner', `Response: ${json.message || JSON.stringify(json.results)}`);
  return json;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const startTime = Date.now();
  logger.info('Runner', '=== Scrape run started ===');

  const summary = {};
  let totalPosted = 0;
  let totalErrors = 0;

  // Run scrapers sequentially, POST per source so the webhook
  // can deactivate events that disappeared from each source.
  for (const { key, source, Cls } of ALL_SCRAPERS) {
    if (!config.scrapers[key]?.enabled) {
      logger.info('Runner', `Skipping ${key} (disabled)`);
      summary[key] = { status: 'skipped', count: 0 };
      continue;
    }

    logger.info('Runner', `--- Running ${key} ---`);
    const scraper = new Cls();
    const events = await scraper.run();

    summary[key] = { status: events.length > 0 ? 'ok' : 'empty', count: events.length };

    if (events.length > 0) {
      try {
        await postBatch({ source, events });
        totalPosted += events.length;
        logger.info('Runner', `${key}: posted ${events.length} events`);
      } catch (err) {
        logger.error('Runner', `${key}: POST failed: ${err.message}`);
        totalErrors += events.length;
      }
    }

    await sleep(1000);
  }

  logger.info('Runner', `Total posted: ${totalPosted}, Errors: ${totalErrors}`);
  printSummary(summary, startTime);
}

function printSummary(summary, startTime) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info('Runner', '=== Summary ===');
  for (const [key, val] of Object.entries(summary)) {
    logger.info('Runner', `  ${key}: ${val.status} (${val.count} events)`);
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
