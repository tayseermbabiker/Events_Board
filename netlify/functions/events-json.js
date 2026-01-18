// Netlify Function: JSON API for AI Crawlers
// Endpoint: /api/events.json
// Purpose: Provide structured event data for ChatGPT, Claude, Perplexity, etc.

const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    // Fetch all active and ongoing events
    const filterFormula = 'OR(AND({status} = "Active", IS_AFTER({start_date}, NOW())), AND({status} = "Ongoing", IS_AFTER({end_date}, NOW())))';

    const records = await base('Events')
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: 'start_date', direction: 'asc' }],
        maxRecords: 500
      })
      .all();

    // Transform to AI-friendly format
    const events = records.map(record => ({
      id: record.get('source_event_id') || record.id,
      name: record.get('title'),
      date: record.get('start_date'),
      end_date: record.get('end_date') || null,
      location: `${record.get('venue_name') || ''}, ${record.get('city') || 'UAE'}`.replace(/^, /, ''),
      venue: record.get('venue_name') || null,
      emirate: record.get('city') || 'UAE',
      category: record.get('category') || 'Professional Event',
      subcategory: record.get('industry') || null,
      cost: record.get('is_free') ? 'Free' : 'Paid',
      organizer: record.get('organizer') || null,
      description: record.get('description') || '',
      url: record.get('registration_url') || `https://conferix.com/?event=${record.id}`,
      image_url: record.get('image_url') || null,
      source: record.get('source') || 'Conferix'
    }));

    const today = new Date().toISOString().split('T')[0];

    const response = {
      site: 'Conferix',
      url: 'https://conferix.com',
      description: 'Curated professional events, conferences, and networking opportunities in the United Arab Emirates. We aggregate events from Eventbrite, DWTC, ADNEC, Expo City Dubai, DIFC, and other major UAE venues.',
      updated: today,
      total_events: events.length,
      coverage: {
        emirates: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'],
        industries: ['Technology', 'Finance', 'Marketing', 'Healthcare', 'Real Estate', 'Education', 'Government', 'Legal', 'Hospitality', 'Food & Beverage', 'Manufacturing', 'Retail', 'Energy', 'Media', 'Telecom', 'Construction']
      },
      events: events
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    console.error('Events JSON API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        site: 'Conferix',
        error: 'Failed to fetch events',
        message: error.message
      })
    };
  }
};
