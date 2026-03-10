# Spec: Students Timetable — Batch 2 Timetable Intelligence

- **Spec ID:** students-timetable-2026-03-10-batch-2-timetable-intelligence
- **Project:** students-timetable
- **Status:** Approved
- **Owner:** main assistant
- **Created:** 2026-03-10
- **Last Updated:** 2026-03-10

## 1) Problem Statement
Batch 2 timetable intelligence shipped functionally, but the new timetable board rendering is not yet production-polished enough for dense real schedules. The intelligence controls and filtering direction are correct and must remain, but the weekly grid currently packs too much content into small cards, causing cramped layouts, unreadable text, and visually unstable overlap behavior, especially on mobile and on dense days. This pass must keep the Batch 2 feature set while making the board readable, stable, and safe for production use.

## 2) Goals
- Preserve the shipped timetable intelligence controls and filtering behavior.
- Fix card overlap/stacking so dense timetable columns remain visually stable.
- Prioritize card content so small cards show only the most important information first.
- Improve compact mode and adaptive density so smaller cards degrade gracefully instead of breaking.
- Improve mobile timetable usability with a realistic dense-schedule fallback if needed.

## 3) Non-Goals
- Bulk import, docs, README, auth, or later batches.
- Reopening schema/model architecture or data migrations.
- PWA, install prompts, runtime, service worker, or other risky production-scope changes.
- Removing the new timetable intelligence feature set or reverting to the old simpler timetable.
- Visual redesigns outside the timetable rendering surface.

## 4) Scope
### In Scope
- Timetable rendering/layout updates inside the existing Batch 2 surface.
- Card density/content prioritization rules.
- Overlap layout improvements and adaptive rendering for dense cases.
- Mobile-specific rendering simplification or safe tap-for-details behavior if needed.
- Keeping conflict visibility only if it remains compatible with the rendering cleanup.

### Out of Scope
- Course/Curriculum redesign.
- Resource-page filters beyond what Batch 1 already shipped.
- Data migrations or schema changes for this pass.
- Any production restart until build and verification are green.

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
- A corrected timetable board that keeps the Batch 2 intelligence controls while fixing dense-card readability and overlap stability.
- Build-green code for the rendering correction pass.
- Verification notes covering desktop + mobile readability and compatibility with the existing intelligence controls.

## 7) Acceptance Criteria
- [ ] AC1: The timetable still retains session-type controls, group/subgroup focus, delivery-mode filtering, visible-session count, conflict toggle, and reset behavior.
- [ ] AC2: Overlapping or adjacent sessions no longer look visually broken; lane layout remains readable on dense days.
- [ ] AC3: Card content adapts by available size/density, prioritizing type, course code/title, and time before secondary metadata.
- [ ] AC4: Compact mode is meaningfully more readable and less cluttered than the normal dense case instead of simply shrinking broken content.
- [ ] AC5: Mobile timetable rendering is usable and does not collapse into unreadable text pileups; a reduced-detail or tap-for-details fallback is acceptable if clean.
- [ ] AC6: Desktop timetable rendering is cleaner and more stable while preserving current intelligence/filter behavior.
- [ ] AC7: `npm run build` passes and production remains stable after deployment.

## 8) Implementation Plan (Task Breakdown)
- [ ] T1 — Patch the Batch 2 spec to lock this pass to timetable rendering fixes only.
  - **Owner:** main assistant
  - **Output:** updated approved spec with rendering-specific goals and acceptance criteria
  - **Acceptance Check:** scope explicitly preserves intelligence controls and excludes unrelated systems
- [ ] T2 — Rework timetable board rendering and card density behavior in the existing timetable surface.
  - **Owner:** main assistant
  - **Output:** code changes limited to timetable page/rendering helpers/components
  - **Acceptance Check:** dense columns, compact mode, and mobile rendering become visibly more readable without removing Batch 2 features
- [ ] T3 — Verify compatibility, build, and production stability.
  - **Owner:** main assistant
  - **Output:** build/verification/deploy report with desktop and mobile checks
  - **Acceptance Check:** AC1–AC7 are verified honestly and the repo is committed/pushed in sync with VPS

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
