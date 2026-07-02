# Exploration: log-rotation

**Change**: log-rotation
**Project**: pagina-riquesos
**Date**: 2026-07-01

---

## 1. Current Logger Implementation

### File: `src/infrastructure/pino-logger.ts`

The logger is implemented as a singleton Pino instance with multi-channel output:

```typescript
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Multi-channel: write to file at info level, console at debug level in dev
const transport = pino.transport({
  targets: [
    {
      target: 'pino/file',
      options: { destination: LOG_FILE, mkdir: true },
      level: 'info',
    },
    ...(process.env.NODE_ENV !== 'production'
      ? [{ target: 'pino-pretty', level: 'debug' as const }]
      : []),
  ],
});

export const logger = pino(transport);
export default logger;
```

**Key observations:**

- Uses `pino.transport()` (Worker thread-based) for async logging — this is the modern Pino approach.
- Writes to `logs/app.log` at `info` level.
- In non-production, also outputs to console via `pino-pretty` at `debug` level.
- **No rotation, no max size, no date-based archiving.** The file grows indefinitely.
- The `logs/` directory is gitignored.
- The logger is imported in 5 server action files (gastos, ventas, lotes, dashboard, clientes) via `import { logger } from '@/infrastructure/pino-logger'`.
- Usage pattern: `logger.error(...)`, `logger.warn(...)`, `logger.info(...)` — standard Pino API, no custom wrapper needed.

### Dependency versions (from package.json):

- `pino`: `^9.7.0` (resolved: 9.14.0)
- `pino-pretty`: `^13.1.3` (devDependency)

### Infrastructure layer structure:

```
src/infrastructure/
├── auth.ts
├── db.ts
├── pino-logger.ts
└── repositories/
```

---

## 2. Logger Usage Across Codebase

| File | Import | Usage |
|------|--------|-------|
| `src/presentation/actions/gastos.ts` | `import { logger } from '@/infrastructure/pino-logger'` | `logger.error(...)` in catch blocks |
| `src/presentation/actions/ventas.ts` | `import { logger } from '@/infrastructure/pino-logger'` | `logger.info(...)`, `logger.warn(...)`, `logger.error(...)` |
| `src/presentation/actions/lotes.ts` | `import { logger } from '@/infrastructure/pino-logger'` | Error logging in catch blocks |
| `src/presentation/actions/dashboard.ts` | `import { logger } from '@/infrastructure/pino-logger'` | Error logging in catch blocks |
| `src/presentation/actions/clientes.ts` | `import { logger } from '@/infrastructure/pino-logger'` | Error logging in catch blocks |

**Impact**: All consumers import the named export `{ logger }` from `@/infrastructure/pino-logger`. The change only needs to modify the logger module itself — no call-site changes required.

---

## 3. Log Rotation Approaches — Analysis

### Approach A: `pino-roll` (Pino transport plugin)

| Aspect | Detail |
|--------|--------|
| **How it works** | Pino v7+ transport target. Replaces `pino/file` in the `targets` array. Rotates by file size or time interval. |
| **npm** | `pino-roll` v4.0.0 |
| **Integration** | Drop-in replacement for `pino/file` target in existing `pino.transport()` config |
| **Rotation triggers** | Size (`size: '10M'`) or interval (`interval: '1d'`) |
| **File naming** | Supports patterns like `app-%Y-%m-%d.log` or `app.log.1` |
| **Compression** | Built-in gzip support |
| **Pros** | Purpose-built for Pino; uses worker threads (same architecture as current logger); minimal code change; maintained by Pino ecosystem |
| **Cons** | Relatively young package (v4); community is smaller than `rotating-file-stream`; must run as transport target (which we already do) |
| **Code change** | Small — swap `pino/file` for `pino-roll` in the transport targets, add rotation options |

**Example integration:**

```typescript
const transport = pino.transport({
  targets: [
    {
      target: 'pino-roll',
      options: {
        file: path.join(LOG_DIR, 'app'),
        size: '10M',
        frequency: 1000 * 60 * 60 * 24, // daily
        mkdir: true,
      },
      level: 'info',
    },
    // ... pino-pretty unchanged
  ],
});
```

### Approach B: `rotating-file-stream`

| Aspect | Detail |
|--------|--------|
| **How it works** | Standalone rotating file stream. Can be piped to Pino as a destination. |
| **npm** | `rotating-file-stream` v3.2.9 |
| **Integration** | Replace `pino/file` with `rotating-file-stream` as a custom stream, OR use it via a Pino transport worker |
| **Rotation triggers** | Size, interval (daily/weekly/monthly), or both |
| **File naming** | Rich naming patterns with date tokens |
| **Compression** | Built-in gzip support |
| **Pros** | Mature, battle-tested, large user base; flexible rotation rules; well-documented |
| **Cons** | Not a native Pino transport — requires wrapping as a Pino destination stream or creating a custom transport worker; adds complexity to the transport setup; doesn't use Pino's worker thread model directly |
| **Code change** | Medium — need to create a stream wrapper or custom transport worker |

**Example integration (as stream destination):**

```typescript
import rfs from 'rotating-file-stream';

const stream = rfs.createStream('app.log', {
  size: '10M',
  interval: '1d',
  path: LOG_DIR,
  compress: 'gzip',
});

const logger = pino(stream);
// But this loses pino.transport() worker thread isolation
// and the multi-target setup
```

To keep multi-target, would need a custom transport worker that uses `rotating-file-stream` internally — significantly more code.

### Approach C: Custom file stream with size/date rotation

| Aspect | Detail |
|--------|--------|
| **How it works** | Write a Node.js Transform stream that checks file size on each write and rotates when threshold is met |
| **Integration** | Custom transport target |
| **Pros** | Full control; no extra dependencies |
| **Cons** | Must handle edge cases (atomic rename, concurrent writes, compression, cleanup); reinventing the wheel; maintenance burden; race conditions on rotation |
| **Code change** | Large — new module, tests, and ongoing maintenance |

### Approach D: OS-level `logrotate`

| Aspect | Detail |
|--------|--------|
| **How it works** | External Linux utility watches log files and rotates them per config |
| **Integration** | Create `/etc/logrotate.d/pagina-riquesos` config; no code changes |
| **Pros** | Zero code change; battle-proven; separates concerns |
| **Cons** | Not available on Windows (deployment is via `.bat` script per PRD); requires server-level config outside the app; Pino `pino/file` uses `fs.appendFileSync` inside a worker — logrotate may interfere; adds ops burden for a non-technical user |
| **Code change** | None to code, but requires sysadmin setup |

---

## 4. Recommendation

### Recommended: Approach A — `pino-roll`

**Rationale:**

1. **Minimal disruption**: The current logger already uses `pino.transport()` with target-based multi-channel output. Replacing `pino/file` with `pino-roll` is a 2-line change in the targets array.

2. **Architecture fit**: `pino-roll` is a Pino transport plugin, so it runs in a worker thread — exactly matching the current async logging architecture. No need to abandon the `pino.transport()` pattern.

3. **PRD alignment**: The project deploys locally via `.bat` script on what appears to be a Windows machine. OS-level logrotate (Approach D) is not viable. The rotation MUST be in-process.

4. **Zero call-site changes**: All 5 consumer files import `{ logger }` from the same path. The only file that changes is `pino-logger.ts`.

5. **Appropriate scope**: This is a small LAN app for a cheese distributor. `pino-roll` provides size-based + date-based rotation and optional gzip compression — exactly what's needed, nothing more.

6. **Over-engineering avoidance**: Approach C (custom stream) adds maintenance burden for zero benefit. Approach B (`rotating-file-stream`) adds integration complexity to keep the transport architecture. `pino-roll` is the right tool for this job.

### Configuration defaults to propose:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `size` | `10M` | 10 MB per file — reasonable for LAN debugging; 10 files = ~100 MB total |
| `frequency` | Daily (24h) | Rotates at least once per day even if size threshold not hit |
| `compress` | `gzip` | Compress old logs to save disk space on a local server |
| `maxFiles` | 10 | Keep ~10 rotated files (~100 MB worst case), auto-delete older ones |

---

## 5. Risks and Considerations

1. **`pino-roll` maturity**: v4.0.0 is functional but less battle-tested than `rotating-file-stream`. Mitigation: the project's logging needs are simple (one file, moderate volume), and `pino-roll` is purpose-built for this exact use case within the Pino ecosystem.

2. **Worker thread startup**: `pino.transport()` spins up a worker thread. `pino-roll` runs inside that worker. This is already the current architecture — no regression.

3. **No `.gitignore` change needed**: `logs/` is already gitignored. Rotated files (e.g., `app.1.log.gz`) will also be in `logs/` and thus gitignored.

4. **Windows compatibility**: The project runs on Windows (`.bat` script). `pino-roll` is pure Node.js — no OS-specific behavior.

5. **Fallback if `pino-roll` doesn't meet needs**: Can migrate to `rotating-file-stream` with a custom transport worker later. The interface (`export const logger`) stays the same.

---

## 6. Implementation Scope

**Files to modify**: 1
- `src/infrastructure/pino-logger.ts` — swap `pino/file` target for `pino-roll` with rotation config

**Files to create**: 0

**New dependencies**: 1
- `pino-roll` (production dependency)

**Files that import the logger (no changes needed)**: 5
- `src/presentation/actions/gastos.ts`
- `src/presentation/actions/ventas.ts`
- `src/presentation/actions/lotes.ts`
- `src/presentation/actions/dashboard.ts`
- `src/presentation/actions/clientes.ts`

**Estimated line change**: ~5-8 lines modified in `pino-logger.ts`

---

## 7. Key Technical Details for Design Phase

- Pino version: 9.7+ (transport API is stable)
- Current transport uses `pino/file` with `destination` option — `pino-roll` uses `file` option (base name without extension)
- `pino-roll` auto-appends `.log` and date/sequence suffixes
- The `pino-pretty` console target in dev mode is completely unaffected
- `pino-roll` supports `tee`-like behavior if we later want multiple rotated files (not needed now)
