# Proposal: Local Deployment

## Intent

Prepare the Riquesos backoffice for local Windows deployment with one-click startup scripts and automated daily backups, so a non-technical user can install and run the system by double-clicking a `.bat` file.

## Scope In

- **`iniciar_sistema.bat`** — One-click Windows startup script: checks Node.js, installs deps if needed, runs migrations, seeds admin if needed, builds if needed, starts production server. All output in Spanish.
- **`backup_diario.bat`** — Daily backup runner that calls the enhanced backup script and reports success/error in Spanish.
- **Enhanced `scripts/backup.ts`** — Add rotation (keep last 30 days), gzip compression via `zlib.createGzip()`, and integrity verification via `PRAGMA integrity_check`.
- **`bcryptjs` migration** — Replace `bcrypt` (native bindings, requires node-gyp) with `bcryptjs` (pure JS, zero compilation on Windows). Same API, existing hashes remain compatible.
- **`.env.example`** — Documents all 3 required environment variables with Spanish descriptions.
- **`INSTALACION.md`** — Spanish-language setup guide: prerequisites, installation, startup, backups, credentials, troubleshooting.

## Scope Out

- Docker / containerization
- Cloud deployment (Vercel, AWS, etc.)
- PM2 process manager or Windows Service wrapper
- SSL certificates
- Automated Windows Task Scheduler setup script (documented in INSTALACION.md instead)

## Approach

Windows `.bat` files for one-click startup and daily backup. The existing backup script is enhanced in-place with rotation, compression, and verification. The `bcrypt` → `bcryptjs` swap removes the Windows compilation barrier — only import paths change since the API is identical.

## Rollback

1. Delete `iniciar_sistema.bat`, `backup_diario.bat`, `.env.example`, `INSTALACION.md`
2. Revert `bcryptjs` → `bcrypt` in `auth.ts`, `seed.ts`, `package.json`; run `npm install`
3. Revert `scripts/backup.ts` to its original version (copy-only, no rotation/compression/verification)