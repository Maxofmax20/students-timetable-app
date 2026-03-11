# Students Timetable — Release Phase Summary (2026-03)

This document closes the current product phase after the completed Batch 1–3 feature work plus the final docs/polish/QA closure pass.

## Live deployment
- Live site: <https://demostb.duckdns.org>
- Canonical repo path: `/home/ubuntu/.openclaw/workspace/students-timetable-app`
- Runtime: `students-timetable.service`

## What shipped in this phase

### Batch 1
- Smart filters on Courses page
- Saved views on Courses page
- Browser-local saved view persistence

### Batch 2
- Timetable intelligence controls
- Session-type filtering
- Group/subgroup focus
- Delivery-mode filtering
- Conflict visibility layer
- Grid/List timetable modes
- Timetable rendering/readability fixes
- Day-focused mobile grid behavior
- List View restoration

### Batch 3
- Rooms CSV import
- Groups CSV import
- Courses + Sessions CSV import
- Shared preview/confirm import flow
- Explicit duplicate reporting
- Create-only import safety model

### Final closure pass
- README rewritten to match real current product
- import documentation added
- environment template added
- operations docs refreshed
- small copy/clarity polish sweep
- final release verification completed

## Core product model at closure
- one Course with many SessionEntry rows
- structured Rooms with building/room/derived level
- hierarchical Groups with main group + subgroup relationships
- PostgreSQL as canonical production database
- credentials auth + verification/reset flows

## Important safety rules preserved
- canonical live repo path is `/home/ubuntu/.openclaw/workspace/students-timetable-app`
- do not treat `/home/ubuntu/timetable` as the live source of truth
- import flows are create-only and never silently overwrite existing data
- PWA/runtime/install work stayed out of scope for this phase

## Remaining known limitations
- no update/merge/replace import mode yet
- instructor resolution during course import is intentionally strict
- legacy timetable-era tables remain for compatibility/data retention
- OAuth providers remain intentionally disabled in the live path

## Recommended next phase candidates
- bulk instructor import
- import update/merge workflows with explicit safety controls
- broader regression automation for auth/CRUD/import/timetable flows
- deliberate cleanup of legacy timetable-era schema once compatibility is no longer needed
