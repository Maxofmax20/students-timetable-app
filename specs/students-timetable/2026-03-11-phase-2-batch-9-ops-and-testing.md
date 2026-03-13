# Students Timetable — Phase 2 Batch 9 Spec: Ops and Testing Improvements

- Date: 2026-03-11
- Status: Draft (planning only; no implementation in this run)
- Scope lock: Batch 9 only (ops/testing improvements)
- Baseline before Batch 9: `5d20defeb025530a9f2dc8fd0904ed34872e4bb1` (accepted Batch 8 closeout)

## 1) Git status (inspected first)
- Command: `git status --short --branch`
- Result at planning time:
  - `## master...origin/master`
- Interpretation: clean working tree, no staged/unstaged/untracked changes.

## 2) Current baseline findings relevant to Batch 9

### 2.1 Existing scripts/testing/verification surfaces (real state)
- `package.json` scripts currently only include: `dev`, `build`, `start`, `lint`.
- No first-class `test`, `smoke`, `verify`, `health`, or `release:check` npm scripts yet.
- Existing verification artifacts:
  - `e2e-test.mjs` (local puppeteer flow, broad UI walk; not structured as release smoke command).
  - `scripts/batch7_closeout_verify.mjs` (live verification helper, but currently contains hardcoded credentials and batch-specific logic; unsuitable as-is for reusable Batch 9 ops tooling).
- Existing ops scripts are mostly data-migration/backups:
  - `scripts/backup_postgres.sh`
  - `scripts/merge-course-sessions.mjs`
  - `scripts/normalize-groups-and-rooms.mjs`
  - `scripts/migrate_sqlite_to_postgres.py`
- No dedicated deploy-health script that checks build/runtime/routes in one pass with explicit pass/fail summary.

### 2.2 Existing deployment/health/release documentation surfaces
- `README.md` provides deployment flow + manual health commands (`/api/health`, `/auth`, `/workspace`).
- `docs/operations.md` mirrors deployment + health commands and backup notes.
- No single scripted post-deploy verification workflow currently documented as a repeatable command sequence tied to script outputs.
- `start_app.sh` points to old path (`/home/ubuntu/timetable`) and legacy process style; not canonical for current service-based production flow.

### 2.3 App/runtime surfaces to cover in Batch 9 smoke/regression
Critical route/UI surfaces present and in active use:
- Auth: `/auth`
- Workspace shells/pages:
  - `/workspace`
  - `/workspace/dashboard`
  - `/workspace/timetable`
  - `/workspace/courses`
  - `/workspace/groups`
  - `/workspace/rooms`
  - `/workspace/instructors`
  - `/workspace/sharing`
  - `/workspace/history`
- API surfaces for route-backed data and permission checks:
  - `/api/health`
  - `/api/v1/auth/me`
  - `/api/v1/courses`
  - `/api/v1/groups`
  - `/api/v1/rooms`
  - `/api/v1/instructors`
  - `/api/v1/saved-views`
  - `/api/v1/workspaces/:id/members`
  - `/api/v1/workspaces/:id/history`
  - import endpoints (`/api/v1/import/*`)

### 2.4 Current gaps/risk points this batch should target
1. No single command for high-value smoke/regression checks.
2. No single command for deploy/runtime health checks.
3. Existing verification scripts are either too broad/noisy or unsafe for reuse (hardcoded credentials).
4. No explicit stale-build/runtime mismatch detection command (e.g., commit/build fingerprint check).
5. Release confidence depends on manual, ad-hoc operator memory rather than a short deterministic checklist.

## 3) Batch 9 strongest safe subset (scope-limited recommendation)

Implement a focused, honest, low-risk ops/testing layer with four deliverables:

1. **Main smoke command** (`npm run verify:smoke`) for critical path route/API checks + limited authenticated browser smoke.
2. **Deploy health command** (`npm run verify:health`) for build artifact sanity + service/runtime + health endpoint + critical route reachability.
3. **Post-deploy verification runner/checklist** (`npm run verify:release`) that composes health + smoke and emits explicit pass/fail steps.
4. **Minimal docs updates only where needed** (README/operations section) to make commands operable and honest.

Out of scope:
- New product features, auth redesign, PWA/runtime redesign, architecture rewrites, Phase 3 planning, large CI platform rollout.

## 4) Verification model for Batch 9 (honest coverage)

### 4.1 Smoke/regression minimum coverage matrix
Target strongest honest subset across required flows:
- Auth surface reachability: `/auth` + unauthenticated redirect behavior for `/workspace`.
- Authenticated route loads (browser or HTTP as appropriate):
  - dashboard, timetable, courses, groups, rooms, instructors, imports surface, sharing, history, exports surface, saved views surface.
- API smoke:
  - authenticated `GET` checks for core resources (`courses/groups/rooms/instructors/saved-views/history`).
- Permission-gated checks where feasible and safe:
  - at minimum one negative check asserting non-owner cannot access owner-only member management mutation route.
- Export surface smoke:
  - UI presence check for export actions (not deep file-content validation in this batch).
- Saved views smoke:
  - list endpoint reachability and one non-destructive read flow.

### 4.2 Deploy/health checks minimum coverage
- Build check: verify local `npm run build` success gate prior to restart when deployment includes code changes.
- Runtime/service check: `systemctl is-active`/status for `students-timetable.service`.
- Health endpoint check: `GET /api/health` returns expected JSON shape (`ok: true`).
- Critical route reachability:
  - `/auth`, `/workspace`, `/workspace/dashboard`, `/workspace/timetable`, `/workspace/courses`, `/workspace/history`.
- Stale build/runtime mismatch detection:
  - compare expected git commit hash (deployed source) against runtime-exposed/build-recorded hash (or local build manifest marker produced during deploy-health step).
  - if exact runtime hash introspection cannot be safely implemented, script must explicitly report limitation and fail closed for unknown state.

### 4.3 Release workflow shape
Post-deploy flow must be deterministic:
1. run deploy health checks
2. run smoke checks
3. summarize PASS/FAIL by check name
4. if any fail, return non-zero and stop release signoff
5. print exact verified commit hash

## 5) Implementation order (must be followed)
1. inspect current scripts/testing support/verification artifacts (already completed in planning)
2. define strongest safe Batch 9 subset (this spec)
3. implement scripts/tests/checks (Batch 9 only)
4. run scripts honestly and capture outputs
5. build if needed
6. restart if needed (only after successful build)
7. verify production stability
8. commit
9. push
10. report exact commit hash + verification outcomes

## 6) Concrete task checklist (owner + acceptance criteria)

- [ ] **T1 — Batch 9 verification contract freeze (ops/testing only)**
  - Owner: Planner
  - Acceptance criteria:
    - Scope remains strictly Batch 9 ops/testing improvements.
    - Coverage matrix finalized for critical flows (auth/dashboard/timetable/courses/groups/rooms/instructors/imports/sharing/history/exports/saved-views + feasible permission checks).
    - Explicit non-goals recorded to prevent feature-scope drift.

- [ ] **T2 — Script foundation and npm command surface**
  - Owner: Builder
  - Acceptance criteria:
    - Add organized verification script entrypoints under `scripts/verification/` (or similarly clear structure).
    - Add npm commands for at least:
      - `verify:smoke`
      - `verify:health`
      - `verify:release`
    - Commands return deterministic exit codes and readable pass/fail output.

- [ ] **T3 — Deploy/runtime health checker**
  - Owner: Builder
  - Acceptance criteria:
    - Health script checks service status, `/api/health`, and key route reachability.
    - Includes stale build/runtime mismatch signal or explicit fail-closed limitation message.
    - No secret leakage in logs/output.

- [ ] **T4 — High-value smoke/regression runner**
  - Owner: Builder
  - Acceptance criteria:
    - Covers strongest safe subset of required critical flows.
    - Includes route-level checks and a small number of authenticated browser/API checks.
    - Includes at least one real permission-gated negative assertion.
    - Avoids destructive operations by default; if mutation is needed for validation, uses clearly isolated temporary data with cleanup.

- [ ] **T5 — Release verification runner/checklist integration**
  - Owner: Builder
  - Acceptance criteria:
    - One command orchestrates deploy-health + smoke checks.
    - Output provides explicit per-check PASS/FAIL plus final release decision.
    - Reports exact commit hash being verified.

- [ ] **T6 — Minimal docs updates (ops/testing usability only)**
  - Owner: Builder
  - Acceptance criteria:
    - README and/or `docs/operations.md` updated only with new verification command usage and expected interpretation.
    - Documentation explicitly states what checks do and do not verify (no false confidence language).
    - No broad docs rewrite beyond Batch 9 tooling enablement.

- [ ] **T7 — Batch 9 verification, build/deploy discipline, and final report**
  - Owner: Verifier
  - Acceptance criteria:
    - New ops/testing scripts run successfully in real environment.
    - Smoke/regression coverage is demonstrably useful (not shallow “route only” checks).
    - Deploy/health checks function and catch failure states.
    - Release verification flow is repeatable.
    - No obvious regressions introduced.
    - Mobile/desktop implications acceptable where relevant.
    - Build passes before any restart (if code changes).
    - Production remains stable after verification.
    - GitHub and VPS are synced.
    - Final report includes exact deployed commit hash.

## 7) Risks / open questions (Batch 9 only)
1. **Credential strategy for authenticated smoke**: current repo contains unsafe hardcoded creds in legacy helper. Batch 9 should replace this with env-based ephemeral test credentials or operator-provided runtime input; confirm preferred secure mechanism.
2. **Permission-check realism vs safety**: deep role checks may require multiple accounts. Decide minimum viable role matrix for Batch 9 to keep coverage real without risky account sprawl.
3. **Stale build/runtime detection method**: confirm whether service/runtime can expose commit hash directly (preferred) or if deploy step should write a local runtime marker file consumed by health script.
4. **Live-site browser smoke feasibility**: headless browser checks on VPS must remain lightweight and stable; if flaky, keep a smaller deterministic subset and fail explicitly on uncertain state.
5. **Legacy verification scripts cleanup policy**: decide whether to deprecate/rename existing ad-hoc scripts in Batch 9 or keep them with clear “legacy/manual” labeling to avoid operator confusion.
