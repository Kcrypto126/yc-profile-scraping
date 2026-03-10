# API Reference

This document describes all HTTP API endpoints for the **next-scraper** application. The base URL is the app origin (e.g. `http://localhost:5556`). All authenticated endpoints require the auth cookie set by `POST /api/auth/signin`; send `credentials: "same-origin"` (or include cookies) when calling from the browser.

---

## Authentication

Protected routes use a JWT stored in an HTTP-only cookie (`auth_token`). If the token is missing or invalid, responses use status **401** and body `{ "ok": false }` or `{ "error": "Unauthorized" }`.

---

## Endpoints

### Auth

#### POST `/api/auth/signin`

Sign in as the single admin user. On success, sets the auth cookie and returns the user.

**Request (JSON):**

| Field     | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `email`   | string | Yes      | Must match `ADMIN_EMAIL` |
| `password`| string | Yes      | Must match `ADMIN_PASSWORD` |

**Response (200):**

```json
{ "ok": true, "user": { "email": "...", "name": "Admin" | null } }
```

**Errors:**

- **400** – `{ "ok": false, "error": "Email and password are required" }`
- **401** – `{ "ok": false, "error": "Invalid credentials" }`

---

#### POST `/api/auth/logout`

Clear the auth cookie. No request body.

**Response (200):**

```json
{ "ok": true }
```

---

#### GET `/api/auth/me`

Return the current user if the auth cookie is valid.

**Response (200):**

```json
{ "ok": true, "user": { "email": "...", "name": "..." | null } }
```

**Errors:**

- **401** – `{ "ok": false }` (no cookie or invalid token)

---

### Accounts

Accounts store SSO/session pairs (name, ssoKey, susSession) used for authenticated scraping and sending messages.

#### GET `/api/accounts`

List all accounts. **Auth required.**

**Response (200):**

```json
{ "ok": true, "accounts": [ { "_id": "...", "name": "...", "ssoKey": "...", "susSession": "...", "createdAt": "...", "updatedAt": "..." } ] }
```

**Errors:** **500** – `{ "error": "Failed to fetch accounts: ..." }`

---

#### POST `/api/accounts`

Create an account. **Auth required.**

**Request (JSON):**

| Field       | Type   | Required | Description                    |
|-------------|--------|----------|--------------------------------|
| `name`      | string | Yes      | Display name for the account   |
| `ssoKey`    | string | Yes      | SSO key from Startup School   |
| `susSession`| string | Yes      | Session value from Startup School |

**Response (201):**

```json
{ "ok": true, "account": { "_id": "...", "name": "...", "ssoKey": "...", "susSession": "...", "createdAt": "...", "updatedAt": "..." } }
```

**Errors:**

- **400** – `{ "error": "Name, ssoKey, and susSession are required" }`
- **500** – `{ "error": "Failed to create account: ..." }`

---

#### PUT `/api/accounts/[id]`

Update an account by MongoDB `_id`. **Auth required.**

**Request (JSON):** Same as POST (name, ssoKey, susSession required).

**Response (200):** `{ "ok": true, "account": { ... } }`

**Errors:** **404** – Account not found. **500** – Server error.

---

#### DELETE `/api/accounts/[id]`

Delete an account. **Auth required.**

**Response (200):** `{ "ok": true }`

**Errors:** **404** – Account not found. **500** – Server error.

---

### Templates

Templates store reusable message content for the “send message” feature.

#### GET `/api/templates`

List all templates. **Auth required.**

**Response (200):**

```json
{ "ok": true, "templates": [ { "_id": "...", "name": "...", "content": "...", "createdAt": "...", "updatedAt": "..." } ] }
```

---

#### POST `/api/templates`

Create a template. **Auth required.**

**Request (JSON):**

| Field    | Type   | Required | Description          |
|----------|--------|----------|----------------------|
| `name`   | string | Yes      | Template name        |
| `content`| string | Yes      | Message body         |

**Response (201):** `{ "ok": true, "template": { ... } }`

**Errors:** **400** – `{ "error": "Name and content are required" }`

---

#### PUT `/api/templates/[id]`

Update a template by `_id`. **Auth required.**

**Request (JSON):** Same as POST (name, content required).

**Response (200):** `{ "ok": true, "template": { ... } }`

**Errors:** **404** – Template not found.

---

#### DELETE `/api/templates/[id]`

Delete a template. **Auth required.**

**Response (200):** `{ "ok": true }`

**Errors:** **404** – Template not found.

---

### Profiles

Profiles are scraped cofounder-matching records. Each has an optional **badge**: `"new"` | `"visited"` | `"sent"`.

#### GET `/api/profiles`

List and filter profiles with pagination. **Auth required.**

**Query parameters:**

| Parameter      | Type   | Description |
|----------------|--------|-------------|
| `page`         | number | Page number (default: 1) |
| `limit`        | number | Items per page (default: 100) |
| `name`         | string | Case-insensitive regex on profile name |
| `age`          | number | Minimum age (profile.age >= age) |
| `location`     | string | Case-insensitive regex on location |
| `funding`      | string | Case-insensitive regex on startup.funding |
| `filterSent`   | "1" / "true" | Only profiles with badge `"sent"` |
| `filterVisited`| "1" / "true" | Only profiles with badge `"visited"` |
| `filterNew`    | "1" / "true" | Only profiles with badge `"new"` or missing badge |

**Response (200):**

```json
{
  "data": [ { "_id": "...", "userId": "...", "name": "...", "badge": "new" | "visited" | "sent", "sentAt": null | "ISO8601", "visitedAt": null | "ISO8601", "sentByAccount": null | "...", ... } ],
  "total": 123,
  "matched": 45
}
```

- `total`: total count of all profiles in the database.
- `matched`: count of profiles matching the current filters (used for pagination).

**Errors:** **401** – Unauthorized. **500** – `{ "data": [], "message": "..." }`.

---

#### POST `/api/profiles/visit`

Mark a profile as visited (user opened the profile). Sets `badge` to `"visited"` unless it is already `"sent"`. **Auth required.**

**Request (JSON):** Send **either** profile document id **or** userId.

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `id` or `_id` | string | One of id/userId | MongoDB document `_id` of the profile (preferred) |
| `userId`      | string | One of id/userId | Profile’s `userId` (last segment of profile URL) |

**Response (200):**

```json
{ "ok": true, "badge": "visited", "visited": true, "visitedAt": "2025-02-10T12:00:00.000Z" }
```

**Errors:**

- **400** – `{ "error": "id or userId is required" }` or invalid JSON
- **404** – `{ "error": "Profile not found" }`
- **500** – `{ "error": "Failed to update visit" }`

---

#### POST `/api/profiles/update-sent-badges`

One-time migration: set `badge` to `"sent"` for all profiles that have `sentAt` or `sentByAccount` set but badge is not already `"sent"`. **Auth required.**

**Request:** No body.

**Response (200):**

```json
{ "ok": true, "updated": 42, "matched": 42 }
```

- `matched`: number of profiles that had sent data but badge ≠ "sent".
- `updated`: number of documents modified.

**Errors:** **500** – `{ "error": "Failed to update sent badges" }`

---

### Scraping

#### POST `/api/scrape`

Run a bulk scrape. Uses `NEXT_PUBLIC_FETCH_URL` from the environment as the URL to fetch (not passed in body). Launches Playwright, loads the page with optional auth cookies, parses with Cheerio, and upserts profiles. **Auth required.**

**Request (JSON):**

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `ssoKey`   | string | No       | Override env; used for authenticated fetch |
| `susSession` | string | No     | Override env; used for authenticated fetch |

**Response (200):** `{ "message": "Profile scraped successfully" }`

**Errors:**

- **400** – `{ "error": "URL is required" }` (env `NEXT_PUBLIC_FETCH_URL` not set) or invalid URL
- **401** – Unauthorized
- **500** – `{ "error": "Failed to scrape profile: ..." }`

---

#### POST `/api/scrape-one`

Scrape a single profile URL and upsert one profile. **Auth required.**

**Request (JSON):**

| Field       | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `url`       | string | Yes*     | Full profile URL to scrape (*or set `NEXT_PUBLIC_FETCH_URL`) |
| `ssoKey`    | string | No       | Override env |
| `susSession`| string | No       | Override env |

**Response (200):**

```json
{ "ok": true, "profile": { "_id": "...", "userId": "...", "name": "...", "startup": { ... }, ... } }
```

**Errors:** **400** – URL required or invalid. **401** – Unauthorized. **500** – Scrape failure.

---

### Send message

#### POST `/api/send-message`

Send an invite message to a cofounder profile on Startup School via Playwright (fill textarea, click “Invite to connect”). Records the send in the platform: updates the profile with `sentByAccount`, `sentAt`, `badge: "sent"`, and optionally `sentWithTemplate`. Recording is attempted whenever the request does not return 500 (i.e. after the invite button is clicked). **Auth required.**

**Request (JSON):**

| Field         | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `url`         | string | Yes      | Full profile page URL (used to derive userId for recording) |
| `message`     | string | Yes      | Message body (non-empty after trim) |
| `accountName` | string | No       | Name to store as `sentByAccount` (default "Unknown") |
| `templateName`| string | No       | Template name to store as `sentWithTemplate` |
| `ssoKey`      | string | No*      | Override env (*or `NEXT_PUBLIC_SSO_KEY`) |
| `susSession`  | string | No*      | Override env (*or `NEXT_PUBLIC_SUS_SESSION`) |

**Response (200):**

```json
{ "ok": true, "message": "Message sent successfully! You have N invites left for this week.", "invitesLeft": 15 }
```

Or when invites left is not parsed: `{ "ok": true, "message": "Message sent successfully!" }`

**Response (400):** Message not sent (e.g. weekly limit, or status div indicates failure):

```json
{ "ok": false, "error": "..." }
```

**Errors:**

- **400** – Missing URL, empty message, invalid URL, or missing ssoKey/susSession (env or body)
- **401** – Unauthorized
- **500** – Browser/network error (message send flow failed before completing; profile is not updated)

---

### Analytics

#### GET `/api/analytics/overview`

Aggregated stats for sent messages: time series, by account, by template, and total. **Auth required.**

**Query parameters:**

| Parameter  | Type   | Description |
|------------|--------|-------------|
| `period`   | string | `"day"` \| `"week"` \| `"month"` (default: `"day"`) – grouping for time series |
| `fromDate` | string | Optional; YYYY-MM-DD (start of range for sentAt) |
| `toDate`   | string | Optional; YYYY-MM-DD (end of range for sentAt) |

**Response (200):**

```json
{
  "ok": true,
  "period": "day",
  "fromDate": "2025-02-01",
  "toDate": "2025-02-10",
  "totalSent": 100,
  "timeSeries": [ { "date": "2025-02-01", "count": 12 }, ... ],
  "byAccount": [ { "account": "Account A", "count": 50 }, ... ],
  "byTemplate": [ { "template": "Template 1", "count": 30 }, ... ]
}
```

**Errors:** **500** – `{ "error": "Failed to load analytics" }`

---

## Data models (summary)

- **Profile:** userId, name, location, age, lastSeen, avatar, intro, startup, cofounderPreferences, interests, linkedIn, createdAt, status, sentByAccount, sentAt, sentWithTemplate, visitedAt, visited, **badge** (`"new"` | `"visited"` | `"sent"`).
- **Account:** name, ssoKey, susSession, createdAt, updatedAt.
- **Template:** name, content, createdAt, updatedAt.
- **User:** email, name, password hash/salt, enabled (admin only).

For full Profile fields see `src/models/Profile.ts`.
