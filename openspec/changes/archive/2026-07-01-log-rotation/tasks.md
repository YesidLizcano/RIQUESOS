# Tasks: Log Rotation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 30-50 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | size-exception (N/A — under budget) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Swap pino/file → pino-roll with rotation config | PR 1 | Single PR; includes dependency, config, cleanup |

## Phase 1: Implementation

- [x] 1.1 Install `pino-roll` as production dependency (`npm install pino-roll`)
- [x] 1.2 Update `src/infrastructure/pino-logger.ts` — replace `pino/file` target with `pino-roll` transport, configure `file: 'logs/app'`, `size: 10`, `frequency: 'daily'`, `extension: '.log'`, `limit: { count: 10 }`, `mkdir: true`; remove manual `fs.mkdirSync` block and `fs` import (pino-roll handles directory creation)
- [x] 1.3 Remove unused `LOG_FILE` constant (keep `LOG_DIR` only if still needed, or remove both)

## Phase 2: Verification

- [x] 2.1 Start the app and verify `logs/` directory is auto-created and active log writes to `logs/app`
- [x] 2.2 Verify dev mode (`NODE_ENV !== 'production`) still shows `pino-pretty` console output unchanged
- [x] 2.3 Confirm `.gitignore` covers rotated files (`/logs/` already present — no change needed)