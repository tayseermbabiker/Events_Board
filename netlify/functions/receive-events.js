// Netlify Function: Receive Events from n8n Webhook
const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Accept either legacy array payload or new { source, events } object
    const parsed = JSON.parse(event.body);
    const isBatchPayload = parsed && !Array.isArray(parsed) && Array.isArray(parsed.events);
    const incomingEvents = isBatchPayload ? parsed.events : parsed;
    const batchSource = isBatchPayload ? parsed.source : null;

    if (!Array.isArray(incomingEvents) || incomingEvents.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid events data' })
      };
    }

    // Initialize Airtable
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    const eventsTable = base('Events');

    // Process each event
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const eventData of incomingEvents) {
      try {
        // Check if event already exists (by source_event_id)
        const existingRecords = await eventsTable
          .select({
            filterByFormula: `{source_event_id} = "${eventData.source_event_id}"`,
            maxRecords: 1
          })
          .firstPage();

        // Strip time from dates — Airtable date fields reject ISO timestamps
        const toDate = (val) => val ? val.split('T')[0] : null;

        // Map granular scraper industries to consolidated categories
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

        // Prepare event record
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
          scraped_at: toDate(new Date().toISOString()),
          is_active: true
        };

        if (existingRecords.length > 0) {
          // Update existing record
          await eventsTable.update(existingRecords[0].id, eventRecord);
          results.updated++;
        } else {
          // Create new record
          await eventsTable.create(eventRecord);
          results.created++;
        }

      } catch (err) {
        console.error('Error processing event:', err);
        results.errors.push({
          event: eventData.title,
          error: err.message
        });
      }
    }

    // Withdrawal sweep: if this batch is scoped to one source and returned
    // enough events to trust, deactivate any rows from that source whose
    // source_event_id wasn't in this scrape.
    const MIN_EVENTS_FOR_SWEEP = 3;
    results.deactivated = 0;
    if (batchSource && incomingEvents.length >= MIN_EVENTS_FOR_SWEEP) {
      const seenIds = new Set(
        incomingEvents.map(e => e.source_event_id).filter(Boolean)
      );
      const existingForSource = await eventsTable
        .select({
          filterByFormula: `AND({source} = "${batchSource}", {is_active} = TRUE())`,
          fields: ['source_event_id']
        })
        .all();

      const toDeactivate = existingForSource
        .filter(r => !seenIds.has(r.get('source_event_id')))
        .map(r => ({ id: r.id, fields: { is_active: false } }));

      for (let i = 0; i < toDeactivate.length; i += 10) {
        await eventsTable.update(toDeactivate.slice(i, i + 10));
      }
      results.deactivated = toDeactivate.length;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results: results,
        message: `Processed ${incomingEvents.length} events: ${results.created} created, ${results.updated} updated, ${results.deactivated} deactivated`
      })
    };

  } catch (error) {
    console.error('Receive events error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to receive events',
        message: error.message
      })
    };
  }
};
