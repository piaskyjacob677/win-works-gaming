# Architecture Guide: Parallel Development Strategy

## Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PORT 8089                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Services   │    │     API      │    │   Frontend   │      │
│  │  (Scrapers)  │───▶│   (Express)  │◀───│  (web/dist)  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
│  Your Developers                          You + Claude          │
│  Work Here ▼                              Work Here ▼           │
│                                                                  │
│  - services/*.js                          - web/dist/*          │
│  - utils/handler.js                       - dashboard/*         │
│  - utils/parse.js                         - filter.html         │
│  - constants/*.json                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer Breakdown

### 1. Services Layer (Your Developers)
**Location:** `services/`

These files handle:
- Authentication with betting sites
- UserInfo management (Balance, At risk, Available)
- Scraping odds data
- Placing actual bets
- Session management
- Proxy management

**Files:**
```
services/
├── abcwager.js      → ABCWager scraper & betting
├── action.js        → Action247 scraper & betting
├── betwindycity.js  → BetWindyCity scraper & betting
├── fesster.js       → Fesster scraper & betting
├── godds.js         → GOdds scraper & betting
├── highroller.js    → HighRoller scraper & betting
└── strikerich.js    → StrikeRich scraper & betting
```

Each service implements:
- `userManager()` - Handle logins/sessions
- `scraper()` - Continuously fetch odds
- `getLeagues()` - Fetch available leagues
- `getLeagueMatches()` - Fetch matches for a league
- `place()` - Place a bet

---

### 2. Data/Sorting Layer (Your Developers)
**Location:** `utils/` and `constants/`

**`utils/handler.js`** - Event filtering and sorting logic:
- `filterEvents()` - Search and filter events
- `getFinalEvents()` - Aggregate events across books
- Sorting by best price (points, then odds)

**`utils/parse.js`** - Parse bet signals into structured format

**`utils/utils.js`** - Helper functions:
- `leagueNameCleaner()` - Normalize league names
- `teamNameCleaner()` - Normalize team names
- `toleranceCheck()` - Verify odds/points within tolerance

**`constants/`** - Configuration data:
```
constants/
├── aliases.json     → Team name mappings (16KB of aliases)
├── emojis.json      → Sport-to-emoji mapping
├── periods.json     → Period/quarter mappings
└── props.json       → Player props configurations
```

---

### 3. API Layer (Shared - Mostly Stable)
**Location:** `web/routes/` and `web/controllers/`

**Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/general/teams` | GET | Search events with filters |
| `/api/general/bet` | POST | Place bets or get aggregated books |
| `/api/general/skins` | GET | List available betting services |
| `/api/general/history` | GET | Get betting history |
| `/api/general/account` | GET | List all accounts |
| `/api/general/prebet` | POST | Parse a bet signal |
| `/api/general/confirmbet` | POST | Confirm and place parsed bet |

---

### 4. Frontend Layer (You + Claude)
**Location:** `web/dist/` and `dashboard/`

**Current:**
- `web/dist/` - Pre-compiled React app (no source)
- `web/dist/filter.html` - Our Smart Bet Finder page

**Your Dashboard:**
- `dashboard/src/` - Full Next.js React source
- `dashboard/src/app/dashboard/filter/` - Smart Bet Finder in React

---

## Parallel Development Strategy

### What Your Developers Can Modify Safely:

1. **Add new betting services**
   - Create new file in `services/`
   - Add to server initialization in `server-8089.js`

2. **Improve scraping logic**
   - Modify individual service files
   - Update `scraper()` methods

3. **Refine sorting/filtering**
   - Edit `utils/handler.js`
   - Modify `filterEvents()` or `getFinalEvents()`

4. **Update team/league mappings**
   - Edit `constants/aliases.json`
   - Edit `constants/periods.json`

5. **Add new API endpoints**
   - Add routes in `web/routes/general.js`
   - Add controller methods in `web/controllers/general.js`

---

### What You Can Modify Safely:

1. **Frontend UI** (`web/dist/filter.html`)
   - Styling, layout, animations
   - User interactions
   - How data is displayed

2. **Dashboard** (`dashboard/src/`)
   - Full React components
   - New pages
   - Styling with Tailwind

3. **API proxy routes** (`dashboard/src/app/api/proxy/`)
   - How dashboard connects to backend

---

## Data Storage

**No traditional database!** Everything is JSON files:

```
data/
├── 8088/
│   ├── accounts.json    → Account credentials
│   └── history.json     → Betting history (last 100)
└── 8089/
    ├── accounts.json
    └── history.json

events/
├── 8088/
│   └── {serviceName}.json   → Scraped odds data
└── 8089/
    └── {serviceName}.json
```

**In-memory data:**
- `service.matches` - Nested by sport/league
// - `service.globalMatches` - Flat structure for quick API lookups (removed)

---

## How to Keep Working in Parallel

### Option A: Separate Branches
```
main branch
├── feature/scraping-improvements  (developers)
├── feature/new-frontend           (you)
└── feature/sorting-logic          (developers)
```

### Option B: Separate Concerns
- Developers: Only touch `services/`, `utils/`, `constants/`
- You: Only touch `web/dist/`, `dashboard/`
- API routes: Coordinate changes together

### Option C: API Contract
Define the API contract and stick to it:
- Developers ensure API returns correct data format
- You build frontend assuming that format
- Changes to API format require coordination

---

## Recommended Next Steps

1. **For your developers:**
   - Document any API changes they make
   - Keep `utils/handler.js` sorting logic updated
   - Add new services as needed

2. **For you:**
   - Build out the dashboard frontend
   - Use the existing API endpoints
   - Create new proxy routes if needed

3. **Integration points:**
   - Test API responses match expected format
   - Coordinate on new features that span both layers

---

## Quick Commands

```bash
# Start backend (port 8089)
npm run start-8089

# Start dashboard (port 3000)
cd dashboard && npm run dev

# Test API
curl http://localhost:8089/api/general/teams?search=19

# Test with filters
curl "http://localhost:8089/api/general/teams?search=19&market=spread&period=ft"
```
