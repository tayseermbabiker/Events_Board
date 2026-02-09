import { schedule } from '@netlify/functions';
import Airtable from 'airtable';
import { Resend } from 'resend';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.URL || 'https://conferix.com';

function getIndustryColor(industry) {
  const colors = {
    'Tech & AI': '#0EA5E9',
    'Finance': '#10B981',
    'Legal': '#8B5CF6',
    'Healthcare': '#EF4444',
    'Real Estate & Construction': '#F59E0B',
    'Hospitality & F&B': '#EC4899',
    'Energy & Government': '#6366F1',
    'Startups': '#14B8A6',
    'General': '#64748B',
  };
  return colors[industry] || '#64748B';
}

function buildAlertEmail(name, events, unsubToken) {
  const displayName = name || 'there';
  const unsubUrl = `${SITE_URL}/unsubscribe.html?token=${unsubToken}`;

  const eventCards = events.map(ev => `
    <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0 0 4px;font-size:17px;font-weight:600;color:#0B1426;">${ev.title}</p>
            <p style="margin:0 0 4px;font-size:13px;color:#64748b;">
              ${ev.start_date || 'TBA'} &middot; ${ev.city || 'UAE'}
              &middot; <span style="color:${getIndustryColor(ev.industry)};font-weight:600;">${ev.industry || 'General'}</span>
            </p>
            ${ev.venue_name ? `<p style="margin:0 0 4px;font-size:13px;color:#94a3b8;">${ev.venue_name}</p>` : ''}
          </td>
          <td width="100" align="right" valign="middle">
            <a href="${ev.registration_url || SITE_URL}" style="display:inline-block;padding:8px 16px;background:#1E3A5F;color:#ffffff;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none;">
              ${ev.is_free ? 'Free' : 'Register'}
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  `).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#0B1426,#1C2333);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Conferix <span style="color:#D4A853;">UAE</span></p>
          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">Your Weekly Event Digest</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:24px;">
          <p style="margin:0 0 16px;font-size:16px;color:#0B1426;">Hey ${displayName}, here are ${events.length} new event${events.length > 1 ? 's' : ''} matching your preferences:</p>
        </td></tr>
        <tr><td style="background:#ffffff;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${eventCards}
          </table>
        </td></tr>
        <tr><td style="background:#ffffff;padding:24px;text-align:center;">
          <a href="${SITE_URL}" style="display:inline-block;padding:12px 32px;background:#D4A853;color:#0B1426;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;">View All Events</a>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 24px;border-radius:0 0 12px 12px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">You're receiving this because you subscribed to Conferix UAE alerts.</p>
          <p style="margin:0;font-size:12px;"><a href="${unsubUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function getAllRecords(table, options) {
  const records = [];
  await table.select(options).eachPage((page, fetchNextPage) => {
    records.push(...page);
    fetchNextPage();
  });
  return records;
}

const handler = async () => {
  console.log('Send alerts triggered at', new Date().toISOString());

  try {
    const subscribers = await getAllRecords(base('Subscribers'), {
      filterByFormula: '{is_active} = TRUE()',
    });

    if (subscribers.length === 0) {
      console.log('No active subscribers');
      return { statusCode: 200, body: 'No active subscribers' };
    }

    const today = new Date().toISOString().split('T')[0];
    const events = await getAllRecords(base('Events'), {
      filterByFormula: `{start_date} >= '${today}'`,
      sort: [{ field: 'start_date', direction: 'asc' }],
    });

    if (events.length === 0) {
      console.log('No future events');
      return { statusCode: 200, body: 'No future events' };
    }

    let sentCount = 0;

    for (const sub of subscribers) {
      const email = sub.get('email');
      const name = sub.get('first_name');
      const citiesPref = sub.get('cities') || '';
      const industriesPref = sub.get('industries') || '';
      const lastAlerted = sub.get('last_alerted_at') || '2000-01-01';
      const unsubToken = sub.get('unsubscribe_token');

      const cityList = citiesPref.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const industryList = industriesPref.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

      const matching = events.filter(ev => {
        const created = ev._rawJson.createdTime.split('T')[0];
        if (created <= lastAlerted) return false;

        const evCity = (ev.get('city') || '').toLowerCase();
        const evIndustry = (ev.get('industry') || '').toLowerCase();

        if (cityList.length > 0 && !cityList.includes(evCity)) return false;
        if (industryList.length > 0 && !industryList.includes(evIndustry)) return false;

        return true;
      });

      if (matching.length === 0) continue;

      const eventData = matching.slice(0, 20).map(ev => ({
        title: ev.get('title'),
        start_date: ev.get('start_date'),
        city: ev.get('city'),
        industry: ev.get('industry'),
        venue_name: ev.get('venue_name'),
        is_free: ev.get('is_free'),
        registration_url: ev.get('registration_url'),
      }));

      try {
        await resend.emails.send({
          from: 'Conferix UAE <onboarding@resend.dev>',
          to: email,
          subject: `${matching.length} New UAE Events This Week — Conferix`,
          html: buildAlertEmail(name, eventData, unsubToken),
        });

        await base('Subscribers').update(sub.id, { last_alerted_at: today });
        sentCount++;
      } catch (emailErr) {
        console.error(`Failed to send to ${email}:`, emailErr.message);
      }
    }

    console.log(`Sent ${sentCount} alert emails`);
    return { statusCode: 200, body: `Sent ${sentCount} alerts` };

  } catch (err) {
    console.error('Send alerts error:', err);
    return { statusCode: 500, body: err.message };
  }
};

export default schedule('0 13 * * 1', handler);
