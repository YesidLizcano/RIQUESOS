# Design: Local Deployment

## Architecture Decisions

### AD-01: iniciar_sistema.bat — comprehensive startup script

A single `.bat` file with sequential steps and error handling. Each step checks a precondition before proceeding:

```
1. node --version → if error: print "Node.js no está instalado" and exit /b 1
2. if not exist node_modules → npm install
3. npx prisma migrate deploy
4. Check if admin exists → if not: npx prisma db seed
5. if not exist .next → npx next build
6. npx next start
```

Uses `if errorlevel 1` guards after each command. Colored output via `echo` with `[OK]`/`[ERROR]` prefixes. All messages in Spanish. CRLF line endings.

### AD-02: backup_diario.bat — simple backup runner

Minimal wrapper: calls `npx tsx scripts/backup.ts`, checks `%errorlevel%`, prints success/error in Spanish, then `pause`. Does NOT implement rotation logic — that lives in `scripts/backup.ts`. Windows Task Scheduler setup instructions go in `INSTALACION.md` only.

### AD-03: Enhanced scripts/backup.ts

Add three capabilities to the existing backup script:

1. **Rotation**: After backup, scan `backups/` for files older than 30 days (using `fs.statSync` → `mtimeMs`), delete them. Log each deletion.
2. **Compression**: Use Node.js built-in `zlib.createGzip()` to pipe the backup file through gzip, producing `backup-dev-{date}.db.gz`. Delete the uncompressed `.db` file after successful compression. If gzip fails, keep the uncompressed copy as fallback.
3. **Integrity check**: After copying and before compression, open the backup with `better-sqlite3` or Prisma `$queryRaw` to run `PRAGMA integrity_check`. If the result is not `"ok"`, log error and exit with code 1. Since the project uses Prisma with SQLite, use `prisma.$queryRaw` to execute the PRAGMA.

**Flow**: copy → integrity check → compress → delete original → rotate old backups.

### AD-04: bcryptjs migration

Replace `bcrypt` with `bcryptjs`:
- `src/infrastructure/auth.ts`: `import bcrypt from 'bcrypt'` → `import bcrypt from 'bcryptjs'`
- `prisma/seed.ts`: `import bcrypt from 'bcrypt'` → `import bcrypt from 'bcryptjs'`
- `package.json`: remove `bcrypt`, add `bcryptjs`; remove `@types/bcrypt`, add `@types/bcryptjs`
- Tests that check for `bcrypt` string need updating to also accept `bcryptjs`

`bcryptjs` has identical API (`hash`, `compare`) — no logic changes needed. Existing `$2b$` hashes are compatible.

### AD-05: .env.example

```env
# Clave secreta para NextAuth (generar un string aleatorio para producción)
NEXTAUTH_SECRET=change-me-use-a-secure-random-string

# URL base de la aplicación
NEXTAUTH_URL=http://localhost:3000

# Ruta a la base de datos SQLite
DATABASE_URL="file:./dev.db"
```

### AD-06: INSTALACION.md

Spanish-language guide with sections:
1. **Requisitos previos** — Node.js 20+, npm
2. **Instalación** — clone/copy, `.env.example` → `.env`, edit values, run `iniciar_sistema.bat`
3. **Iniciar el sistema** — double-click `iniciar_sistema.bat`
4. **Backups** — `backup_diario.bat`, Task Scheduler setup steps
5. **Credenciales por defecto** — `admin@riquesos.com` / `admin123`
6. **Solución de problemas** — common errors (Node not found, port in use, migration errors)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/backup.ts` | MODIFY | Add rotation, compression, integrity check |
| `src/infrastructure/auth.ts` | MODIFY | bcrypt → bcryptjs import |
| `prisma/seed.ts` | MODIFY | bcrypt → bcryptjs import |
| `package.json` | MODIFY | Replace bcrypt with bcryptjs |
| `iniciar_sistema.bat` | CREATE | Windows startup script |
| `backup_diario.bat` | CREATE | Windows backup runner |
| `.env.example` | CREATE | Environment variables documentation |
| `INSTALACION.md` | CREATE | Spanish setup guide |