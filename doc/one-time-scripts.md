# One-time database scripts

This document describes **one-time scripts and migrations** for the database. In this project they are implemented as **API endpoints** that you call once (while logged in) to fix or backfill data. Run them only when needed; they are idempotent where possible.

---

## 1. Update sent badges

**Purpose:** After introducing the `badge` field, existing profiles that had been sent a message in the past (they have `sentAt` or `sentByAccount` set) may still have `badge: "new"` or no badge. This script sets `badge: "sent"` for all such profiles so the dashboard and Sent filter show them correctly.

**When to run:** Once, after deploying the badge feature, or whenever you notice profiles you had sent to still showing as "New".

**How to run:** Call the API (you must be logged in so the auth cookie is sent).

**Endpoint:** `POST /api/profiles/update-sent-badges`  
**Auth:** Required (same cookie as other API routes).

**From the browser (while logged in):**

1. Open your app (e.g. http://localhost:5556 or your deployed URL).
2. Open DevTools → Console.
3. Run:
   ```js
   fetch('/api/profiles/update-sent-badges', { method: 'POST', credentials: 'same-origin' })
     .then(r => r.json())
     .then(console.log);
   ```
4. You should see something like: `{ ok: true, updated: 42, matched: 42 }`.

**With curl (replace with your auth cookie and origin):**

```bash
curl -X POST "http://localhost:5556/api/profiles/update-sent-badges" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response (200):**

```json
{ "ok": true, "updated": 42, "matched": 42 }
```

- `matched`: number of profiles that had `sentAt` or `sentByAccount` set and badge ≠ `"sent"`.
- `updated`: number of documents actually modified (should equal `matched`).

**What it does:** Runs a single `Profile.updateMany()`: finds all profiles where `badge` is not `"sent"` and either `sentAt` exists and is not null or `sentByAccount` exists and is not null/empty; sets `badge: "sent"` on those documents.

**Idempotent:** Yes. Running it again only matches profiles that still need updating; already-fixed profiles are skipped.

---

## 2. Assign accounts, templates, and profile states to kiranhuxley11@gmail.com

You can run this migration in either of two ways.

### Option A: Standalone Node script (no app, no login)

From the project root, with `MONGODB_URI` set (in `.env` or in the shell):

```bash
node scripts/assign-to-kiran.js
```

Or use the npm script (loads `.env` if you use one):

```bash
npm run assign-to-kiran
```

**Windows (set env then run):**

```cmd
set MONGODB_URI=mongodb://your-connection-string
node scripts/assign-to-kiran.js
```

The script connects to MongoDB, finds the user with email `kiranhuxley11@gmail.com`, then:

1. Sets `userId` on all **accounts** to that user.
2. Sets `userId` on all **templates** to that user.
3. For every **profile** that has legacy badge/sent/visited data, pushes a `userStates` entry for that user with that data (skips if that user already has an entry).

No server or login required.

### Option B: API (admin only, app must be running)

**Purpose (same as script):** Assign all existing accounts, templates, and profile badge/sent/visited to one owner.

**Purpose:** Accounts (YC accounts), Templates, and profile **badge/Sent By/Visited** were previously shared by all users. They are now **per-user**: each user only sees and uses their own accounts, templates, and their own badge/sent/visited state on profiles. This script assigns all **existing** data to a single owner (by default `kiranhuxley11@gmail.com`):

- **Accounts** and **Templates**: set `userId` to the owner so only that user sees them.
- **Profile states**: copy each profile’s top-level badge/sentAt/sentByAccount/visitedAt/visited into a `userStates` entry for the owner. After running, only that user will see those “Sent”/“Visited” badges and “Sent By” on the dashboard; other users see “New” and no Sent By until they send or visit themselves.

**When to run:** Once, after deploying the per-user accounts/templates change. Run as an **admin** user.

**How to run:** Call the API while logged in as **admin**.

**Endpoint:** `POST /api/admin/assign-accounts-templates`  
**Auth:** Required (**admin** only).

**Request body (optional):**

```json
{ "email": "kiranhuxley11@gmail.com" }
```

If omitted, the default owner email is `kiranhuxley11@gmail.com`. The user must already exist (e.g. have signed in at least once or been created via env admin).

**From the browser (while logged in as admin):**

1. Open your app and sign in as admin.
2. Open DevTools → Console.
3. Run (default owner):
   ```js
   fetch('/api/admin/assign-accounts-templates', {
     method: 'POST',
     credentials: 'same-origin',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({})
   }).then(r => r.json()).then(console.log);
   ```
   Or with a specific owner email:
   ```js
   fetch('/api/admin/assign-accounts-templates', {
     method: 'POST',
     credentials: 'same-origin',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email: 'kiranhuxley11@gmail.com' })
   }).then(r => r.json()).then(console.log);
   ```

**Response (200):**

```json
{
  "ok": true,
  "message": "Assigned all accounts, templates, and profile states to kiranhuxley11@gmail.com",
  "ownerEmail": "kiranhuxley11@gmail.com",
  "accountsUpdated": 5,
  "accountsMatched": 5,
  "templatesUpdated": 3,
  "templatesMatched": 3,
  "profilesUpdated": 42
}
```

**What it does:** Finds the user with the given email; runs `Account.updateMany` and `Template.updateMany` to set `userId` to that owner; then for every profile that has legacy top-level sent/badge/visited data, adds a `userStates` entry for that owner with that data (so only that user sees it).

**Idempotent:** Yes. Running it again simply sets the same owner again; safe to run multiple times.

---

## Adding more one-time scripts

If you add more one-time database operations (e.g. backfill `badge: "new"` for profiles missing the field, or cleanup duplicates), either:

1. **Add a new API route** under `src/app/api/` (e.g. `profiles/backfill-badge-new/route.ts`) and document it here with the same structure: purpose, when to run, how to run, response, what it does, idempotent or not.
2. **Or add a standalone Node script** in a `scripts/` folder (e.g. `scripts/backfill-badge.js`) that uses `connectDB()` and the Mongoose models, and document here how to run it (e.g. `node scripts/backfill-badge.js` with `MONGODB_URI` in env).

See also: [API Reference](api.md) for the full `POST /api/profiles/update-sent-badges` spec.
