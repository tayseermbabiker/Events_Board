// Netlify Function: Track Affiliate Booking Clicks
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
    // Parse tracking data
    const trackingData = JSON.parse(event.body);

    // Validate required fields
    if (!trackingData.event_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Event ID is required' })
      };
    }

    // Initialize Airtable
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    const bookingsTable = base('Bookings');

    // Create booking record
    await bookingsTable.create({
      event_id: [trackingData.event_id], // Link to Events table
      user_id: trackingData.user_id ? [trackingData.user_id] : undefined, // Link to Users table (if logged in)
      user_email: trackingData.user_email || '',
      click_timestamp: trackingData.timestamp || new Date().toISOString(),
      status: 'clicked', // Can be updated to 'completed' via webhook later
      source: 'web_app'
    });

    // Also increment click count on the event record
    try {
      const eventsTable = base('Events');
      const eventRecord = await eventsTable.find(trackingData.event_id);
      const currentClicks = eventRecord.get('click_count') || 0;

      await eventsTable.update(trackingData.event_id, {
        click_count: currentClicks + 1,
        last_clicked_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to update event click count:', err);
      // Don't fail the whole request if this fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Booking tracked successfully'
      })
    };

  } catch (error) {
    console.error('Track booking error:', error);

    // Don't fail the request even if tracking fails
    // This ensures user can still proceed to booking
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Tracking failed',
        message: error.message
      })
    };
  }
};
