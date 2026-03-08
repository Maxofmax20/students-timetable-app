# Realtime Decision

## Decision
Realtime is **deferred and removed from the live product path** for this release.

## Why
- The canonical live product is the workspace/course/group/instructor/room system.
- No active UI currently consumes realtime events.
- The previous realtime server was disconnected from the deployed product and had become misleading technical baggage.

## What was done
- The inactive `students-timetable-realtime.service` unit was removed from the host.
- `realtime-server.mjs` was removed from the repo.
- unused `socket.io` / `socket.io-client` dependencies were removed from `package.json`.
- misleading realtime claims were removed from active product copy.

## Product implication
The app remains fully functional without realtime:
- auth
- workspace CRUD
- account flows
- exports
- mobile navigation
- production deployment

## Future reintroduction rule
Realtime should only return when:
1. there is a concrete canonical product need,
2. the active UI consumes it,
3. the event model is designed for the workspace product,
4. it is verified in production as an actual user-facing capability.
