# Setup

Step-by-step guide to get the project running on your machine.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** (or yarn / pnpm)
- **MongoDB** running locally, or a MongoDB Atlas connection string
- (Optional) **Playwright** browsers – installed automatically after `npm install`

## 1. Clone and install

```bash
# From the project root
npm install
```

- If you see peer dependency warnings (e.g. React 19 vs react-toastify), the project uses `legacy-peer-deps=true` in `.npmrc`, so `npm install` should still succeed.
- The first install runs `postinstall`, which runs `npx playwright install` and may take a few minutes. This downloads Chromium and other browsers used for scraping and sending messages.

## 2. Environment variables

1. Copy the example file to create your local env:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set at least:

   - **MONGODB_URI** – your MongoDB connection string (e.g. `mongodb://localhost:27017/next-scraper` or an Atlas URI).
   - **AUTH_JWT_SECRET** – a random string of at least 32 characters (e.g. `openssl rand -base64 32`).
   - **ADMIN_EMAIL** and **ADMIN_PASSWORD** – the single admin login. On first successful sign-in, this user is created in MongoDB; there is no separate sign-up flow.

3. For scraping Startup School pages and sending messages, you may also set:

   - **NEXT_PUBLIC_FETCH_URL** – default URL used by the bulk scrape API if no URL is provided (see [Environment variables](environment.md)).
   - **NEXT_PUBLIC_SITE_URL** – base URL for profile links (e.g. `https://www.startupschool.org/cofounder-matching/profile/`).
   - **NEXT_PUBLIC_SSO_KEY** and **NEXT_PUBLIC_SUS_SESSION** – default auth cookies for authenticated requests (scrape and send-message). See [Environment variables](environment.md) for how to obtain these.

Never commit `.env`; it is listed in `.gitignore`. Use `.env.example` as the template (no real secrets).

## 3. Run the app

**Development (with hot reload):**

```bash
npm run dev
```

- App runs at **http://localhost:5556** (port is set in `package.json`).

**Production build and run:**

```bash
npm run build
npm start
```

- Again on port 5556. For long-running production, consider using a process manager (e.g. pm2) as described in the main project README.

## 4. First login

1. Open http://localhost:5556 and go to the sign-in page.
2. Sign in with the **ADMIN_EMAIL** and **ADMIN_PASSWORD** from `.env`.
3. On first successful sign-in, the app creates this user in MongoDB (no separate sign-up flow). You can then use the Dashboard (search/profiles), Scrape, Overview (analytics), and Manage Account pages.

## 5. Optional: Lint

```bash
npm run lint
```

## Troubleshooting

- **MongoDB connection failed**  
  Check `MONGODB_URI`. Ensure MongoDB is running locally, or that your Atlas URI, IP allowlist, and credentials are correct.

- **Auth errors / "Missing AUTH_JWT_SECRET"**  
  Set `AUTH_JWT_SECRET` in `.env` (minimum 32 characters). Restart the dev server after changing env.

- **Scrape fails with "URL is required"**  
  Set `NEXT_PUBLIC_FETCH_URL` in `.env` for the bulk scrape API, or ensure the client passes a URL in the request body for scrape-one. See [API Reference](api.md).

- **Scrape or send-message fails (auth / 403)**  
  For authenticated Startup School requests, provide valid `ssoKey` and `susSession` (via env or request body). See [Environment variables](environment.md) for how to get these from the browser.

- **"Executable doesn't exist" (Playwright)**  
  The browser binaries are missing or outdated. Run `npx playwright install` to download them. This also runs automatically after `npm install`.

- **Profile visit or badge not persisting**  
  Ensure the app is using the latest Profile schema (with `badge` and visit logic). If you have old profiles that were sent in the past but show as "New", run the one-time script: `POST /api/profiles/update-sent-badges` once while logged in. See [One-time database scripts](one-time-scripts.md) and [API Reference](api.md).

- **New filter shows no results**  
  The New filter matches profiles with `badge: "new"` or missing/null badge. If all profiles have been visited or sent, none will match "New". Newly scraped profiles get `badge: "new"` on insert.

For full endpoint details and request/response shapes, see the [API Reference](api.md).
