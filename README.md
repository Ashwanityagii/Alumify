# Alumify

Connect students with alumni and faculty. **React (Vite) + Node/Express + Supabase.**

## Run it now (demo mode, no setup)
```bash
npm run install:all && npm run build && npm start     # http://localhost:3001
```
With no Supabase keys the API uses a local file store seeded with demo data:

| Role | Email | Password |
|---|---|---|
| Student | aryan@alumify.dev | Student@123 |
| Alumni | vikram@alumify.dev | Alumni@123 |
| Faculty | sandeep@alumify.dev | Faculty@123 |
| Admin (**Admin** tab on the login page, next to Faculty) | admin@alumify.dev | Admin@12345 |

Dev with hot reload: `npm run dev` starts both the API and client (http://localhost:5173). Use `npm run dev:server` or `npm run dev:client` to start either service individually.

## Switch to Supabase
1. Create a project, then run `supabase/schema.sql` in the SQL Editor.
2. `cp .env.example .env` and fill `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Create the first admin: `ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='long-password' node server/create-admin.js`
4. `npm start`. The server reports `[data: supabase]`; the admin overview shows the mode.

The browser never talks to Supabase. Only the Node API holds the service-role key; RLS is on with no public policies.

## Features
- **Landing page** at `/` (brand navbar, Login / Sign up, features, how it works, roles). Signed-in users see "Open dashboard".
- **Student**: *Create New Request* (name, branch, year, type, topic). Types: 15 min Coffee Talk, Resume Review (30), Guidance (30), or a faculty **batch query** (upcoming / running batch + topic). Request an open pool or one specific mentor. Personal **sessions counter**.
- **Alumni**: incoming queue, **Accept / Reject / Schedule for later**, *Mark completed*, **sessions-mentored counter**.
- **Faculty**: batch queries, **Accept & Connect / Decline / Schedule**, sessions counter, batch demand.
- **Admin**: sign in from the Admin tab on `/login`, then approve or reject alumni/faculty signups at `/admin` (approved users can log in immediately), create/disable users, view all requests.
- Counters are derived from completed sessions only, so they can't drift or be inflated.

## Route protection (enforced on the server; the React guards are only UX)
- `/api/student|alumni|faculty/*` each require that exact role (401 signed out, 403 wrong role).
- `/api/admin/*` and `/admin` return **404** to everyone who isn't an admin; admin signs in with the Admin tab on `/login` (the separate `/admin/login` URL still works).
- Alumni/faculty signups are `pending` until an admin approves; disabling a user kills their live token immediately.
- `studentId`, `status` and `mentorId` always come from the session/server, never the request body.
- Atomic claims (`UPDATE … WHERE status = …`) so two mentors can't both accept; per-mentor reject; contact emails revealed only after acceptance.
- bcrypt passwords, signed tokens, login throttling, CSP and security headers, input validation, max 5 open requests per student.

`npm test` runs 43 API checks covering all of the above.

## Creating an admin account
- **Demo mode:** an admin already exists (`admin@alumify.dev` / `Admin@12345`).
- **Any mode, from the browser:** put `ADMIN_SIGNUP_CODE=your-secret-code` in `.env`, restart the server, open the login page, choose the **Admin** tab, click **Create admin account**, and enter the code. Without that variable the signup endpoint is disabled, so nobody can make themselves admin.
- **From the terminal:** `ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='long-password' node server/create-admin.js`
- The server now reads the `.env` file automatically (copy `.env.example` to `.env`).
