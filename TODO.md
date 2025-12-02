# TODO - UAE Professional Events

## Airtable Setup Required

### Add these columns to Events table (if not already present):
- [ ] `contact_email` - Email field (for organizer follow-up, not displayed publicly)
- [ ] `submitted_at` - Date field (when event was submitted)
- [ ] `source_event_id` - Text field (for deduplication - unique ID per event)
- [ ] `status` - Single select: pending, approved (to filter submitted events)

---

## Pending Tasks

### n8n Scrapers (building with Comet)
- [ ] DIFC Events scraper
- [ ] ADGM Events scraper
- [ ] 10times UAE scraper
- [ ] DWTC scraper
- [ ] ADNEC scraper
- [ ] Add deduplication logic to all scrapers

### Site Features
- [ ] SEO meta tags and schema markup
- [ ] Social sharing buttons on event cards
- [ ] Analytics setup

---

## Completed
- [x] Newsletter signup with Beehiiv
- [x] Industry segmentation for subscribers
- [x] Event submission form (/submit.html)
- [x] Dubai Chamber scraper
- [x] Meetup scraper (with professional filter)
