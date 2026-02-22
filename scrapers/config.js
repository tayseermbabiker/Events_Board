module.exports = {
  webhookUrl: process.env.WEBHOOK_URL || 'https://conferix.com/uae/.netlify/functions/receive-events',

  browser: {
    headless: true,
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },

  batch: {
    size: 5,
    delayMs: 1000,
  },

  scrapers: {
    eventbrite: { enabled: true },
    difc:      { enabled: true },
    adgm:      { enabled: true },
    meetup:    { enabled: false },
    dwtc:      { enabled: true },
    adnec:     { enabled: true },
    terrapinn: { enabled: true },
    informa:   { enabled: true },
    dmg:       { enabled: true },
    expocity:  { enabled: true },
  },

  validCities: [
    'Dubai',
    'Abu Dhabi',
    'Sharjah',
    'Ajman',
    'Ras Al Khaimah',
    'Fujairah',
    'Umm Al Quwain',
  ],

  validIndustries: [
    'Technology',
    'Finance',
    'Healthcare',
    'Real Estate',
    'Energy',
    'Education',
    'Marketing',
    'Legal',
    'HR',
    'Logistics',
    'Hospitality',
    'Retail',
    'Media',
    'Government',
    'Sustainability',
    'Startup',
    'AI',
    'General',
  ],
};
