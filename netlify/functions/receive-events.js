// Netlify Function: Receive Events from scraper
// Optimized to minimize Airtable API calls:
//   - ONE bulk dedup list per batch (reused for the deactivate sweep)
//   - BATCHED creates and updates (10 records per call)
// Falls back to per-event lookups when payload has no source (legacy mode).
const Airtable = require('airtable');

const INDUSTRY_MAP = {
  'technology': 'Tech & AI',
  'ai': 'Tech & AI',
  'telecom': 'Tech & AI',
  'telecommunications': 'Tech & AI',
  'startup': 'Startups',
  'real estate': 'Real Estate & Construction',
  'construction': 'Real Estate & Construction',
  'hospitality': 'Hospitality & F&B',
  'food & beverage': 'Hospitality & F&B',
  'retail': 'Hospitality & F&B',
  'energy': 'Energy & Government',
  'government': 'Energy & Government',
  'agriculture': 'Energy & Government',
  'marketing': 'General',
  'education': 'General',
  'media': 'General',
  'manufacturing': 'General',
  'transportation': 'General',
};
const KEEP_AS_IS = ['finance', 'legal', 'healthcare', 'startups', 'general',
  'tech & ai', 'real estate & construction', 'hospitality & f&b', 'energy & government'];

const mapIndustry = (raw) => {
  if (!raw) return 'General';
  const lower = raw.toLowerCase().trim();
  if (KEEP_AS_IS.includes(lower)) return raw;
  return INDUSTRY_MAP[lower] || 'General';
};

const toDate = (val) => (val ? val.split('T')[0] : null);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const parsed = JSON.parse(event.body);
    const isBatchPayload = parsed && !Array.isArray(parsed) && Array.isArray(parsed.events);
    const incomingEvents = isBatchPayload ? parsed.events : parsed;
    const batchSource = isBatchPayload ? parsed.source : null;

    if (!Array.isArray(incomingEvents) || incomingEvents.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid events data' }) };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);
    const eventsTable = base('Events');

    const results = { created: 0, updated: 0, skipped: 0, deactivated: 0, errors: [] };

    // === Bulk dedup (when source is known) ===
    // ONE list query → map of source_event_id → record id.
    // Also build an active-only map, which the deactivate sweep reuses below
    // (no second list call needed).
    let existingMap = null;
    let activeMap = null;

    if (batchSource) {
      const existing = await eventsTable
        .select({
          filterByFormula: `{source} = "${batchSource.replace(/"/g, '\\"')}"`,
          fields: ['source_event_id', 'is_active'],
        })
        .all();
      existingMap = new Map();
      activeMap = new Map();
      for (const rec of existing) {
        const seid = rec.get('source_event_id');
        if (!seid) continue;
        existingMap.set(seid, rec.id);
        if (rec.get('is_active')) activeMap.set(seid, rec.id);
      }
    }

    // === Build create/update lists ===
    const toCreate = [];
    const toUpdate = [];
    const today = toDate(new Date().toISOString());

    for (const eventData of incomingEvents) {
      try {
        const eventRecord = {
          title: eventData.title,
          description: eventData.description,
          start_date: toDate(eventData.start_date),
          end_date: toDate(eventData.end_date),
          venue_name: eventData.venue_name,
          venue_address: eventData.venue_address,
          city: eventData.city || 'Dubai',
          organizer: eventData.organizer,
          industry: mapIndustry(eventData.industry),
          is_free: eventData.is_free || false,
          registration_url: eventData.registration_url,
          image_url: eventData.image_url,
          source: eventData.source,
          source_event_id: eventData.source_event_id,
          scraped_at: today,
          is_active: true,
        };

        let existingId = null;
        if (existingMap) {
          existingId = existingMap.get(eventData.source_event_id) || null;
        } else {
          // Legacy fallback: per-event lookup when no batchSource
          const records = await eventsTable
            .select({
              filterByFormula: `{source_event_id} = "${(eventData.source_event_id || '').replace(/"/g, '\\"')}"`,
              maxRecords: 1,
            })
            .firstPage();
          existingId = records.length > 0 ? records[0].id : null;
        }

        if (existingId) {
          toUpdate.push({ id: existingId, fields: eventRecord });
        } else {
          toCreate.push({ fields: eventRecord });
        }
      } catch (err) {
        console.error('Error processing event:', err);
        results.errors.push({ event: eventData.title, error: err.message });
      }
    }

    // === Batched writes (10 records per call) ===
    for (let i = 0; i < toCreate.length; i += 10) {
      try {
        const created = await eventsTable.create(toCreate.slice(i, i + 10));
        results.created += created.length;
      } catch (err) {
        console.error('Batched create failed:', err.message);
        results.errors.push({ batch: 'create', error: err.message });
      }
    }
    for (let i = 0; i < toUpdate.length; i += 10) {
      try {
        const updated = await eventsTable.update(toUpdate.slice(i, i + 10));
        results.updated += updated.length;
      } catch (err) {
        console.error('Batched update failed:', err.message);
        results.errors.push({ batch: 'update', error: err.message });
      }
    }

    // === Deactivate sweep (reuses activeMap — no new list call) ===
    const MIN_EVENTS_FOR_SWEEP = 3;
    if (activeMap && incomingEvents.length >= MIN_EVENTS_FOR_SWEEP) {
      const seenIds = new Set(incomingEvents.map(e => e.source_event_id).filter(Boolean));
      const toDeactivate = [];
      for (const [seid, recId] of activeMap.entries()) {
        if (!seenIds.has(seid)) {
          toDeactivate.push({ id: recId, fields: { is_active: false } });
        }
      }
      for (let i = 0; i < toDeactivate.length; i += 10) {
        try {
          await eventsTable.update(toDeactivate.slice(i, i + 10));
        } catch (err) {
          console.error('Batched deactivate failed:', err.message);
          results.errors.push({ batch: 'deactivate', error: err.message });
        }
      }
      results.deactivated = toDeactivate.length;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results,
        message: `Processed ${incomingEvents.length} events: ${results.created} created, ${results.updated} updated, ${results.deactivated} deactivated`,
      }),
    };
  } catch (error) {
    console.error('Receive events error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to receive events',
        message: error.message,
      }),
    };
  }
};
