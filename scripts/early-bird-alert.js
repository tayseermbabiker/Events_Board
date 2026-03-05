/**
 * Early Bird Scanner
 *
 * Fully automated pipeline:
 * 1. Pulls upcoming events from Airtable (summit, expo, forum, conference keywords)
 * 2. Visits each event's registration URL with Playwright
 * 3. Scans for early bird keywords on the page
 * 4. Saves matches to the EarlyBirds table in Airtable
 * 5. Sends you an email alert via Resend with new finds
 *
 * Usage:
 *   node scripts/early-bird-alert.js              # scan + email alert
 *   node scripts/early-bird-alert.js --dry-run    # scan only, no writes
 *   node scripts/early-bird-alert.js --no-email   # save to Airtable but skip email
 *
 * Env vars: AIRTABLE_API_KEY, RESEND_API_KEY (optional)
 *
 * Schedule: Run weekly via GitHub Actions (e.g. every Wednesday)
 */

const { chromium } = require('playwright');
const Airtable = require('airtable');

const BASE_ID = 'appkj1liAcTraQmpq';
const EVENTS_TABLE = 'Events';
const EARLYBIRDS_TABLE = 'EarlyBirds';
const ALERT_EMAIL = 'tayseermbabiker@gmail.com';

// Only scan events whose titles match these keywords
const EVENT_TYPE_KEYWORDS = [
  'summit', 'expo', 'forum', 'conference', 'congress',
  'convention', 'symposium', 'trade show', 'world',
];

// Keywords to find on organizer pages
const EARLY_BIRD_PATTERNS = [
  /early\s*bird/i,
  /early\s*registration/i,
  /early\s*booking/i,
  /register\s*(by|before)\s+\w+\s+\d/i,
  /book\s*(by|before)\s+\w+\s+\d/i,
  /save\s+\d+%/i,
  /\d+%\s*(off|discount|saving)/i,
  /special\s*rate/i,
  /limited\s*time\s*(offer|pricing|rate)/i,
  /advance\s*rate/i,
  /super\s*saver/i,
];

// Extract pricing snippets near early bird mentions
function extractSnippets(text) {
  const snippets = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of EARLY_BIRD_PATTERNS) {
      if (pattern.test(line)) {
        // Grab surrounding context (2 lines before and after)
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length, i + 3);
        const context = lines.slice(start, end).join('\n').trim();
        if (context.length > 10) snippets.push(context);
        break;
      }
    }
  }

  return [...new Set(snippets)].slice(0, 3);
}

// Try to extract a deadline date from text near early bird mention
function extractDeadline(text) {
  // Patterns like "before 30 March 2026", "by March 30, 2026", "ends 15 April"
  const patterns = [
    /(?:before|by|until|ends?|deadline)\s*:?\s*(\d{1,2}\s+\w+\s+\d{4})/i,
    /(?:before|by|until|ends?|deadline)\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
    /(?:before|by|until|ends?|deadline)\s*:?\s*(\d{4}-\d{2}-\d{2})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }
  return null;
}

// Try to extract price figures
function extractPrices(text) {
  const pricePattern = /(?:USD|AED|US\$|\$|£|€)\s*[\d,]+(?:\.\d{2})?|\d[\d,]+\s*(?:USD|AED|SAR|QAR)/gi;
  const matches = text.match(pricePattern);
  return matches ? [...new Set(matches)].slice(0, 4) : [];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const noEmail = args.includes('--no-email');

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) {
    console.error('Missing AIRTABLE_API_KEY');
    process.exit(1);
  }

  const base = new Airtable({ apiKey }).base(BASE_ID);

  // 1. Fetch upcoming events from Airtable
  console.log('Fetching upcoming events from Airtable...');
  const events = await fetchEvents(base);
  console.log(`Found ${events.length} upcoming events`);

  // 2. Filter for summit/expo/forum/conference type events
  const targetEvents = events.filter(ev => {
    const title = (ev.fields.title || '').toLowerCase();
    return EVENT_TYPE_KEYWORDS.some(kw => title.includes(kw));
  });
  console.log(`${targetEvents.length} match summit/expo/forum/conference keywords`);

  if (targetEvents.length === 0) {
    console.log('No target events to scan.');
    return;
  }

  // 3. Get existing EarlyBirds records to avoid duplicates
  const { names: existingIds, unposted: existingUnposted } = await fetchExistingEarlyBirds(base);
  const toScan = targetEvents.filter(ev => !existingIds.has(ev.fields.title));
  console.log(`${toScan.length} new events to scan (${targetEvents.length - toScan.length} already in EarlyBirds)`);

  if (toScan.length === 0) {
    console.log('All target events already scanned.');
    // Still send reminder email for unposted deals
    if (!dryRun && !noEmail && process.env.RESEND_API_KEY && existingUnposted.length > 0) {
      console.log(`Sending reminder for ${existingUnposted.length} unposted deal(s)...`);
      await sendEmailAlert(existingUnposted, true);
      console.log('Reminder email sent!');
    }
    return;
  }

  // 4. Launch browser and scan each event's registration URL
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });

  const found = [];

  for (const ev of toScan) {
    const url = ev.fields.registration_url;
    const title = ev.fields.title;

    if (!url) {
      console.log(`  SKIP: ${title} — no registration URL`);
      continue;
    }

    console.log(`  Scanning: ${title}`);
    console.log(`    URL: ${url}`);

    try {
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      // Get all visible text from the page
      const pageText = await page.evaluate(() => document.body.innerText);

      // Check for early bird keywords
      const hasEarlyBird = EARLY_BIRD_PATTERNS.some(p => p.test(pageText));

      if (hasEarlyBird) {
        const snippets = extractSnippets(pageText);
        const deadline = extractDeadline(pageText);
        const prices = extractPrices(
          snippets.join('\n') || pageText.substring(0, 5000)
        );

        console.log(`    FOUND early bird!`);
        if (deadline) console.log(`    Deadline: ${deadline}`);
        if (prices.length) console.log(`    Prices: ${prices.join(', ')}`);

        found.push({
          event_name: title,
          organizer: ev.fields.organizer || '',
          organizer_url: url,
          early_bird_price: prices[0] || '',
          regular_price: prices[1] || '',
          early_bird_deadline: deadline || null,
          event_date: ev.fields.start_date || null,
          location: [ev.fields.venue_name, ev.fields.city].filter(Boolean).join(', '),
          industry: ev.fields.industry || '',
          notes: snippets.join('\n---\n').substring(0, 2000),
          posted: false,
          created_at: new Date().toISOString().split('T')[0],
        });
      } else {
        console.log(`    No early bird found`);
      }

      await page.close();
      // Brief pause between requests
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.log(`    ERROR: ${err.message}`);
    }
  }

  await browser.close();

  console.log(`\nScan complete: ${found.length} early bird deals found out of ${toScan.length} scanned`);

  if (found.length === 0) {
    console.log('No new early bird deals found.');
    // Send reminder for existing unposted deals
    if (!dryRun && !noEmail && process.env.RESEND_API_KEY && existingUnposted.length > 0) {
      console.log(`Sending reminder for ${existingUnposted.length} unposted deal(s)...`);
      await sendEmailAlert(existingUnposted, true);
      console.log('Reminder email sent!');
    }
    return;
  }

  // 5. Save to Airtable
  if (!dryRun) {
    console.log('Saving to EarlyBirds table...');
    await saveToAirtable(base, found);
    console.log('Saved!');
  } else {
    console.log('DRY RUN — not saving to Airtable');
  }

  // 6. Print summary
  console.log('\n=== NEW EARLY BIRD DEALS ===\n');
  for (const deal of found) {
    console.log(`  ${deal.event_name}`);
    console.log(`    Organizer: ${deal.organizer}`);
    console.log(`    Price: ${deal.early_bird_price || '?'} (regular: ${deal.regular_price || '?'})`);
    console.log(`    Deadline: ${deal.early_bird_deadline || '?'}`);
    console.log(`    Event: ${deal.event_date || '?'} @ ${deal.location}`);
    console.log(`    URL: ${deal.organizer_url}`);
    if (deal.notes) console.log(`    Context:\n      ${deal.notes.split('\n').join('\n      ')}`);
    console.log('');
  }

  // 7. Email alert
  if (!dryRun && !noEmail && process.env.RESEND_API_KEY) {
    console.log('Sending email alert...');
    await sendEmailAlert(found, false, existingUnposted);
    console.log('Email sent!');
  }
}

async function fetchEvents(base) {
  return new Promise((resolve, reject) => {
    const all = [];
    base(EVENTS_TABLE)
      .select({
        filterByFormula: 'IS_AFTER({start_date}, TODAY())',
        fields: ['title', 'registration_url', 'organizer', 'start_date', 'venue_name', 'city', 'industry'],
        sort: [{ field: 'start_date', direction: 'asc' }],
      })
      .eachPage(
        (recs, next) => { all.push(...recs); next(); },
        (err) => err ? reject(err) : resolve(all)
      );
  });
}

async function fetchExistingEarlyBirds(base) {
  const names = new Set();
  const unposted = [];
  return new Promise((resolve, reject) => {
    base(EARLYBIRDS_TABLE)
      .select({ fields: ['event_name', 'organizer', 'organizer_url', 'early_bird_price', 'regular_price', 'early_bird_deadline', 'event_date', 'location', 'posted'] })
      .eachPage(
        (recs, next) => {
          for (const r of recs) {
            names.add(r.fields.event_name);
            if (!r.fields.posted) unposted.push(r.fields);
          }
          next();
        },
        (err) => err ? reject(err) : resolve({ names, unposted })
      );
  });
}

async function saveToAirtable(base, deals) {
  // Airtable batch create limit is 10 records per call
  for (let i = 0; i < deals.length; i += 10) {
    const batch = deals.slice(i, i + 10).map(d => ({ fields: d }));
    await base(EARLYBIRDS_TABLE).create(batch);
  }
}

async function sendEmailAlert(deals, isReminder, existingUnposted = []) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const buildRows = (items) => items.map(d =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee"><strong>${d.event_name}</strong></td>
      <td style="padding:8px;border-bottom:1px solid #eee">${d.early_bird_price || '?'}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${d.early_bird_deadline || '?'}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${d.event_date || '?'}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${d.organizer_url ? `<a href="${d.organizer_url}">Link</a>` : '-'}</td>
    </tr>`
  ).join('');

  const tableHeader = `<tr style="background:#f5f5f5">
    <th style="padding:8px;text-align:left">Event</th>
    <th style="padding:8px;text-align:left">Early Bird Price</th>
    <th style="padding:8px;text-align:left">Deadline</th>
    <th style="padding:8px;text-align:left">Event Date</th>
    <th style="padding:8px;text-align:left">Register</th>
  </tr>`;

  let subject, html;

  if (isReminder) {
    subject = `Early Bird Reminder: ${deals.length} unposted deal(s)`;
    html = `
      <h2>Unposted Early Bird Deals</h2>
      <p>No new deals this week, but you still have ${deals.length} unposted deal(s). Time for a LinkedIn post?</p>
      <table style="border-collapse:collapse;width:100%">${tableHeader}${buildRows(deals)}</table>
    `;
  } else {
    subject = `Early Bird Alert: ${deals.length} new deal(s) found`;
    let existingSection = '';
    if (existingUnposted.length > 0) {
      existingSection = `
        <h3 style="margin-top:30px">Still Unposted (${existingUnposted.length})</h3>
        <table style="border-collapse:collapse;width:100%">${tableHeader}${buildRows(existingUnposted)}</table>
      `;
    }
    html = `
      <h2>New Early Bird Deals Found</h2>
      <p>The scanner found ${deals.length} event(s) with early bird pricing. Time to post on LinkedIn!</p>
      <table style="border-collapse:collapse;width:100%">${tableHeader}${buildRows(deals)}</table>
      ${existingSection}
    `;
  }

  html += `<p style="margin-top:20px;color:#666">Check your <a href="https://airtable.com/appkj1liAcTraQmpq">EarlyBirds table</a> for full details.</p>`;

  await resend.emails.send({
    from: 'Conferix Alerts <alerts@conferix.com>',
    to: ALERT_EMAIL,
    subject,
    html,
  });
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
