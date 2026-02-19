// Export active events from Airtable to static JSON (1 API call per day)
const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

async function exportEvents() {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID);

  const records = await base('Events')
    .select({
      filterByFormula: 'AND(OR(IS_AFTER({start_date}, DATEADD(NOW(), -1, "day")), AND(IS_AFTER({end_date}, NOW()), {end_date} != BLANK())), {industry} != "General")',
      sort: [{ field: 'start_date', direction: 'asc' }],
      maxRecords: 200
    })
    .all();

  const events = records.map(r => ({
    id: r.id,
    title: r.get('title'),
    description: r.get('description'),
    start_date: r.get('start_date'),
    end_date: r.get('end_date'),
    venue_name: r.get('venue_name'),
    venue_address: r.get('venue_address'),
    city: r.get('city'),
    organizer: r.get('organizer'),
    industry: r.get('industry'),
    tags: r.get('tags') || [],
    is_free: r.get('is_free') || false,
    capacity: r.get('capacity'),
    registration_url: r.get('registration_url'),
    image_url: r.get('image_url'),
    source: r.get('source')
  }));

  const output = { success: true, events, count: events.length };

  fs.writeFileSync(
    path.join(__dirname, '..', 'public', 'events.json'),
    JSON.stringify(output)
  );

  console.log(`Exported ${events.length} events to public/events.json`);
}

exportEvents().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
