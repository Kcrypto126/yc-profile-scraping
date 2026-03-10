# Documentation

This folder contains detailed documentation for the **next-scraper** project so that future developers can understand and work on it quickly.

## Contents

| Document | Description |
|----------|-------------|
| [Setup](setup.md) | Install dependencies, configure environment, run the app locally, and troubleshooting. |
| [Environment variables](environment.md) | All env vars explained: what they do, where they’re used, how to get values, and a summary table. |
| [Architecture](architecture.md) | App structure, routes, data models, main flows (auth, scraping, profiles, badges), and theme. |
| [API Reference](api.md) | **Full API documentation:** every endpoint with method, auth, query/body parameters, response shape, and error codes. |
| [One-time database scripts](one-time-scripts.md) | **One-time migrations:** update-sent-badges (and any future scripts); when and how to run them. |

## Quick reference

- **Stack:** Next.js 15 (App Router), React 19, MongoDB (Mongoose), Tailwind CSS, Playwright, Cheerio.
- **Auth:** Single admin only (no sign-up). JWT in HTTP-only cookie. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in env.
- **Purpose:** Scrape and manage Startup School cofounder-matching profiles; send invite messages via the site; track Sent / Visited / New badges and analytics.
- **Port:** Dev and start use port **5556** (see `package.json`).
- **Profiles:** Each profile has a **badge** in the database: `"new"` | `"visited"` | `"sent"`. Filters and UI use this for the dashboard and overview.

For a quick start, follow [Setup](setup.md) and copy `.env.example` to `.env` as described there. For integrating with the backend, use the [API Reference](api.md).