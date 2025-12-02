# n8n Scraper Build Instructions for Perplexity

## Context

I'm building a UAE professional events aggregator. I have a working n8n workflow that scrapes Dubai Chamber events using OpenAI to parse HTML and saves to Airtable.

I need you to help me build scrapers for additional sources, ONE AT A TIME.

---

## My Working Pattern (Dubai Chamber)

```
Manual Trigger
    → HTTP Request (fetch page HTML)
    → OpenAI GPT-4 (extract events from HTML)
    → Split Events (split array into individual items)
    → Transform to Schema (map fields)
    → Code in JavaScript (dedupe check)
    → Airtable (create or update record)
```

**Key elements:**
- OpenAI extracts structured event data from raw HTML
- Events are checked against existing records to prevent duplicates
- Each event is saved to Airtable with consistent schema

---

## My Airtable Schema

Each event needs these fields:
```
- title (text)
- description (text)
- start_date (date)
- end_date (date)
- venue_name (text)
- city (single select: Dubai, Abu Dhabi, Sharjah, etc.)
- industry (single select: Technology, Finance, Healthcare, etc.)
- organizer (text)
- registration_url (URL)
- is_free (checkbox)
- image_url (URL)
- source (text) - e.g., "DIFC", "Dubai Chamber"
- source_event_id (text) - unique ID from source for deduplication
- status (single select: pending, approved)
```

---

## Sources to Build (In Order)

### Source 1: DIFC Events
- **URL**: https://www.difc.com/whats-on/events
- **Type**: Finance, Legal, Fintech events
- **City**: Dubai
- **Expected events**: 10-15 per month
- **Build this first**

### Source 2: ADGM Events
- **URL**: https://www.adgm.com/events
- **Type**: Finance, Legal events
- **City**: Abu Dhabi
- **Expected events**: 5-10 per month
- **Build this second**

### Source 3: 10times UAE
- **URL**: https://10times.com/unitedarabemirates
- **Type**: All professional events
- **City**: Various
- **Challenge**: Has pagination - need to scrape multiple pages
- **Expected events**: 50+ per month
- **Build this third**

### Source 4: DWTC (Dubai World Trade Centre)
- **URL**: https://www.dwtc.com/en/events/
- **Type**: Exhibitions, conferences
- **City**: Dubai
- **Expected events**: 30-50 per month
- **Build this fourth**

### Source 5: ADNEC (Abu Dhabi)
- **URL**: https://www.adnec.ae/en/eventlisting
- **Type**: Exhibitions, conferences
- **City**: Abu Dhabi
- **Expected events**: 20-30 per month
- **Build this fifth**

---

## Instructions for Each Source

When building each scraper, please:

1. **Fetch the page** using HTTP Request node
   - If page uses JavaScript rendering, advise on alternatives

2. **Use OpenAI to extract events** with a prompt like:
   ```
   Extract all events from this HTML. For each event return:
   - title
   - description (if available)
   - start_date (ISO format)
   - end_date (ISO format, if available)
   - venue_name
   - registration_url (full URL)
   - image_url (if available)
   - organizer (if available)
   - is_free (true/false if mentioned)

   Return as JSON array.
   ```

3. **Map the fields** to my Airtable schema, including:
   - Set `source` field to the source name (e.g., "DIFC")
   - Set `city` based on the source
   - Set `status` to "pending" for manual review
   - Generate `source_event_id` from URL or title+date combo

4. **Add deduplication logic**:
   - Before inserting, check if `source_event_id` already exists in Airtable
   - Skip if exists, insert if new

5. **Handle errors gracefully**:
   - If page fetch fails, don't crash the whole workflow
   - Log errors for review

---

## Important Notes

- Build ONE scraper at a time
- Test each scraper before moving to the next
- Wait for my confirmation that it works before proceeding
- If a site has pagination, explain how to handle it
- If a site is JavaScript-rendered and HTTP Request doesn't work, suggest alternatives

---

## Let's Start

Please build the **DIFC Events scraper** first.

URL: https://www.difc.com/whats-on/events

Show me:
1. The n8n workflow structure (node by node)
2. The HTTP Request configuration
3. The OpenAI prompt for extraction
4. The JavaScript code for deduplication
5. The Airtable node configuration

Once I confirm DIFC works, we'll move to ADGM.
