# Tasks: Local Deployment

## Phase 1: bcryptjs Migration

- [x] 1.1 Replace `bcrypt` with `bcryptjs` in `src/infrastructure/auth.ts` and `prisma/seed.ts` (import lines only)
- [x] 1.2 Replace `bcrypt` with `bcryptjs` in `package.json` dependencies; replace `@types/bcrypt` with `@types/bcryptjs` in devDependencies; run `npm install`
- [x] 1.3 Update test expectations in `seed.test.ts` and `e2e-verification.test.ts` to accept `bcryptjs` alongside `bcrypt` in string checks

## Phase 2: Enhanced Backup

- [x] 2.1 Update `scripts/backup.ts` — add rotation (delete backups older than 30 days), gzip compression via `zlib.createGzip()`, and integrity check via `prisma.$queryRaw` PRAGMA integrity_check
- [x] 2.2 Verify backup script works: run `npx tsx scripts/backup.ts` and confirm .gz output, rotation, and integrity check pass

## Phase 3: Windows Scripts

- [x] 3.1 Create `iniciar_sistema.bat` — Windows startup script with: Node.js check, npm install (if missing node_modules), prisma migrate deploy, seed check, next build check, next start. All messages in Spanish.
- [x] 3.2 Create `backup_diario.bat` — Windows backup runner that calls `npx tsx scripts/backup.ts`, checks error level, prints success/error in Spanish, and pauses

## Phase 4: Documentation

- [x] 4.1 Create `.env.example` with Spanish descriptions for NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL
- [x] 4.2 Create `INSTALACION.md` — Spanish setup guide: prerequisites, installation, startup, backups, credentials, troubleshooting

## Phase 5: Verification

- [x] 5.1 Run `npx tsc --noEmit` and verify zero type errors
- [x] 5.2 Run `npx vitest run` and verify all tests pass (bcryptjs is API-compatible)

---

**Review Workload Forecast**
- Estimated changed lines: 200–350
- 400-line budget risk: Very Low
- Delivery strategy: single PR