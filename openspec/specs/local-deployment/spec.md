# Spec: Local Deployment

## FR-01: iniciar_sistema.bat

A Windows batch file SHALL start the backoffice with a single double-click. The script SHALL:
1. Check that Node.js is installed and accessible; if not, display an error in Spanish and exit.
2. Run `npm install` if `node_modules` directory is missing.
3. Run `npx prisma migrate deploy` to apply pending migrations.
4. Run `npx prisma db seed` only if no admin user exists in the database (detect via `npx prisma db execute` or a lightweight check).
5. Run `npx next build` if the `.next` directory is missing.
6. Start the production server with `npx next start`.

All user-facing messages SHALL be in Spanish. The script SHALL exit immediately on any step failure with a descriptive error message.

## FR-02: backup_diario.bat

A Windows batch file SHALL run the daily backup. The script SHALL:
1. Call `npx tsx scripts/backup.ts` to execute the backup.
2. Check the exit code of the backup command.
3. Print "Backup completado exitosamente" on success or "Error al realizar el backup" on failure.
4. Pause before closing so the user can see the output.

## FR-03: Backup rotation and compression

The backup script (`scripts/backup.ts`) SHALL:
1. After creating a backup, compress it using `zlib.createGzip()` producing a `.db.gz` file. The uncompressed copy MAY be deleted after successful compression.
2. Retain only the last 30 daily backups (based on file modification time), deleting files older than 30 days.
3. Verify backup integrity by running `PRAGMA integrity_check` via Prisma on the uncompressed database before marking the backup as successful. If the integrity check fails, the script SHALL log an error and exit with code 1.
4. Log all operations (creation, rotation, compression, verification) to stdout.

## FR-04: bcryptjs migration

The project SHALL use `bcryptjs` instead of `bcrypt` for password hashing. `bcryptjs` is a pure JavaScript implementation that works on Windows without native compilation. All existing password hashes SHALL remain compatible because `bcryptjs` reads the same `$2b$` format. The migration SHALL update: (1) `import bcrypt from 'bcrypt'` → `import bcrypt from 'bcryptjs'` in `src/infrastructure/auth.ts` and `prisma/seed.ts`, (2) `package.json` dependency `bcrypt` → `bcryptjs`, (3) `@types/bcrypt` SHALL be replaced with `@types/bcryptjs` in devDependencies.

## FR-05: .env.example

A `.env.example` file SHALL document all required environment variables with Spanish descriptions:
- `NEXTAUTH_SECRET` — Clave secreta para NextAuth (generar un string aleatorio para producción)
- `NEXTAUTH_URL` — URL base de la aplicación (por defecto: http://localhost:3000)
- `DATABASE_URL` — Ruta a la base de datos SQLite (por defecto: "file:./dev.db")

Optional variables MAY also be documented (`ADMIN_PASSWORD`, `NODE_ENV`, `PORT`).

## FR-06: INSTALACION.md

A setup guide in Spanish SHALL be created documenting:
1. Prerequisites: Node.js 20+, npm.
2. Installation steps: clone, copy `.env.example` to `.env`, edit values, run `iniciar_sistema.bat`.
3. How to start the system: double-click `iniciar_sistema.bat`.
4. How backups work: `backup_diario.bat` + Windows Task Scheduler setup instructions.
5. Default login credentials: `admin@riquesos.com` / `admin123`.
6. Troubleshooting: common errors and solutions.

## NFR-01: Windows compatibility

All `.bat` scripts SHALL use Windows-compatible paths (backslashes) and CRLF line endings.

## NFR-02: Spanish language

All user-facing messages in scripts and documentation SHALL be in Spanish.

## NFR-03: Offline operation

The system SHALL work without internet after the initial `npm install` completes.