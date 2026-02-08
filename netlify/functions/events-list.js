// Netlify Function: Server-rendered HTML Events List
// Endpoint: /events-list
// Purpose: Provide crawlable HTML for AI and search engines

const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
  };

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    const filterFormula = 'OR(AND({status} = "Active", IS_AFTER({start_date}, NOW())), AND({status} = "Ongoing", IS_AFTER({end_date}, NOW())))';

    const records = await base('Events')
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: 'start_date', direction: 'asc' }],
        maxRecords: 500
      })
      .all();

    const events = records.map(record => ({
      id: record.id,
      title: record.get('title'),
      description: record.get('description'),
      start_date: record.get('start_date'),
      end_date: record.get('end_date'),
      venue: record.get('venue_name'),
      city: record.get('city'),
      organizer: record.get('organizer'),
      industry: record.get('industry'),
      is_free: record.get('is_free'),
      registration_url: record.get('registration_url')
    }));

    // Group events by industry
    const eventsByIndustry = {};
    events.forEach(ev => {
      const industry = ev.industry || 'Other';
      if (!eventsByIndustry[industry]) {
        eventsByIndustry[industry] = [];
      }
      eventsByIndustry[industry].push(ev);
    });

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    // Generate JSON-LD for all events
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "UAE Professional Events and Conferences",
      "description": "Curated listing of professional events, conferences, and networking opportunities in UAE",
      "numberOfItems": events.length,
      "itemListElement": events.slice(0, 50).map((ev, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Event",
          "name": ev.title,
          "description": ev.description || '',
          "startDate": ev.start_date,
          "endDate": ev.end_date || ev.start_date,
          "eventStatus": "https://schema.org/EventScheduled",
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "location": {
            "@type": "Place",
            "name": ev.venue || 'TBA',
            "address": {
              "@type": "PostalAddress",
              "addressLocality": ev.city || 'UAE',
              "addressCountry": "AE"
            }
          },
          "organizer": ev.organizer ? {
            "@type": "Organization",
            "name": ev.organizer
          } : undefined,
          "offers": {
            "@type": "Offer",
            "price": ev.is_free ? "0" : "",
            "priceCurrency": "AED",
            "availability": "https://schema.org/InStock",
            "url": ev.registration_url || 'https://conferix.com'
          }
        }
      }))
    };

    // Generate HTML
    let eventsHtml = '';
    Object.keys(eventsByIndustry).sort().forEach(industry => {
      eventsHtml += `
      <section>
        <h2>${escapeHtml(industry)} Events</h2>
        ${eventsByIndustry[industry].map(ev => `
        <article itemscope itemtype="https://schema.org/Event">
          <h3 itemprop="name">${escapeHtml(ev.title)}</h3>
          <p><strong>Date:</strong> <time itemprop="startDate" datetime="${ev.start_date}">${formatDate(ev.start_date)}</time>${ev.end_date && ev.end_date !== ev.start_date ? ` - <time itemprop="endDate" datetime="${ev.end_date}">${formatDate(ev.end_date)}</time>` : ''}</p>
          <p><strong>Location:</strong> <span itemprop="location" itemscope itemtype="https://schema.org/Place"><span itemprop="name">${escapeHtml(ev.venue || 'TBA')}</span>, <span itemprop="address">${escapeHtml(ev.city || 'UAE')}</span></span></p>
          <p><strong>Industry:</strong> ${escapeHtml(ev.industry || 'Professional')}</p>
          <p><strong>Cost:</strong> ${ev.is_free ? 'Free' : 'Paid'}</p>
          ${ev.organizer ? `<p><strong>Organizer:</strong> <span itemprop="organizer">${escapeHtml(ev.organizer)}</span></p>` : ''}
          <p itemprop="description">${escapeHtml(ev.description || 'Professional event in UAE.')}</p>
          ${ev.registration_url ? `<p><a href="${escapeHtml(ev.registration_url)}" itemprop="url" target="_blank" rel="noopener">View Event Details & Register</a></p>` : ''}
        </article>
        `).join('')}
      </section>`;
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>All UAE Professional Events & Conferences - Conferix</title>
  <meta name="description" content="Complete listing of ${events.length} professional conferences and events in UAE. Find technology, finance, marketing, healthcare, and business events in Dubai, Abu Dhabi, and across all Emirates. Updated ${today}.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://conferix.com/events-list">

  <!-- Open Graph -->
  <meta property="og:title" content="All UAE Professional Events - Conferix">
  <meta property="og:description" content="${events.length} curated professional events across UAE. Technology, Finance, Marketing, Healthcare and more.">
  <meta property="og:url" content="https://conferix.com/events-list">
  <meta property="og:type" content="website">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  ${JSON.stringify(jsonLd)}
  </script>

  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { color: #8B5CF6; }
    h2 { color: #6D28D9; border-bottom: 2px solid #8B5CF6; padding-bottom: 8px; margin-top: 40px; }
    article { background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #8B5CF6; }
    h3 { margin-top: 0; color: #1f2937; }
    a { color: #8B5CF6; }
    .stats { background: #8B5CF6; color: white; padding: 15px 20px; border-radius: 8px; margin: 20px 0; }
    .back-link { display: inline-block; margin-bottom: 20px; }
    footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
  </style>
</head>
<body>
  <a href="https://conferix.com" class="back-link">&larr; Back to Conferix</a>

  <h1>UAE Professional Events & Conferences</h1>

  <div class="stats">
    <strong>${events.length} Events</strong> across Dubai, Abu Dhabi, Sharjah & all Emirates | Last updated: ${today}
  </div>

  <p>Conferix aggregates professional events from across the United Arab Emirates. We source events from Eventbrite, Dubai World Trade Centre (DWTC), Abu Dhabi National Exhibitions Company (ADNEC), Expo City Dubai, DIFC, ADGM, Dubai Chamber, and other major venues.</p>

  <p><strong>Industries covered:</strong> Technology, Finance, Marketing, Healthcare, Real Estate, Education, Government, Legal, Hospitality, Food & Beverage, Manufacturing, Retail, Transportation, Energy, Media, Telecom, Construction, Agriculture.</p>

  <p><strong>For event organizers:</strong> <a href="https://conferix.com/submit.html">Submit your event for free listing</a>.</p>

  ${eventsHtml}

  <footer>
    <p>&copy; 2025 Conferix. Curated professional events in UAE.</p>
    <p>API available at <a href="/api/events.json">/api/events.json</a> for developers and AI tools.</p>
  </footer>
</body>
</html>`;

    return {
      statusCode: 200,
      headers,
      body: html
    };

  } catch (error) {
    console.error('Events list error:', error);
    return {
      statusCode: 500,
      headers,
      body: `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error loading events</h1><p>${escapeHtml(error.message)}</p><p><a href="https://conferix.com">Return to Conferix</a></p></body></html>`
    };
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return 'TBA';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
