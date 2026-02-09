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
    // Parse incoming events from n8n
    const incomingEvents = JSON.parse(event.body);

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
          scraped_at: toDate(new Date().toISOString())
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results: results,
        message: `Processed ${incomingEvents.length} events: ${results.created} created, ${results.updated} updated`
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
