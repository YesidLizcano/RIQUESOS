# Tasks: Session Timeout

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~15 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add session timeout + expiry feedback | PR 1 | Single PR; 3 files, ~15 lines |

## Phase 1: Implementation

- [x] 1.1 Add `maxAge: 8 * 60 * 60` to `session` config block in `src/infrastructure/auth.ts`
- [x] 1.2 Update `src/middleware.ts`: detect expired sessions (cookie present + `getToken() === null`) and add `error=SessionExpired` to redirect URL
- [x] 1.3 Update `src/app/login/page.tsx`: read `error` searchParam; display "Tu sesión ha expirado" message when `error=SessionExpired`

## Phase 2: Verification

- [ ] 2.1 Verify `authOptions.session.maxAge === 28800` (unit test or manual check)
- [ ] 2.2 Verify login page shows expiry message when `?error=SessionExpired` param is present
- [ ] 2.3 Verify login page does NOT show expiry message without the error param