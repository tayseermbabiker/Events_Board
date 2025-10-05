// Netlify Function: Optional Quick Login (Email Collection)
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
    // Parse user data
    const userData = JSON.parse(event.body);

    // Validate required fields
    if (!userData.email || !userData.first_name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and name are required' })
      };
    }

    // Initialize Airtable
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    const usersTable = base('Users');

    // Check if user already exists
    const existingUsers = await usersTable
      .select({
        filterByFormula: `{email} = "${userData.email}"`,
        maxRecords: 1
      })
      .firstPage();

    let userRecord;

    if (existingUsers.length > 0) {
      // User exists, update last login
      userRecord = await usersTable.update(existingUsers[0].id, {
        last_login: new Date().toISOString()
      });

    } else {
      // Create new user
      userRecord = await usersTable.create({
        first_name: userData.first_name,
        last_name: userData.last_name || '',
        email: userData.email,
        source: userData.source || 'web_optional_login',
        subscription_status: 'active',
        subscription_tier: 'free',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      });
    }

    // Return user data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: {
          id: userRecord.id,
          first_name: userRecord.get('first_name'),
          email: userRecord.get('email')
        },
        message: existingUsers.length > 0 ? 'Welcome back!' : 'Account created successfully'
      })
    };

  } catch (error) {
    console.error('Login error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Login failed',
        message: error.message
      })
    };
  }
};
