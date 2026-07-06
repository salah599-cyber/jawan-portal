<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

`jawan-portal` ("Jawan Investments") is a Next.js 16 family-office platform. It requires a **PostgreSQL database** and **Clerk auth** to render any protected page. Standard commands live in `package.json` (`dev`, `build`, `lint`, `db:push`, `db:studio`).

### Database — the app uses the Neon WebSocket adapter, not plain TCP
`lib/db.ts` uses `@prisma/adapter-neon`, which connects over a **secure WebSocket** (`wss://<host>/v2`), so it cannot talk directly to a plain local Postgres. This VM is set up with a local Postgres plus a small WebSocket→TCP bridge that the Neon driver connects to. All of this state is baked into the snapshot; you only need to (re)start the services:

- Start Postgres: `sudo pg_ctlcluster 16 main start` (cluster `16 main`; db/role `jawan`/`jawan`; `pg_hba` uses `password` auth on `127.0.0.1` so the driver's `pipelineConnect: 'password'` works).
- Start the bridge: `sudo /exec-daemon/node /opt/neon-proxy/proxy.cjs` — listens on `wss://localhost:443/v2` and pipes to `127.0.0.1:5432` (self-signed cert at `/opt/neon-proxy/cert.pem`).
- Run the dev server so Node trusts the bridge cert: `NODE_EXTRA_CA_CERTS=/opt/neon-proxy/cert.pem npm run dev`.
- `.env` already has `DATABASE_URL=postgresql://jawan:jawan@localhost:5432/jawan`.
- Apply schema changes with `npm run db:push` (no `prisma/migrations` dir). `db:push`/`prisma generate` use the Prisma CLI's own **direct TCP** connection and do **not** need the bridge or `NODE_EXTRA_CA_CERTS`.
- If the bridge files are ever missing, recreate cert with `openssl req -x509 -newkey rsa:2048 -nodes -keyout /opt/neon-proxy/key.pem -out /opt/neon-proxy/cert.pem -days 3650 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`.
- Alternative to the bridge: set a hosted **Neon-compatible `DATABASE_URL`** secret; then run `npm run dev` without `NODE_EXTRA_CA_CERTS`.

### Auth — Clerk keyless mode
With no Clerk keys set, `@clerk/nextjs` auto-provisions a temporary dev instance (**keyless mode**; keys cached in `.clerk/.tmp/keyless.json`, needs internet). Sign-in from a new device triggers an email OTP: use a **Clerk test email** (any address like `admin+clerk_test@example.com`) whose OTP is always `424242`. Create verified users non-interactively via the Clerk Backend API with the keyless `secretKey`.

### Access / roles
New users default to role `EXTERNAL`, which has **no dashboard access**. The email `salah599@gmail.com` (`lib/auth/constants.ts`) auto-bootstraps to `PRINCIPAL` + super-admin on sign-in. For any other email, elevate the DB row: `UPDATE "User" SET "isSuperAdmin"=true, role='PRINCIPAL', "isActive"=true WHERE email='...';`. `isSuperAdmin` short-circuits all permission checks.

### Lint
`npm run lint` runs but the repo currently has pre-existing lint errors/warnings (e.g. in `scripts/*.cjs` and several source files); they are not caused by environment setup.
