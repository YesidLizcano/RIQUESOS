# Proposal: Log Rotation

## Intent

The Pino logger writes to `logs/app.log` with no rotation — the file grows indefinitely. On a local LAN deployment with no cloud console, all debugging relies on local log files. Unbounded growth will eventually fill the disk and make logs unusable. This change adds automatic log rotation so files stay manageable.

## Scope

### In Scope
- Replace `pino/file` transport target with `pino-roll` in `pino-logger.ts`
- Configure size-based rotation (10 MB) and daily time-based rotation
- Configure gzip compression for rotated files
- Configure max file retention (10 rotated files)
- Add `pino-roll` as a production dependency

### Out of Scope
- Custom transport streams or `rotating-file-stream` integration
- OS-level `logrotate` configuration
- Log shipping to remote services
- Log search/filter tooling
- Changes to log format or log levels

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `local-logging`: Adding log rotation requirements to the existing Pino logger specification. The current spec requires writing to `logs/app.log` but has no rotation or size constraints. This change adds rotation behavior requirements.

## Approach

Swap `pino/file` for `pino-roll` in the `pino.transport()` targets array. `pino-roll` is a native Pino transport target that runs in the same worker-thread architecture already in use. Configuration: 10 MB size limit, daily rotation, gzip compression, 10-file retention. This is the minimal-change approach — ~5-8 lines modified in a single file, zero call-site changes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/infrastructure/pino-logger.ts` | Modified | Swap `pino/file` target for `pino-roll` with rotation config |
| `package.json` | Modified | Add `pino-roll` production dependency |
| `.gitignore` | Modified | Add `logs/*.log` pattern (currently only `logs/` is gitignored — rotation creates named patterns worth documenting) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `pino-roll` is less mature than alternatives | Low | Pino ecosystem plugin; simple LAN use case; fallback to `rotating-file-stream` if needed |
| `pino-roll` `file` option differs from `pino/file` `destination` | Low | Caught at implementation — `file` takes base name without extension, `pino-roll` appends `.log` |
| Rotated files fill disk on low-storage server | Low | `maxFiles: 10` caps total storage (~100 MB); gzip compression reduces further |

## Rollback Plan

Revert `pino-logger.ts` to use `pino/file` target (2-line change) and remove `pino-roll` from dependencies. The existing `logs/` directory continues working. No data loss — rotated files remain readable.

## Dependencies

- `pino-roll` npm package (production dependency)

## Success Criteria

- [ ] Log files rotate when exceeding 10 MB or after 24 hours
- [ ] Rotated files are gzip-compressed
- [ ] No more than 10 rotated files retained
- [ ] All 5 existing consumer files work with zero import changes
- [ ] `pino-pretty` dev console output unchanged