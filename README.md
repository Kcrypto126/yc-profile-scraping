# next-scraper

A private Next.js app for scraping and managing **Startup School cofounder-matching** profiles, with single-admin auth and optional message sending. No sign-up; one user only.

## Quick start

1. **Install**
   ```bash
   npm install
   ```
   This runs `npx playwright install` automatically (postinstall) to download browser binaries for scraping. If scraping later fails with "Executable doesn't exist", run:
   ```bash
   npx playwright install
   ```

2. **Environment**
   - Copy the example env file:  
     `cp .env.example .env`
   - Edit `.env` and set at least:  
     `MONGODB_URI`, `AUTH_JWT_SECRET` (min 32 chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD`.  
   See [doc/environment.md](doc/environment.md) for all variables.

3. **Run**
   ```bash
   npm run dev
   ```
   Open **http://localhost:5556**. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`; the admin user is created on first successful login.

## Documentation

Detailed docs live in the **`doc/`** folder so the project is easy to understand and extend later:

| Doc | Description |
|-----|-------------|
| [doc/README.md](doc/README.md) | Index of all documentation. |
| [doc/setup.md](doc/setup.md) | Full setup: prerequisites, install, env, first login, troubleshooting. |
| [doc/environment.md](doc/environment.md) | Every env var explained (where it’s used, how to get values). |
| [doc/architecture.md](doc/architecture.md) | App structure, routes, API, data models, auth and scrape flows. |
| [doc/api.md](doc/api.md) | Full API reference: endpoints, parameters, responses, errors. |
| [doc/one-time-scripts.md](doc/one-time-scripts.md) | One-time database scripts/migrations (e.g. update-sent-badges); when and how to run. |

## Environment variables (overview)

- **`.env`** – your local config (never commit; it’s in `.gitignore`).
- **`.env.example`** – template with placeholders and short comments. Copy to `.env` and fill in.

**Required for running the app:**

- `MONGODB_URI` – MongoDB connection (default: `mongodb://localhost:27017/next-scraper`)
- `AUTH_JWT_SECRET` – JWT signing secret (min 32 characters)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` – the only allowed login

**Optional (for scraping / messaging):**

- `NEXT_PUBLIC_SITE_URL` – base URL for profile pages (default in code)
- `NEXT_PUBLIC_FETCH_URL` – default scrape URL
- `NEXT_PUBLIC_SSO_KEY` / `NEXT_PUBLIC_SUS_SESSION` – Startup School auth (see doc)

Full details: [doc/environment.md](doc/environment.md).

## Stack

- Next.js 15 (App Router), React 19, TypeScript
- MongoDB (Mongoose), JWT auth (HTTP-only cookie)
- Tailwind CSS, Framer Motion, Playwright, Cheerio

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port **5556** |
| `npm run build` | Production build |
| `npm start` | Run production server (port 5556) |
| `npm run lint` | Run ESLint |
| `npx playwright install` | Download Playwright browsers (Chromium, etc.) for scraping; also runs after `npm install` |

## Learn more

- [Next.js docs](https://nextjs.org/docs)
- Project docs: start with [doc/README.md](doc/README.md).
