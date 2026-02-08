# UAE Pro Events: 18-Month Budget Analysis

## Your Current Costs
- **Apify + n8n**: $24/month (as you stated)
- Let's build from here

---

## Scenario A: Minimum Viable Budget (Scraping-Light)

**Strategy**: Minimize scraping, maximize direct submissions early

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Netlify Hosting | $0 | Free tier (sufficient for years) |
| Airtable | $0 | Free tier (1,200 records) |
| n8n on Railway | $5-7 | Self-hosted, SQLite |
| Apify | $0 | Free tier ($5 credit/month) |
| Buttondown Email | $0 → $9 | Free to 100 subs, then $9/mo |
| Plausible Analytics | $9 | Optional (can use free Umami) |
| Domain | $1 | ~$12/year |

### Monthly Totals

| Phase | Months | Monthly | Total |
|-------|--------|---------|-------|
| Month 1-3 | 3 | $6 | $18 |
| Month 4-6 | 3 | $15 | $45 |
| Month 7-12 | 6 | $24 | $144 |
| Month 13-18 | 6 | $35 | $210 |

**18-Month Total: ~$417**

### What You Get
- Basic scraping (Dubai Chamber, free Apify credits)
- Email list up to 500 subscribers
- Relies heavily on direct submissions
- Manual work to supplement scrapers

### Risks
- Limited event inventory early on
- Slower growth
- More manual effort

---

## Scenario B: Your Current Setup (Balanced)

**Strategy**: Apify + n8n as you have now, scale email as needed

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Netlify Hosting | $0 | Free tier |
| Airtable | $0 → $20 | Free → Pro at 1,200 records |
| n8n on Railway | $5-7 | Self-hosted |
| Apify Starter | $0 → $39 | Free tier → Starter when needed |
| Buttondown | $0 → $9 | Free → Paid at 100 subs |
| Plausible | $9 | Analytics |
| Domain | $1 | |

### Monthly Totals

| Phase | Months | Monthly | Total |
|-------|--------|---------|-------|
| Month 1-3 | 3 | $24 | $72 |
| Month 4-6 | 3 | $24 | $72 |
| Month 7-9 | 3 | $55 | $165 |
| Month 10-12 | 3 | $75 | $225 |
| Month 13-15 | 3 | $75 | $225 |
| Month 16-18 | 3 | $85 | $255 |

**18-Month Total: ~$1,014**

### What You Get
- Eventbrite UAE via Apify
- Facebook Events via Apify (shared credits)
- Multiple scrapers running
- Growing email list
- Good event inventory

### Breakdown by Service (18 months)
- Apify: ~$350 (free first 6mo, then $39/mo)
- n8n Railway: ~$108 ($6/mo average)
- Airtable: ~$180 (free 6mo, then $20/mo)
- Buttondown: ~$100 (free 3mo, then $9/mo)
- Plausible: ~$162 ($9/mo)
- Domain: ~$24
- **Buffer (10%)**: ~$90

---

## Scenario C: Growth-Focused Budget

**Strategy**: Invest more upfront for faster growth

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Netlify | $0 → $19 | Free → Pro (USA expansion) |
| Airtable Pro | $20 | From start |
| n8n Cloud | $20 | Managed, reliable |
| Apify Starter | $39 | Full scraping power |
| ConvertKit | $29 | Better email automation |
| Plausible | $9 | Analytics |
| Domain(s) | $2 | UAE + USA domains |

### Monthly Totals

| Phase | Months | Monthly | Total |
|-------|--------|---------|-------|
| Month 1-6 | 6 | $100 | $600 |
| Month 7-12 | 6 | $120 | $720 |
| Month 13-18 | 6 | $140 | $840 |

**18-Month Total: ~$2,160**

### What You Get
- Robust scraping from day 1
- Professional email marketing
- Ready for USA expansion
- Minimal maintenance time
- Faster growth potential

---

## Detailed Cost Breakdown: Apify

Since Apify is your main scraping cost, here's what $39/month gets you:

| Apify $39 Starter Plan | Included |
|------------------------|----------|
| Platform credits | $39 worth |
| Compute units | ~97 CU ($0.40/CU) |
| Actor memory | 32GB |
| Proxy bandwidth | ~$8/GB |

### What You Can Scrape with $39/month

| Source | Runs/Month | CU Cost | Monthly Cost |
|--------|------------|---------|--------------|
| Eventbrite UAE | 30 (daily) | ~0.5 CU | ~$6 |
| Facebook Events | 8 (2x/week) | ~1.0 CU | ~$8 |
| LinkedIn Events | 8 (2x/week) | ~1.5 CU | ~$12 |
| **Total** | | | **~$26** |

You'd have ~$13 buffer for proxy costs and additional scraping.

### Apify Free Tier Alternative

| Free Tier | Limit |
|-----------|-------|
| Monthly credits | $5 |
| What you can do | ~12 Eventbrite runs OR ~5 Facebook runs |

**Verdict**: Free tier is too limited for reliable scraping. $39/month is the practical minimum for Apify.

---

## Alternative: Skip Apify, Go Manual + Direct

**What if you can't afford Apify?**

| Source | Method | Cost |
|--------|--------|------|
| Dubai Chamber | n8n scraper (you built) | $0 |
| DIFC Events | n8n scraper | $0 |
| Government sites | n8n scraper | $0 |
| Meetup | OAuth API (manual setup) | $0 |
| Direct submissions | Organizer outreach | $0 |
| Manual entry | You add events yourself | $0 (time cost) |

### The Math

If you can get:
- 20 events/month from Dubai Chamber
- 10 events/month from DIFC
- 10 events/month from government sites
- 15 events/month from Meetup
- 20 events/month from direct submissions
- 10 events/month manual entry

**= 85 events/month without Apify**

This is viable for UAE. You'd miss Eventbrite and Facebook events, but direct submissions can fill the gap over time.

---

## My Recommendation: Hybrid Approach

### Months 1-6: Bootstrap Mode ($15-24/month)

| Service | Cost |
|---------|------|
| n8n Railway | $6 |
| Apify Free | $0 (use $5 credit strategically) |
| Buttondown Free | $0 |
| Airtable Free | $0 |
| Plausible | $9 (or free Umami) |
| **Total** | **$15/month** |

**Focus**:
- Build n8n scrapers for free sources (Dubai Chamber, DIFC, govt sites)
- Use Apify free credits for occasional Eventbrite scrapes
- Heavy push on direct submissions (goal: 30 organizers by month 6)

### Months 7-12: Growth Mode ($50-75/month)

| Service | Cost |
|---------|------|
| n8n Railway | $7 |
| Apify Starter | $39 |
| Buttondown | $9 |
| Airtable Free/Pro | $0-20 |
| Plausible | $9 |
| **Total** | **$64-84/month** |

**Focus**:
- Full Apify scraping (Eventbrite, Facebook)
- Growing email list
- First revenue should offset costs

### Months 13-18: Scale Mode ($75-100/month)

| Service | Cost |
|---------|------|
| n8n Cloud | $20 |
| Apify Starter | $39 |
| ConvertKit | $29 |
| Airtable Pro | $20 |
| Plausible | $9 |
| Extra domain (USA) | $1 |
| **Total** | **$118/month** |

**Focus**:
- USA expansion
- Revenue should exceed costs
- Consider VA ($500/month) if revenue supports

---

## 18-Month Cash Flow Projection

### Conservative (Scenario B)

| Month | Costs | Revenue | Net | Cumulative |
|-------|-------|---------|-----|------------|
| 1-3 | $72 | $0 | -$72 | -$72 |
| 4-6 | $72 | $50 | -$22 | -$94 |
| 7-9 | $165 | $150 | -$15 | -$109 |
| 10-12 | $225 | $400 | +$175 | +$66 |
| 13-15 | $225 | $600 | +$375 | +$441 |
| 16-18 | $255 | $900 | +$645 | +$1,086 |

**Break-even: Month 10-11**
**18-month profit: ~$1,000**

### Optimistic

| Month | Costs | Revenue | Net | Cumulative |
|-------|-------|---------|-----|------------|
| 1-3 | $72 | $0 | -$72 | -$72 |
| 4-6 | $72 | $100 | +$28 | -$44 |
| 7-9 | $165 | $300 | +$135 | +$91 |
| 10-12 | $225 | $700 | +$475 | +$566 |
| 13-15 | $225 | $1,200 | +$975 | +$1,541 |
| 16-18 | $255 | $2,000 | +$1,745 | +$3,286 |

**Break-even: Month 5-6**
**18-month profit: ~$3,300**

---

## Summary: What You Need to Start

### Absolute Minimum (Months 1-6)
| Item | Cost |
|------|------|
| n8n Railway | $36 (6 months) |
| Domain | $12 |
| Optional: Plausible | $54 |
| **Total** | **$48-102** |

### Recommended (Months 1-6)
| Item | Cost |
|------|------|
| n8n Railway | $36 |
| Apify (from month 3) | $156 (4 months) |
| Buttondown (from month 4) | $27 (3 months) |
| Domain | $12 |
| Plausible | $54 |
| **Total** | **~$285** |

### Full 18 Months (Scenario B)
**Total investment needed: ~$1,000-1,200**

---

## Decision Framework

| Your Budget | Recommendation |
|-------------|----------------|
| < $50/month | Scenario A (scraping-light, direct submissions focus) |
| $50-75/month | Scenario B (your current $24 + grow gradually) |
| $100+/month | Scenario C (faster growth, less manual work) |

### Key Question

**Can you afford $50-75/month for months 7-18?**

If yes → Scenario B is your path
If no → Scenario A (slower but viable)

---

## Sources

- [Apify Pricing](https://apify.com/pricing)
- [n8n Pricing](https://n8n.io/pricing/)
- [Railway Pricing](https://railway.com/pricing)
- [Buttondown Pricing](https://buttondown.com/pricing)
- [Self-host n8n guide](https://www.vibepanda.io/resources/guide/self-host-n8n)
