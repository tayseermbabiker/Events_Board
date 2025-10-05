# UAE Events - Professional Events Platform

Mobile-first event discovery platform for UAE professional events. Built with vanilla JavaScript, Airtable database, and n8n automation.

## 🚀 Features

- **Event Discovery Board** - Browse professional events across all 7 UAE emirates
- **Smart Filters** - Filter by month, industry, and city
- **Optional Login** - Collect emails without forced signup
- **Affiliate Revenue** - Track booking clicks and conversions
- **Mobile-First Design** - Platinumlist-inspired UX with bottom-sheet modals
- **Automated Updates** - Weekly event scraping via n8n workflows

## 📁 Project Structure

```
professional events webapp/
├── public/
│   ├── index.html              # Main page
│   ├── css/
│   │   ├── reset.css           # CSS reset
│   │   ├── theme.css           # Design tokens (UAE theme)
│   │   ├── mobile.css          # Mobile-first styles
│   │   └── desktop.css         # Responsive breakpoints
│   └── js/
│       ├── utils.js            # Utility functions
│       ├── eventCards.js       # Event card rendering
│       ├── filters.js          # Filter logic
│       ├── modal.js            # Modal system
│       ├── login.js            # Optional login
│       └── app.js              # Main initialization
├── netlify/
│   └── functions/
│       ├── get-events.js       # Fetch events from Airtable
│       ├── receive-events.js   # n8n webhook receiver
│       ├── quick-login.js      # User registration
│       └── track-booking.js    # Affiliate tracking
├── netlify.toml                # Netlify configuration
├── package.json                # Dependencies
├── FINAL-USE-CASE.md          # Complete project documentation
└── README.md                   # This file
```

## 🛠️ Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Netlify account
- Airtable account
- n8n instance (cloud or self-hosted)

### 2. Install Dependencies

```bash
cd "C:\Users\LENOVO\Desktop\New folder\Projects\professional events webapp"
npm install
```

### 3. Configure Airtable

Create an Airtable base with 3 tables:

**Events Table:**
- title (Single line text)
- description (Long text)
- start_date (Date)
- end_date (Date)
- venue_name (Single line text)
- venue_address (Long text)
- city (Single select)
- organizer (Single line text)
- industry (Single select)
- tags (Multiple select)
- is_free (Checkbox)
- capacity (Number)
- registration_url (URL)
- image_url (URL)
- source (Single line text)
- source_event_id (Single line text)
- status (Single select: pending, approved, rejected)
- click_count (Number)
- last_clicked_at (Date)
- scraped_at (Date)

**Users Table:**
- first_name (Single line text)
- last_name (Single line text)
- email (Email)
- source (Single line text)
- subscription_status (Single select)
- subscription_tier (Single select)
- created_at (Date)
- last_login (Date)

**Bookings Table:**
- event_id (Link to Events)
- user_id (Link to Users)
- user_email (Email)
- click_timestamp (Date)
- status (Single select: clicked, completed)
- source (Single line text)

### 4. Configure Netlify

1. Push code to GitHub/GitLab
2. Connect repository to Netlify
3. Set environment variables in Netlify dashboard:
   - `AIRTABLE_API_KEY` - Your Airtable API key
   - `AIRTABLE_BASE_ID` - Your Airtable base ID

### 5. Deploy

```bash
# Deploy to production
npm run deploy

# Or deploy via Netlify dashboard
# Site will auto-deploy on git push
```

### 6. Configure n8n Workflows

See `FINAL-USE-CASE.md` for detailed n8n workflow setup instructions.

**Webhook URL:** `https://your-site.netlify.app/.netlify/functions/receive-events`

## 🎨 Design System

**Colors:**
- Navy Dark: #142952
- UAE Green: #00875A
- Gold: #FFD700
- Beige: #EFE6DE

**Responsive Breakpoints:**
- Mobile: 375px - 767px (1 column)
- Tablet: 768px - 1023px (2 columns)
- Desktop: 1024px+ (3 columns)

## 📊 Weekly Workflow

1. **Monday 6 AM** - n8n runs automated scraping
2. **Monday 9 AM** - Review events in Airtable (10 min)
3. **Approve events** - Change status from "pending" to "approved"
4. **Events appear** - Instantly visible on website

## 🔗 API Endpoints

- `GET /.netlify/functions/get-events` - Fetch approved events
- `POST /.netlify/functions/receive-events` - Receive events from n8n
- `POST /.netlify/functions/quick-login` - User registration
- `POST /.netlify/functions/track-booking` - Track affiliate clicks

## 📈 Future Enhancements

- Email newsletter (Phase 2)
- Premium subscription tier
- Sponsored event listings
- Advanced analytics dashboard
- Mobile app (React Native)

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Support

For issues and questions, see `FINAL-USE-CASE.md` for complete documentation.
