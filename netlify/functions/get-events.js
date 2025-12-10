// Netlify Function: Get Events from Airtable
const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Initialize Airtable
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const month = params.month; // Format: YYYY-MM
    const industry = params.industry;
    const cost = params.cost; // 'free' or 'paid'
    const city = params.city;

    // Build Airtable filter formula
    // Status is now a formula that returns "Active", "Expired", or "Ongoing"
    // Include both "Active" and "Ongoing" events
    let filterFormula = 'AND(OR({status} = "Active", {status} = "Ongoing"), IS_AFTER({start_date}, NOW())';

    // Filter by month
    if (month) {
      filterFormula += `, IS_SAME(DATETIME_PARSE({start_date}), DATETIME_PARSE("${month}-01"), "month")`;
    }

    // Filter by industry
    if (industry) {
      filterFormula += `, {industry} = "${industry}"`;
    }

    // Filter by cost
    if (cost) {
      if (cost === 'free') {
        filterFormula += `, {is_free} = TRUE()`;
      } else if (cost === 'paid') {
        filterFormula += `, {is_free} = FALSE()`;
      }
    }

    // Filter by city
    if (city) {
      filterFormula += `, {city} = "${city}"`;
    }

    filterFormula += ')';

    // Fetch events from Airtable
    const records = await base('Events')
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: 'start_date', direction: 'asc' }],
        maxRecords: 100
      })
      .all();

    // Transform records to clean JSON
    const events = records.map(record => ({
      id: record.id,
      title: record.get('title'),
      description: record.get('description'),
      start_date: record.get('start_date'),
      end_date: record.get('end_date'),
      venue_name: record.get('venue_name'),
      venue_address: record.get('venue_address'),
      city: record.get('city'),
      organizer: record.get('organizer'),
      industry: record.get('industry'),
      tags: record.get('tags') || [],
      is_free: record.get('is_free') || false,
      capacity: record.get('capacity'),
      registration_url: record.get('registration_url'),
      image_url: record.get('image_url'),
      source: record.get('source')
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        events: events,
        count: events.length
      })
    };

  } catch (error) {
    console.error('Get events error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch events',
        message: error.message
      })
    };
  }
};
