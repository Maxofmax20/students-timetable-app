# Batch A Spec — Cleanup + Production Hygiene

**Date:** 2026-03-12  
**Scope:** Batch A only (data cleanup + surface copy hygiene)  
**Repo:** `students-timetable-app`

## 1) Problem
Live data currently contains clear QA/demo noise (many throwaway workspaces like "My Workspace", "Debug WS", timestamped "Polish Workspace ..."). This makes production UI look like a test sandbox.

## 2) Objective
Clean obvious temporary QA/test/demo artifacts while preserving plausible real data.

## 3) Non-Goals
- No feature work
- No schema/database migrations
- No broad ambiguous deletions
- No auth/permissions redesign

## 4) Safety Rules
1. Delete only records with strong QA/demo signals.
2. Prefer exact-id / exact-name targeting over wildcard mass deletion.
3. Keep any record that may be real user data.
4. Keep latest/active plausible workspace(s) intact.
5. Re-check counts before and after cleanup.

## 5) Investigation Plan
- Inspect production DB data in these domains:
  - workspaces/history/audit
  - groups
  - instructors
  - rooms
  - sharing/members
  - obvious seeded artifacts
- Classify each candidate as:
  - **Safe delete** (obvious test/demo)
  - **Keep** (plausible real)
  - **Ambiguous** (do not delete in Batch A)

## 6) Implementation Plan
1. Build a one-off cleanup script under `scripts/` with explicit predicates for QA/demo entries.
2. Execute in dry-run mode first (log candidate IDs + counts).
3. Execute real cleanup only for safe candidates.
4. Keep deletion narrow (workspace-level cleanup where workspace title is explicit QA/demo pattern and clearly stale).
5. Spot-check UI labels/copy for leftover QA wording and fix only obvious text issues if found.

## 7) Acceptance Criteria
- Obvious QA/demo workspace noise removed from production-visible lists.
- Related dependent data for removed QA workspaces cleaned by cascade safely.
- No deletion of plausible real workspaces/data.
- App remains healthy after cleanup.
- If code changed, build passes and service health checks pass.

## 8) Verification
- DB before/after counts + sampled title lists.
- UI spot-check (desktop + mobile viewport) that noisy test entries no longer dominate.
- Service health check (`students-timetable.service`) and smoke verification.

## 9) Rollback / Risk Handling
- If uncertainty about any candidate, skip deletion and report.
- If cleanup appears risky mid-run, stop immediately and report current safe state.
