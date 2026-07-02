# Design: Log Rotation

## Technical Approach

Replace the `pino/file` transport target with `pino-roll` in `pino-logger.ts`, configuring size-based rotation (10 MB), 10-file retention, and daily frequency as a secondary trigger. This is a minimal change: ~6 lines modified in one file, plus a dependency addition. No call-site changes required — the exported `logger` interface is untouched.

**Spec alignment**: Covers all spec scenarios — size-based rotation, max file retention, dev output preservation, and auto-directory creation. One deviation: gzip compression is **deferred** (see Decision 3).

## Architecture Decisions

### Decision: Rotation library

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `pino-roll` | Native Pino transport, worker-thread, same API surface | ✅ Chosen |
| `rotating-file-stream` | More features but not a Pino transport, requires stream wrapper | ❌ Rejected |
| OS `logrotate` | External process, no Node integration | ❌ Rejected |

**Rationale**: `pino-roll` is a native Pino transport target — drops into the existing `pino.transport()` call identically, runs in the same worker-thread architecture, and requires zero structural changes.

### Decision: Rotation strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Size-only (10 MB) | Predictable disk cap, simple | Considered |
| Size + daily | Best of both — rotates on size OR time | ✅ Chosen |
| Time-only | Unbounded per-day size risk | ❌ Rejected |

**Rationale**: Size + daily ensures logs never exceed 10 MB per file AND rotate at least once per day. Matches the proposal's intent. `pino-roll` supports both natively.

### Decision: Gzip compression

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Skip gzip for now | pino-roll has no built-in gzip support | ✅ Chosen |
| Custom transport module wrapping pino-roll | Adds complexity, defeats "minimal change" goal | ❌ Deferred |
| Post-rotation cron script | Works but outside app scope | Consider for future |

**Rationale**: `pino-roll` does NOT support gzip compression natively. Implementing it would require a custom transport wrapper module, adding significant complexity for a small change. With 10 files × 10 MB cap, total worst case is ~100 MB — acceptable for a LAN deployment. Gzip can be added later via a custom transport if needed.

## Data Flow

```
Application code
      │
      │ logger.info(…)
      ▼
  pino-logger.ts
      │
      │ pino.transport({ targets: [...] })
      ▼
  ┌─────────────────────────────────┐
  │ Worker Thread                    │
  │  ┌─────────────────────────────┐ │
  │  │ pino-roll (file target)     │ │
  │  │  • file: logs/app           │ │
  │  │  • size: 10 (MB)            │ │
  │  │  • frequency: daily         │ │
  │  │  • limit: { count: 10 }     │ │
  │  │  • mkdir: true              │ │
  │  └─────────────────────────────┘ │
  │         │ writes                 │
  │         ▼                        │
  │  logs/app          (active)      │
  │  logs/app.1.log    (rotated)     │
  │  logs/app.2.log    (rotated)     │
  │  ...                             │
  │  logs/app.10.log   (oldest)      │
  └─────────────────────────────────┘
  ┌──────────────────┐
  │ pino-pretty      │  ← dev only, unchanged
  │ (console target) │
  └──────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/infrastructure/pino-logger.ts` | Modify | Replace `pino/file` target with `pino-roll`; add `size`, `frequency`, `limit` options; remove manual `fs.mkdirSync` (pino-roll's `mkdir: true` handles it) |
| `package.json` | Modify | Add `pino-roll` as a production dependency |
| `.gitignore` | No change | `/logs/` already covers all rotated files — no modification needed |

## Interfaces / Contracts

The exported interface is **unchanged**:

```typescript
// pino-logger.ts — no API change
export const logger: pino.Logger;
export default logger;
```

New `pino-roll` transport configuration inside `pino-logger.ts`:

```typescript
{
  target: 'pino-roll',
  options: {
    file: path.resolve(process.cwd(), 'logs/app'),
    size: 10,            // 10 MB
    frequency: 'daily',
    limit: { count: 10 },
    mkdir: true,
  },
  level: 'info',
}
```

**Note**: `file` is the base path WITHOUT extension. `pino-roll` appends `.1.log`, `.2.log`, etc. on rotation. The active file will be `logs/app` (no `.log` suffix). This differs from the current `logs/app.log` naming. To preserve the `.log` extension on the active file, set `extension: '.log'`.

**Revised config**:

```typescript
{
  target: 'pino-roll',
  options: {
    file: path.resolve(process.cwd(), 'logs/app'),
    size: 10,
    frequency: 'daily',
    extension: '.log',
    limit: { count: 10 },
    mkdir: true,
  },
  level: 'info',
}
```

This produces: `logs/app` (active), `logs/app.1.log`, `logs/app.2.log`, etc.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Logger creates transport with correct options | Import logger, verify transport config properties |
| Unit | pino-roll creates `logs/` directory | Integration test: start logger, assert `logs/` exists |
| Integration | Rotation triggers at size limit | Manual: write >10 MB, verify file rotates |
| E2E | Dev mode still shows pretty console | Manual: `NODE_ENV=development` run, check console output |

Note: Project has no automated test harness for infrastructure. Testing will be manual verification until one is added.

## Migration / Rollout

1. Install `pino-roll`: `npm install pino-roll`
2. Modify `pino-logger.ts` — swap transport target
3. Remove manual `fs` import and `mkdirSync` block (pino-roll handles directory creation)
4. Restart application
5. Verify `logs/` is created and log output writes to `logs/app`

**Rollback**: Revert `pino-logger.ts` to `pino/file` target (2-line change), remove `pino-roll` dependency. No data loss.

## Open Questions

- [ ] Should the active log file be named `app` (pino-roll default) or `app.log`? Setting `extension: '.log'` gives `app.1.log` for rotated files, but the active file is still `app` with no extension. This is pino-roll's standard behavior.