# Architecture

High-level structure of the app so you can find your way and extend it.

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS, Framer Motion, react-icons, react-toastify
- **Database:** MongoDB via Mongoose
- **Auth:** Custom JWT in HTTP-only cookie (no NextAuth); single admin user
- **Scraping:** Playwright (browser) + Cheerio (HTML parsing)
- **Port:** 5556 (see `package.json` scripts)

## Project structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (REST-style)
│   │   ├── accounts/       # CRUD for “accounts” (SSO/session pairs)
│   │   │   └── [id]/       # PUT, DELETE one account
│   │   ├── analytics/
│   │   │   └── overview/   # GET analytics (time series, by account, by template)
│   │   ├── auth/           # signin, logout, me
│   │   ├── profiles/       # GET list/filter; POST visit; POST update-sent-badges
│   │   │   ├── visit/
│   │   │   └── update-sent-badges/
│   │   ├── scrape/         # POST bulk scrape
│   │   ├── scrape-one/     # POST scrape single URL
│   │   ├── send-message/   # POST send invite (Startup School)
│   │   └── templates/     # CRUD for message templates
│   │       └── [id]/       # PUT, DELETE one template
│   ├── about/
│   ├── manageaccount/      # UI to manage accounts
│   ├── overview/           # Analytics UI (date range, charts)
│   ├── scrape/             # UI for scraping
│   ├── search/             # Dashboard: profile list, filters, pagination
│   ├── signin/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/             # Reusable UI
│   ├── AuthGuard.tsx       # Wraps protected pages
│   ├── MessageSendModal/
│   ├── Navbar/
│   ├── ProfileFilter/      # Badge filters (Sent / Visited / New) + name, age, etc.
│   ├── ProfileFooter/      # Pagination, items per page
│   ├── ProfileTable/       # Table of profiles; badge display
│   ├── Scraper/
│   └── Theme/
├── contexts/
│   ├── AuthContext.tsx     # Current user state
│   ├── ThemeContext.jsx    # Dark/light theme
│   └── index.tsx
├── lib/
│   ├── auth.ts             # JWT sign/verify, password hash, cookie name
│   └── mongodb.ts          # Mongoose connect
├── models/                 # Mongoose schemas
│   ├── Account.ts          # name, ssoKey, susSession
│   ├── Profile.ts          # Scraped profile + badge, sentAt, visitedAt, etc.
│   ├── Template.ts         # Message templates (name, content)
│   └── Users.ts            # Admin user (email, password hash, etc.)
├── sections/               # Page sections
│   ├── Dashboard.tsx       # Search page: filter, table, footer, overview modal
│   ├── ProfileOverview.tsx # Modal: profile detail, visit, send message, scrape-one
│   └── About.tsx
└── types/
    └── index.ts            # ProfileModel, FilterModel, AuthContextProps, etc.
```

## Main flows

### Authentication

- **Sign-in:** POST `/api/auth/signin` with email/password. If they match `ADMIN_EMAIL` / `ADMIN_PASSWORD`, a JWT is created and set in an HTTP-only cookie. On first success, the user is created in MongoDB.
- **Protected routes:** API routes that need auth read the cookie and call `verifyAuthToken(token)` from `src/lib/auth.ts`. Pages use `AuthGuard` and `AuthContext`.
- **Logout:** POST `/api/auth/logout` clears the auth cookie.

### Profiles and badges

- **Badge:** Each profile has a single **badge** in the database: `"new"` | `"visited"` | `"sent"`. It drives the dashboard status pill and the Sent / Visited / New filters.
- **List:** GET `/api/profiles` supports pagination (`page`, `limit`) and filters: `name`, `age`, `location`, `funding`, and badge filters `filterSent`, `filterVisited`, `filterNew`. Response includes `data`, `total`, and `matched`.
- **Visit:** When the user opens a profile (ProfileOverview), the client calls POST `/api/profiles/visit` with the profile’s `_id` (or `userId`). The API sets `badge` to `"visited"` and sets `visitedAt` (and `visited`) unless the badge is already `"sent"`.
- **Sent:** When a message is sent via POST `/api/send-message`, the API updates the profile with `sentByAccount`, `sentAt`, `badge: "sent"`, and optionally `sentWithTemplate`. This happens whenever the invite flow completes without a 500 error.
- **New:** Newly scraped profiles get `badge: "new"` via `$setOnInsert` in scrape/scrape-one. The “New” filter matches `badge: "new"` or missing/null badge (legacy profiles).
- **One-time migration:** POST `/api/profiles/update-sent-badges` sets `badge: "sent"` for all profiles that have `sentAt` or `sentByAccount` but badge ≠ `"sent"`.

### Scraping

- **Bulk scrape:** POST `/api/scrape` uses `NEXT_PUBLIC_FETCH_URL` from the environment. Launches Playwright, fetches the page (with auth cookies if `ssoKey`/`susSession` provided), parses with Cheerio, and upserts profiles. Uses `$set` so existing `badge`, `sentAt`, `visitedAt` are preserved.
- **Single URL:** POST `/api/scrape-one` – same idea for one URL (passed in body or env default). New documents get `badge: "new"` via `$setOnInsert`.
- **Accounts:** Stored accounts (name + ssoKey + susSession) are used to run authenticated scrapes or send messages as that “account”.

### Send message

- POST `/api/send-message`: Playwright opens the profile URL, fills the message textarea, clicks “Invite to connect”. After the click (and if no 500 is returned), the app records the send on the profile (`sentByAccount`, `sentAt`, `badge: "sent"`). YC policy limits sends per account (e.g. 20 per week); the UI may show “invites left” when the status div is parsed.

### Analytics

- GET `/api/analytics/overview`: Aggregates profiles with `sentAt` set. Query params: `period` (day/week/month), `fromDate`, `toDate`. Returns `timeSeries`, `byAccount`, `byTemplate`, and `totalSent`. Used by the Overview page for charts.

## Data models (MongoDB)

- **Users:** One document per admin user (email, password hash, salt, etc.). Only one user is used in practice (ADMIN_EMAIL).
- **Account:** name, ssoKey, susSession, createdAt, updatedAt – used for authenticated requests to Startup School.
- **Template:** name, content, createdAt, updatedAt – message templates for the send-message feature.
- **Profile:** Scraped profile data: userId, name, location, age, lastSeen, avatar, intro, startup, cofounderPreferences, interests, linkedIn, createdAt, status. Tracking: **badge** (`"new"` | `"visited"` | `"sent"`), sentByAccount, sentAt, sentWithTemplate, visitedAt, visited. See `src/models/Profile.ts` for the full schema.

## Theme (dark/light)

- **ThemeContext** holds `isDark` and syncs with `localStorage` and `document.documentElement.classList` (`dark` class).
- Initial state is fixed on both server and client to avoid hydration mismatch; after mount, `useEffect` reads `localStorage` / system preference and updates.
- **ThemeToggle** switches between sun/moon icons based on `isDark`.

## API routes summary

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/auth/signin` | POST | No | Log in (email + password) |
| `/api/auth/logout` | POST | No | Clear auth cookie |
| `/api/auth/me` | GET | Yes | Current user info |
| `/api/accounts` | GET, POST | Yes | List / create accounts |
| `/api/accounts/[id]` | PUT, DELETE | Yes | Update / delete one account |
| `/api/profiles` | GET | Yes | List/filter profiles (pagination, badge filters) |
| `/api/profiles/visit` | POST | Yes | Mark profile visited (set badge to "visited") |
| `/api/profiles/update-sent-badges` | POST | Yes | One-time: set badge "sent" for profiles with sent data |
| `/api/scrape` | POST | Yes | Run bulk scrape (uses env URL) |
| `/api/scrape-one` | POST | Yes | Scrape one profile URL |
| `/api/send-message` | POST | Yes | Send invite message (Startup School); record sent + badge |
| `/api/templates` | GET, POST | Yes | List / create templates |
| `/api/templates/[id]` | PUT, DELETE | Yes | Update / delete one template |
| `/api/analytics/overview` | GET | Yes | Analytics: time series, by account, by template |

For full request/response details, query parameters, and error codes, see the **[API Reference](api.md)**.

## Documentation index

- [Setup](setup.md) – install and run
- [Environment variables](environment.md) – all env vars in detail
- [API Reference](api.md) – every endpoint with parameters and responses
- [One-time database scripts](one-time-scripts.md) – migrations and one-off scripts (e.g. update-sent-badges)
- This file – architecture and structure

For a quick start, use [Setup](setup.md) and copy `.env.example` to `.env` as described there.
