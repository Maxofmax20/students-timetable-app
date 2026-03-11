# Spec: Students Timetable — Final Phase Docs, Polish, and Release Closure

- **Spec ID:** students-timetable-2026-03-11-final-phase-docs-polish-release-closure
- **Project:** students-timetable
- **Status:** Approved
- **Owner:** main assistant
- **Created:** 2026-03-11
- **Last Updated:** 2026-03-11

## 1) Problem Statement
The product features for this phase are now shipped across four major areas: auth reliability, course/session model correction, timetable intelligence + UI polish, and CSV bulk import. The repo documentation and release closure materials do not yet accurately reflect the real current product, and the shipped UI still needs one final narrow clarity/polish pass plus a release-grade QA sweep. This final batch must close the phase cleanly without reopening major implementation scope.

## 2) Goals
- Rewrite/upgrade README and supporting docs to match the real current Students Timetable product.
- Do one final narrow product polish sweep focused on wording, labels, help text, and tiny safe clarity issues.
- Run an honest final release verification across the core shipped surfaces.
- Finish in a clean, synced, release-ready state across repo, GitHub, and VPS.

## 3) Non-Goals
- Major architecture changes.
- PWA/runtime/install work.
- New unrelated features.
- Auth changes unless a real regression is found.
- Large visual redesigns.
- Reopening schema/model work.

## 4) Required Phase Order
### Phase 1 — README / docs upgrade
- Replace outdated README with an accurate current overview.
- Add/update supporting docs for import formats, operations, and release summary if useful.
- Add a real `.env.example` / environment template if missing.

### Phase 2 — final product polish sweep
- Limit changes to safe release-closure polish:
  - copy/text clarity
  - consistent labels
  - button/help wording
  - empty-state/help text
  - minor layout or affordance clarity if needed

### Phase 3 — final release verification
- Verify core shipped surfaces honestly on desktop and mobile where practical.
- Confirm README/docs align with the shipped product.
- Build before any restart.

### Phase 4 — cleanup / final sync / final report
- Restart only after successful build if code changed in shipped runtime.
- Ensure repo, GitHub, and VPS are synced.
- Report exact commit hash(es), what changed, what was verified, and any remaining limitations.

## 5) Scope
### In Scope
- README rewrite.
- Supporting docs additions/updates relevant to the shipped phase.
- Safe copy/clarity polish on current product surfaces.
- Final QA sweep across Batch 1–3 shipped capability areas.
- Final cleanup and sync.

### Out of Scope
- New major features.
- New data-model expansion.
- Risky refactors.
- Broad UI redesign.

## 6) Deliverables
- Accurate top-level README.
- Supporting docs for import formats / admin notes / release notes where useful.
- Small safe polish improvements on currently shipped surfaces.
- Honest final release verification notes.
- Final synced repo + GitHub + VPS state.

## 7) Acceptance Criteria
- [ ] AC1: README accurately describes the current product, architecture, canonical repo path, production deployment, and shipped capabilities.
- [ ] AC2: Docs cover import formats/templates and environment/deployment expectations clearly enough for future maintenance.
- [ ] AC3: Final polish sweep improves clarity/consistency without reopening major feature work.
- [ ] AC4: Final verification covers the major shipped capability areas from Batches 1–3.
- [ ] AC5: `npm run build` passes before any restart.
- [ ] AC6: Production remains stable after the final closure pass.
- [ ] AC7: Repo, GitHub, and VPS end in a clean synced state.

## 8) Task Breakdown
- [ ] T1 — Rewrite README and add/update supporting docs.
  - **Owner:** main assistant
  - **Acceptance Check:** outdated canonical path/runtime/deployment facts are corrected and current capabilities are documented.
- [ ] T2 — Perform final narrow product polish sweep.
  - **Owner:** main assistant
  - **Acceptance Check:** wording/help/label consistency improves with only safe, small changes.
- [ ] T3 — Execute final QA/release verification.
  - **Owner:** main assistant
  - **Acceptance Check:** core shipped surfaces are verified honestly on local/live as appropriate.
- [ ] T4 — Cleanup, sync, commit, push, and final report.
  - **Owner:** main assistant
  - **Acceptance Check:** clean git status, exact commit hash, production stability, GitHub/VPS sync.

## 9) Verification Plan
- README/docs review against the real current product.
- Build verification with `npm run build`.
- Browser verification of key surfaces already shipped:
  - auth entry still loads
  - timetable page still loads
  - Rooms / Groups / Courses pages still load
  - import entry points/help still render
  - list/grid/timetable wording still makes sense
- Health verification:
  - local and/or live `/api/health`
  - service active after final restart if runtime-affecting code changed

## 10) Risks / Notes
- README is currently materially outdated and must be corrected immediately before closure.
- Keep polish narrow and release-safe.
- Prefer explicit known limitations over hand-wavy claims.
