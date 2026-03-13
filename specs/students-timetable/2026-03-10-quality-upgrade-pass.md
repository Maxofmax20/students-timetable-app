# Spec: Quality + product-value upgrade pass

- **Spec ID:** students-timetable-2026-03-10-quality-upgrade-pass
- **Project:** students-timetable
- **Status:** Approved
- **Owner:** dev:main
- **Created:** 2026-03-10
- **Last Updated:** 2026-03-10

## 1) Problem Statement
Students Timetable is now strong and production-stable, but the product needs one coordinated pass to raise quality and usefulness: finish a real live QA sweep, clean repo hygiene safely, add smarter filtering and reusable saved views, improve timetable intelligence, support bulk import, and upgrade project documentation.

## 2) Goals
- Produce a real live QA baseline and fix any critical/high blockers before feature work.
- Clean safe repo hygiene leftovers without destabilizing production.
- Add smart filters and saved views that fit the current information architecture.
- Improve timetable intelligence without reopening architecture work.
- Add bulk import support for practical scheduling workflows.
- Upgrade README/docs so the project is easier to understand, run, and evolve.

## 3) Non-Goals
- No PWA/runtime/install work.
- No unrelated redesign.
- No destructive data changes without explicit deterministic migration/backup path.
- No architecture rollback of the current course/session, group hierarchy, or structured room model.

## 4) Scope
### In Scope
- Live QA across public + authenticated surfaces
- Safe repo cleanup of known leftovers and stale helper files
- Filter/view UX and supporting API/state wiring
- Timetable intelligence improvements within the current data model
- Bulk import flow and supporting parsing/validation
- README and project documentation upgrade

### Out of Scope
- PWA/runtime/install code
- unrelated route redesign
- speculative platform features outside the listed workstreams

## 5) Constraints & Assumptions
- Canonical live repo path remains `/home/ubuntu/.openclaw/workspace/students-timetable-app`.
- Runtime remains `students-timetable.service`.
- Production must remain stable throughout.
- Current stable baseline includes: auth fixes, multi-session course model, group hierarchy, structured rooms, grouped/collapsible Rooms and Groups UI.

## 6) Deliverables
- QA issue list with severity and fixes for critical/high blockers.
- Safe repo hygiene cleanup.
- Smart filters.
- Saved views.
- Timetable intelligence improvements.
- Bulk import support.
- Upgraded README/docs.
- Clean build, deploy, verification, and final coherent commit(s).

## 7) Acceptance Criteria
- [ ] AC1: Full live QA sweep completed with real issue list.
- [ ] AC2: Critical/high blockers found during QA are fixed before later workstreams continue.
- [ ] AC3: Repo hygiene cleanup removes only safe, confirmed leftovers.
- [ ] AC4: Smart filters + saved views are implemented and usable.
- [ ] AC5: Timetable intelligence is improved without breaking current scheduling behavior.
- [ ] AC6: Bulk import support works with clear validation/error handling.
- [ ] AC7: README/docs are materially improved.
- [ ] AC8: Build passes, production restart succeeds, live verification passes, and VPS/GitHub stay synced.

## 8) Implementation Plan (Task Breakdown)
- [ ] T1 — Final live QA sweep + severity triage
- [ ] T2 — Fix any critical/high QA blockers
- [ ] T3 — Repo hygiene cleanup
- [x] T4 — Smart filters design + implementation
- [x] T5 — Saved views design + implementation
- [ ] T6 — Timetable intelligence improvements
- [ ] T7 — Bulk import support
- [ ] T8 — README/docs upgrade
- [ ] T9 — Final build, deploy, verification, report

## 9) Worker Delegation Notes
- Implement only approved scope; flag gaps instead of inventing scope.
- Use sub-agents where useful for QA review and documentation review, but do not let them change live state directly.

## 10) Verification & Report
- Build/test commands: pending implementation
- Verification results: pending implementation
- Remaining risks/follow-ups: pending implementation
