// Event Submission Handler - Save to Airtable for review
const Airtable = require('airtable');

exports.handler = async (event) => {
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

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const data = JSON.parse(event.body);

        // Validate required fields
        const required = ['title', 'description', 'start_date', 'start_time', 'industry', 'city', 'venue_name', 'registration_url', 'organizer', 'contact_email'];
        for (const field of required) {
            if (!data[field]) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: `${field.replace('_', ' ')} is required` })
                };
            }
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contact_email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid email address' })
            };
        }

        // Validate URL format
        try {
            new URL(data.registration_url);
        } catch {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid registration URL' })
            };
        }

        // Initialize Airtable
        const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
            .base(process.env.AIRTABLE_BASE_ID);

        // Combine date and time into ISO format
        const startDateTime = `${data.start_date}T${data.start_time}:00`;
        let endDateTime = null;
        if (data.end_date && data.end_time) {
            endDateTime = `${data.end_date}T${data.end_time}:00`;
        } else if (data.end_time) {
            endDateTime = `${data.start_date}T${data.end_time}:00`;
        }

        // Create event record with status "pending"
        const record = await base('Events').create({
            title: data.title,
            description: data.description,
            start_date: startDateTime,
            end_date: endDateTime,
            industry: data.industry,
            city: data.city,
            venue_name: data.venue_name,
            venue_address: data.venue_address || '',
            registration_url: data.registration_url,
            image_url: data.image_url || '',
            is_free: data.is_free || false,
            organizer: data.organizer,
            contact_email: data.contact_email,
            source: 'User Submission',
            source_event_id: `submission-${Date.now()}`,
            status: 'pending',
            submitted_at: new Date().toISOString()
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Event submitted for review',
                id: record.id
            })
        };

    } catch (error) {
        console.error('Event submission error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Server error. Please try again.' })
        };
    }
};
