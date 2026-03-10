# Environment variables

All environment variables used by the app, with where they are read and how to set them.

---

## Server-only (never exposed to the client)

These are used only in API routes or server code. Do not prefix them with `NEXT_PUBLIC_`.

### MONGODB_URI

- **Purpose:** MongoDB connection string. Used to connect to the database for users, accounts, profiles, and templates.
- **Used in:** `src/lib/mongodb.ts` (and thus any API or code that calls `connectDB()`).
- **Default:** If unset, the code falls back to `mongodb://localhost:27017/next-scraper`.
- **Examples:**
  - Local: `mongodb://localhost:27017/next-scraper`
  - Atlas: `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/DATABASE`

---

### AUTH_JWT_SECRET

- **Purpose:** Secret key used to sign and verify the JWT stored in the auth cookie. Required for login and protected routes.
- **Used in:** `src/lib/auth.ts` (`signAuthToken`, `verifyAuthToken`).
- **Requirements:** Must be set and at least 32 characters, or the app throws at runtime.
- **Example:** Generate with `openssl rand -base64 32` or any long random string.

---

### ADMIN_EMAIL

- **Purpose:** The only email that is allowed to sign in. There is no sign-up; only this user exists as “admin”.
- **Used in:** `src/app/api/auth/signin/route.ts` – compared to the email from the login form. On first successful sign-in with this email (and correct password), the user record is created in MongoDB.

---

### ADMIN_PASSWORD

- **Purpose:** The password for the single admin user. Checked on sign-in (after hashing).
- **Used in:** `src/app/api/auth/signin/route.ts` – verified against the stored hash when the user is created or when they log in.
- **Security:** Use a strong password; this is the only way to access the app.

---

## Public (exposed to the browser)

Variables prefixed with `NEXT_PUBLIC_` are inlined at build time and can appear in client-side code. **Do not put secrets here.**

### NEXT_PUBLIC_SITE_URL

- **Purpose:** Base URL for Startup School cofounder-matching profile pages. Used when building profile links or default URLs (e.g. in ProfileOverview and MessageSendModal).
- **Used in:** `src/sections/ProfileOverview.tsx`, `src/components/MessageSendModal/MessageSendModal.tsx`.
- **Typical value:** `https://www.startupschool.org/cofounder-matching/profile/`

---

### NEXT_PUBLIC_FETCH_URL

- **Purpose:** Default URL to use when running a scrape if the client does not send another URL. The bulk scrape API (`POST /api/scrape`) uses this from the environment; it is not passed in the request body. The scrape-one API uses it as fallback when no `url` is in the body.
- **Used in:** `src/app/api/scrape/route.ts` (required for POST), `src/app/api/scrape-one/route.ts` (fallback).
- **Optional:** Can be left empty if the front end or API client always sends the URL in the request body for scrape-one; bulk scrape will fail with “URL is required” if this is not set.

---

### NEXT_PUBLIC_SSO_KEY

- **Purpose:** Default SSO key for authenticated requests to Startup School (e.g. scraping or sending messages while “logged in” as you). Used when the request does not send `ssoKey`.
- **Used in:** `src/app/api/scrape/route.ts`, `src/app/api/scrape-one/route.ts`, `src/app/api/send-message/route.ts` as fallback when the request does not send `ssoKey`.
- **How to get:** When logged into Startup School (cofounder matching), open DevTools → Application (or Storage) → Cookies, and copy the value of the SSO-related cookie (name may vary; check the site’s auth mechanism). Alternatively use the “Manage Account” feature in the app to store accounts (name + ssoKey + susSession) and select one when sending messages.

---

### NEXT_PUBLIC_SUS_SESSION

- **Purpose:** Default session value for authenticated requests to Startup School (same idea as SSO key).
- **Used in:** Same routes as `NEXT_PUBLIC_SSO_KEY` – as fallback when the request does not send `susSession`.
- **How to get:** Same as SSO key – from browser cookies or network tab while logged into Startup School.

---

## Summary table

| Variable | Server/Client | Required | Notes |
|----------|----------------|----------|--------|
| MONGODB_URI | Server | No (has default) | MongoDB connection string |
| AUTH_JWT_SECRET | Server | Yes | Min 32 chars |
| ADMIN_EMAIL | Server | Yes | Single admin email |
| ADMIN_PASSWORD | Server | Yes | Single admin password |
| NEXT_PUBLIC_SITE_URL | Public | No (has default in code) | Profile base URL |
| NEXT_PUBLIC_FETCH_URL | Public | For bulk scrape | Default scrape URL; required for POST /api/scrape |
| NEXT_PUBLIC_SSO_KEY | Public | Optional | Default SSO for scrape/send-message |
| NEXT_PUBLIC_SUS_SESSION | Public | Optional | Default session for scrape/send-message |

For a ready-to-fill template, copy `.env.example` to `.env` and replace the placeholder values. See [Setup](setup.md) for first-run steps.
