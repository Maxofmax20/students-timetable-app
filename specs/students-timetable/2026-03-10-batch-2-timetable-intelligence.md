# Spec: Students Timetable — Batch 2 Timetable Intelligence

- **Spec ID:** students-timetable-2026-03-10-batch-2-timetable-intelligence
- **Project:** students-timetable
- **Status:** Approved
- **Owner:** main assistant
- **Created:** 2026-03-10
- **Last Updated:** 2026-03-10

## 1) Problem Statement
The timetable page needs a safe, production-ready intelligence layer so users can focus the weekly board by session type, academic group hierarchy, and delivery mode without leaving the timetable. A partial implementation was started in a prior session, but it was not build-green, was not committed, and was never deployed. Batch 2 must finish the strongest safe subset without destabilizing production.

## 2) Goals
- Add clear session-type visibility controls for Lecture, Section, Lab, Online, and Hybrid sessions.
- Add group-focused timetable filtering that respects the shipped group hierarchy model.
- Add delivery-mode filtering that works cleanly with the current session model.
- Add an active-filter summary and one-step reset flow.
- Optionally expose conflict visibility only if it fits cleanly and does not block the rest of Batch 2.

## 3) Non-Goals
- Bulk import, docs, README, or later batches.
- Reworking timetable architecture outside the safe insertion points already identified.
- PWA, install prompts, runtime, service worker, or other risky production-scope changes.
- Large visual redesign unrelated to Batch 2 timetable intelligence.

## 4) Scope
### In Scope
- Timetable-page state and filter controls.
- Schedule-item shaping only as needed to support Batch 2 controls.
- Timetable rendering updates required to display the safe Batch 2 subset.
- Conflict visibility only if it remains low-risk and build-green.

### Out of Scope
- Course/Curriculum redesign.
- Resource-page filters beyond what Batch 1 already shipped.
- Data migrations or schema changes for Batch 2.
- Production rollout until build/tests/local verification are green.

## 5) Constraints & Assumptions
- Tech constraints:
  - Canonical live repo/path is `/home/ubuntu/.openclaw/workspace/students-timetable-app`.
  - Production runtime is managed by systemd service `students-timetable.service`.
  - Safe insertion points are already known: timetable page owns fetch/state, `src/lib/schedule.ts` owns schedule-item mapping, and `TimetableView.tsx` owns rendering.
- Time/resource constraints:
  - Finish Batch 2 only; do not spill into later batches.
  - Ship the strongest safe subset first.
- Assumptions:
  - Session types already exist in the data model (`LECTURE|SECTION|LAB|ONLINE|HYBRID`).
  - Group hierarchy is already live via parent/main group + subgroup data.
  - If conflict visibility introduces risk or blocks completion, it can be deferred from the must-ship subset.

## 6) Deliverables
- Batch 2 timetable intelligence implementation in the timetable page + schedule/timetable view helpers.
- Build-green code for the approved safe subset.
- Verification notes covering the delivered controls and any deferred conflict behavior.

## 7) Acceptance Criteria
- [ ] AC1: Users can toggle session-type visibility for Lecture, Section, Lab, Online, and Hybrid sessions directly from the timetable page.
- [ ] AC2: Users can focus the timetable by academic group hierarchy, including a main-group view and subgroup-focused view using the existing shipped group model.
- [ ] AC3: Users can filter the timetable by delivery mode with at least All, Physical only, and Online only; Hybrid only may ship if it stays clean.
- [ ] AC4: The timetable shows an active filter summary and provides a one-step reset that restores the default full-week view.
- [ ] AC5: The Batch 2 implementation is build-green and verified locally before any production rollout.
- [ ] AC6: Conflict visibility only ships if it remains low-risk, understandable, and does not block AC1–AC5.

## 8) Implementation Plan (Task Breakdown)
- [ ] T1 — Finalize the approved Batch 2 surface and align the unfinished local timetable work with the accepted scope.
  - **Owner:** planner worker
  - **Output:** approved spec + task boundaries for Batch 2 only
  - **Acceptance Check:** spec clearly defines must-ship subset vs optional conflict visibility
- [ ] T2 — Implement the safe timetable intelligence subset in the canonical repo.
  - **Owner:** builder worker
  - **Output:** code changes in timetable page/rendering/helpers limited to approved Batch 2 scope
  - **Acceptance Check:** session-type controls, group/subgroup focus, delivery filtering, and active summary/reset are implemented without touching out-of-scope systems
- [ ] T3 — Resolve build/type issues and keep conflict visibility only if it stays low-risk.
  - **Owner:** builder worker
  - **Output:** build-green Batch 2 branch/worktree state with conflict layer either cleanly shipped or explicitly deferred in code/report
  - **Acceptance Check:** `npm run build` passes and no unfinished Batch 2 code path is left half-wired
- [ ] T4 — Verify the delivered subset against acceptance criteria and decide whether production rollout is safe.
  - **Owner:** verifier/main assistant
  - **Output:** pass/fail report against AC1–AC6 and rollout recommendation
  - **Acceptance Check:** verification report explicitly lists done / not done / deferred items

## 9) Worker Delegation Notes
- Approved spec path: `/home/ubuntu/.openclaw/workspace/students-timetable-app/specs/students-timetable/2026-03-10-batch-2-timetable-intelligence.md`
- Workers must implement only approved scope.
- Any scope change requires spec update + approval before coding.
- Do not use `/home/ubuntu/timetable` for production work.
- Do not touch PWA/runtime/install/service-worker code.

## 10) Verification & Report
- Build/test commands:
  - `npm run build`
- Verification results:
  - Pending
- Remaining risks/follow-ups:
  - Optional conflict visibility may be deferred if it meaningfully increases implementation or verification risk.
