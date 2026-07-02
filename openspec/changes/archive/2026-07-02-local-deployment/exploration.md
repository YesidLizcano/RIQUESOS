# Local Deployment — Exploration

## Current State Analysis

### Existing npm Scripts

| Script           | Command                          | Purpose                          |
|------------------|----------------------------------|----------------------------------|
| `dev`            | `next dev`                       | Development server               |
| `build`          | `next build`                     | Production build                 |
| `start`          | `next start`                     | Production server                |
| `lint`           | `next lint`                      | Linting                          |
| `test`           | `vitest`                         | Unit tests                       |
| `seed`           | `npx tsx prisma/seed.ts`         | Seed admin user + sample data    |
| `backup`         | `npx tsx scripts/backup.ts`      | Manual backup script             |
| `db:push`        | `npx prisma db push`             | Push schema to DB                |
| `db:seed`        | `npx prisma db seed`             | Prisma seed command              |
| `db:studio`      | `npx prisma studio`              | Prisma Studio GUI                |
| `test:e2e`       | `npx playwright test`            | E2E tests                        |

**Missing**: No production deployment scripts, no `.bat` files for Windows, no scheduled backup automation.

### Existing Backup Script (`scripts/backup.ts`)

- **What it does**: Copies `prisma/dev.db` to `backups/backup-dev-{YYYY-MM-DD}.db`
- **Idempotent**: Overwrites same-day backup (one file per day)
- **Auto-creates** the `backups/` directory if missing
- **No rotation**: Keeps all daily backups indefinitely — no cleanup of old files
- **No locking/snapshot**: Uses `fs.copyFileSync` which is a raw file copy — safe for SQLite with WAL mode but not atomic during writes
- **No compression**: Backups are full copies of the database file
- **No verification**: Does not verify backup integrity after copy

### Prisma Schema

- **Database**: SQLite via `file:./dev.db` (resolved relative to `prisma/` directory)
- **WAL mode**: Enabled in `src/infrastructure/db.ts` via `PRAGMA journal_mode=WAL`
- **Models**: Proveedor, Lote, Cliente, Venta, GastoFijo, Usuario, AuditLog

### Auth Configuration (`src/infrastructure/auth.ts`)

- **NextAuth v4** with Credentials provider (email + password)
- **JWT strategy** with 8-hour session max age
- **NEXTAUTH_SECRET** required (from `.env`)
- **NEXTAUTH_URL** required (currently `http://localhost:3000`)
- **bcrypt** for password hashing (native module — needs `node-gyp` or prebuilt on Windows)

### Environment Variables (`.env`)

Currently 3 variables:
```
NEXTAUTH_SECRET=***
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL="file:./dev.db"
```

**No `.env.example` file exists.** This needs to be created for documentation.

### Next.js Configuration (`next.config.js`)

Empty config — `const nextConfig = {}; module.exports = nextConfig;`

- No custom port configured (default: 3000)
- No output: 'standalone' — this is important for production deployment
- No experimental features enabled

### Pino Logger (`src/infrastructure/pino-logger.ts`)

- Rotating file logs at `logs/app` with `pino-roll`
- 10 MB per file, daily rotation, 10 files max
- Console output via `pino-pretty` in dev mode only
- **In production**: only writes to rotated log files (no console)
- Logs directory is gitignored (`/logs/`)

### Seed Script (`prisma/seed.ts`)

- Upserts admin user `admin@riquesos.com`
- Default password: `admin123` (overridable via `ADMIN_PASSWORD` env var)
- Upserts two sample Proveedores (Doble Crema, Semisalado)
- Idempotent — safe to run multiple times

### Key Technical Details

| Item                    | Value                                    |
|-------------------------|------------------------------------------|
| Next.js version         | 15.5.20                                  |
| Node.js                 | 24.16.0                                  |
| Package manager         | npm                                      |
| bcrypt                  | 6.0.0 (native, requires compilation)     |
| SQLite DB path          | `prisma/dev.db`                          |
| WAL mode                | Yes (enabled programmatically)           |
| Session                 | JWT, 8h maxAge                           |
| Default port            | 3000                                     |
| Output mode             | Default (no `output: 'standalone'`)      |

### .gitignore Coverage

- `/prisma/dev.db` — gitignored (database)
- `/backups/` — gitignored (backup files)
- `/logs/` — gitignored (log files)
- `.env*.local` — gitignored (local env overrides)
- `/.next/` — gitignored (build output)

---

## Windows Deployment Requirements

### 1. Production Build Script (`build.bat`)

**Must do**:
- Set `NODE_ENV=production`
- Run `npm run build` (generates `.next/` standalone build)
- Handle potential SIGBUS issue on WSL2 (known issue with Next.js + SQLite on WSL filesystem)

**SIGBUS Consideration**: This is a known issue when running Next.js on WSL2 with files on the Windows-mounted filesystem (`/mnt/c/...`). The fix is either:
- Run from native Linux filesystem (not `/mnt/c/`)
- Or set `NODE_OPTIONS='--max-old-space-size=4096'`
- This project is at `~/Documentos/Code/` which on a Linux system is fine — but on Windows the equivalent would need to be on the native filesystem, not a WSL mount.

### 2. Production Start Script (`start.bat`)

**Must do**:
- Set `NODE_ENV=production`
- Run `npm run start` (starts `next start` on port 3000)
- Optionally allow custom port via `PORT` env var

### 3. Database Setup Script (`setup-db.bat`)

**Must do**:
- Run `npx prisma db push` — create/migrate schema
- Run `npx prisma db seed` — seed admin user and sample data
- Ensure `dev.db` exists

### 4. Full Deploy Script (`deploy.bat`)

**Combined**: install deps + build + setup DB + start

### 5. Windows Path Handling

- All `.bat` files use Windows path separators
- `tsx` and `npx` work on Windows (Node.js is cross-platform)
- SQLite file paths in `.env` use `file:./dev.db` (relative, cross-platform)
- `backups/` directory uses forward slashes in Node.js scripts — works on Windows too

---

## Backup Strategy Analysis

### Current State

| Aspect              | Current                                    | Needed                                     |
|---------------------|---------------------------------------------|--------------------------------------------|
| Manual backup       | `npm run backup` (works)                   | Keep as-is                                 |
| Automated daily     | None                                        | Windows Task Scheduler .bat script         |
| Rotation            | None (infinite retention)                  | Configurable retention (e.g., keep 30 days)|
| Compression         | None                                        | Optional — low priority                    |
| Verification        | None                                        | Optional integrity check                    |
| Scheduling          | None                                        | `backup-daily.bat` + Task Scheduler setup   |

### Required Changes to `scripts/backup.ts`

1. **Add retention policy**: Delete backups older than N days (default 30)
2. **Add compression**: Optionally gzip the backup file to save space
3. **Add verification**: After copy, verify the backup is a valid SQLite database (`PRAGMA integrity_check`)
4. **Add logging**: Log backup creation, rotation, and errors
5. **Time-based naming**: Consider adding hour to filename for multiple daily backups if needed

### New Files Needed

1. **`scripts/backup-daily.bat`**: Windows batch script to run `npm run backup` — to be scheduled via Task Scheduler
2. **`scripts/TaskScheduler-setup.bat`**: One-time script to register the daily backup task in Windows Task Scheduler
3. **`scripts/start-production.bat`**: Start the production server
4. **`scripts/build-production.bat`**: Build for production
5. **`scripts/setup.bat`**: First-time setup (install deps, create DB, seed)

---

## Production Build Considerations

### Build Command

`npm run build` runs `next build` which:
- Generates optimized production build in `.next/`
- Prerenders static pages
- Creates server-side bundles

**No `output: 'standalone'`** is configured. For a local Windows deployment, this is fine since `node_modules` will be present. If we wanted a minimal deployment (no full `node_modules`), we'd add `output: 'standalone'` to `next.config.js`.

### Start Command

`npm run start` runs `next start` which:
- Starts the production Node.js server on port 3000
- Can be overridden with `PORT` env var or `-p` flag

### bcrypt on Windows

`bcrypt@6.0.0` uses native bindings. On Windows:
- Requires `node-gyp` and Visual Studio Build Tools
- Alternative: use `bcryptjs` (pure JS) for easier Windows deployment
- **Recommendation**: Consider switching to `bcryptjs` or document the Windows build tools requirement

---

## Environment Variables Needed

### Production `.env` Requirements

```env
# Required
NEXTAUTH_SECRET=<generate-a-random-secret>
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL="file:./dev.db"

# Optional
ADMIN_PASSWORD=<override-default-seed-password>
NODE_ENV=production
PORT=3000
```

### `.env.example` File (New)

Should document all required and optional environment variables with safe defaults.

---

## Estimated Scope

| Task                                      | Effort | Priority |
|-------------------------------------------|--------|----------|
| Create `.env.example`                     | S      | High     |
| Create `scripts/start-production.bat`     | S      | High     |
| Create `scripts/build-production.bat`     | S      | High     |
| Create `scripts/setup.bat` (first-time)   | M      | High     |
| Add backup retention to `scripts/backup.ts`| S      | High     |
| Create `scripts/backup-daily.bat`         | S      | High     |
| Create `scripts/TaskScheduler-setup.bat`  | S      | Medium   |
| Add `output: 'standalone'` to next config | S      | Low      |
| Consider bcryptjs migration               | S      | Low      |
| Create README section for Windows deploy   | M      | Medium   |

**Total estimated effort**: ~1 day for all High + Medium items.

**Risk items**:
- `bcrypt` native compilation on Windows (may need `windows-build-tools`)
- SIGBUS on WSL2 filesystem (avoid `/mnt/c/` paths)
- Windows Task Scheduler requires admin privileges for setup script
