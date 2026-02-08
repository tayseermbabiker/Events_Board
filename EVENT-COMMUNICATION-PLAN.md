# Event Communication Plan - Weekly Email Automation

## Overview

Automated weekly emails to subscribers based on their interests (Finance, Tech, Healthcare, etc.) with smart event filtering to avoid repetition while ensuring no events are missed.

---

## The Problem

If "Abu Dhabi Finance Week" (December) shows up every week from August:
- Subscribers get bored seeing the same events
- Think "nothing new" and stop opening emails
- Eventually unsubscribe

## The Solution: Smart Hybrid Approach

Structure weekly emails with these sections:

| Section | What's Included | Why |
|---------|----------------|-----|
| **New This Week** | Events added in last 7 days | Fresh content, reason to open |
| **Happening Soon** | Events in next 2 weeks | Urgency, "book now" |
| **Registration Closing** | Events with deadlines approaching | FOMO trigger |
| **Save the Date** | Big events 1-3 months out (show ONCE when added, then again 1 month before) | Awareness without spam |

---

## Example Email Structure

```
Subject: This Week in UAE Finance Events (3 new + 2 happening soon)

---

🆕 NEW THIS WEEK
- DIFC FinTech Meetup (Jan 25)
- Banking Innovation Summit (Feb 3)

📅 HAPPENING SOON
- MEA Finance Awards (Jan 18) ← 5 days left
- Crypto Regulation Panel (Jan 20)

⏰ REGISTRATION CLOSING
- Abu Dhabi Finance Week (Mar 15) ← Early bird ends Jan 22!

💾 SAVE THE DATE (New)
- Dubai FinTech Summit (May 10) ← Just announced

---

[View All Finance Events →]
```

---

## Event Display Logic

```
Show event IF:
- Added in last 7 days (NEW) OR
- Happening in next 14 days (SOON) OR
- Registration deadline in next 7 days (CLOSING) OR
- First time subscriber sees it (SAVE THE DATE)
```

---

## Technical Implementation

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Airtable  │ ──▶ │    n8n      │ ──▶ │   Beehiiv   │
│   (Events)  │     │  (Logic +   │     │   (Send)    │
│             │     │   Format)   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Step 1: Airtable - Add Tracking Fields

Add these fields to Events table:

| Field | Type | Purpose |
|-------|------|---------|
| `created_date` | Date | Know when event was added |
| `event_date` | Date | When event happens |
| `registration_deadline` | Date | Early bird / closing dates |
| `sent_in_newsletter` | Checkbox | Track if already featured in "Save the Date" |
| `industry` | Multi-select | Finance, Tech, Healthcare, etc. |

### Step 2: n8n Workflow (Weekly - Monday 8am)

```
Trigger (Cron: Monday 8am)
    │
    ▼
For Each Industry Segment:
    │
    ├── Query Airtable: "NEW THIS WEEK"
    │   → Filter: created_date >= 7 days ago AND industry = {segment}
    │
    ├── Query Airtable: "HAPPENING SOON"
    │   → Filter: event_date between today and +14 days AND industry = {segment}
    │
    ├── Query Airtable: "REGISTRATION CLOSING"
    │   → Filter: registration_deadline between today and +7 days AND industry = {segment}
    │
    ├── Query Airtable: "SAVE THE DATE"
    │   → Filter: sent_in_newsletter = false AND event_date > +14 days AND industry = {segment}
    │   → Then mark sent_in_newsletter = true
    │
    ▼
Format HTML Email (Code Node)
    │
    ▼
Send via Beehiiv API to segment
```

### Step 3: Beehiiv API Call

```javascript
// HTTP Request Node in n8n
POST https://api.beehiiv.com/v2/publications/{pub_id}/posts

Headers:
  Authorization: Bearer {BEEHIIV_API_KEY}
  Content-Type: application/json

Body:
{
  "title": "This Week in UAE Finance Events",
  "subtitle": "3 new events + 2 happening soon",
  "content_html": "<formatted HTML from previous node>",
  "status": "published",
  "send_to": "segment_finance"
}
```

### Step 4: Beehiiv Segments Setup

In Beehiiv dashboard:
1. **Audience** → **Segments**
2. Create segments based on custom fields:
   - `interest = Finance`
   - `interest = Technology`
   - `interest = Healthcare`
   - `interest = Real Estate`
   - `interest = Startups`
   - etc.

Subscribers choose interests at signup or via preference center.

---

## Subscriber Segments

| Segment | Industries Included |
|---------|---------------------|
| Finance | Finance, Fintech, Banking, Investment |
| Technology | Tech, AI, Software, Startups |
| Healthcare | Medical, Pharma, Health |
| Business | General business, Trade, Chambers |
| Real Estate | Property, Construction |
| All Events | Everything (for power users) |

---

## Email Frequency Options

| Option | Frequency | Best For |
|--------|-----------|----------|
| Weekly Digest | Every Monday | Most subscribers |
| Real-time Alerts | As events are added | Power users |
| Monthly Roundup | 1st of month | Casual users |

Start with **Weekly Digest** for all, add others later.

---

## KPIs to Track

| Metric | Target | How to Track |
|--------|--------|--------------|
| Open Rate | >40% | Beehiiv analytics |
| Click Rate | >15% | Beehiiv analytics |
| Outbound Clicks | Track all | GA4 + custom events |
| Unsubscribe Rate | <1% | Beehiiv analytics |
| List Growth | +50/week | Beehiiv analytics |

---

## Alternative: Simpler RSS Approach

If full automation is too complex initially:

1. n8n generates RSS feed with this week's events
2. Beehiiv auto-sends from RSS weekly
3. Manual segment emails for special events

**Trade-off:** Loses smart sectioning (New / Soon / Closing) but much simpler.

---

## TODO

- [ ] Add tracking fields to Airtable
- [ ] Get Beehiiv API key
- [ ] Create subscriber segments in Beehiiv
- [ ] Build n8n workflow
- [ ] Design HTML email template
- [ ] Test with small segment first
- [ ] Launch weekly automation

---

## Resources

- Beehiiv API Docs: https://developers.beehiiv.com/
- n8n Beehiiv Node: Use HTTP Request node
- Airtable API: Already configured in project

---

*Created: December 2024*
*Status: Planning*
