# Students Timetable V2 — Pass 2 Product Polish

- **Date:** 2026-03-18
- **Status:** Approved for execution
- **Owner:** main + delegated builder/verifier workers
- **Baseline:** `50eb4a0` — `Build V2 student planning foundation`

## Goal
Push the green V2 foundation into a stronger daily-use student product without reopening solved foundation work.

## Scope
1. Timetable UX polish
2. Mobile-first schedule usability
3. Courses flow upgrade
4. Exams/tasks/course linkage
5. QA against `TEST-CHECKLIST.md`
6. Release-readiness polish

## Constraints
- Start from stable commit `50eb4a0`.
- Preserve build stability.
- Do not redo already completed foundation work unless a regression is found.
- Improve cohesively, not with scattered cosmetic edits.
- Implement only what is in this approved spec; flag gaps instead of inventing scope.

## Task checklist
- [ ] T1 — Inspect current timetable and related components.  
  - **Owner:** main/planner  
  - **Acceptance:** clear list of timetable pain points and target files.
- [ ] T2 — Upgrade timetable UX and mobile schedule behavior.  
  - **Owner:** builder  
  - **Acceptance:** timetable readability and mobile usage are materially improved.
- [ ] T3 — Upgrade courses flow and course detail quality.  
  - **Owner:** builder  
  - **Acceptance:** course pages surface sessions, exams, tasks, and useful actions.
- [ ] T4 — Tighten cross-module cohesion.  
  - **Owner:** builder  
  - **Acceptance:** dashboard/exams/tasks/courses link together coherently.
- [ ] T5 — QA + release polish.  
  - **Owner:** verifier/main  
  - **Acceptance:** build passes and checklist is updated with concrete results.

## Success criteria
- Build still passes.
- Timetable feels more like the signature feature.
- Mobile schedule usage is improved.
- Courses flow is meaningfully stronger.
- Exams/tasks/course linkage is clearer.
- QA issues are reduced and documented.
