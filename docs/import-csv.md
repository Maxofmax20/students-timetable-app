# CSV Import Guide

Students Timetable supports create-only CSV bulk import directly inside the product for:

- Rooms
- Groups
- Courses + Sessions

All import flows follow the same safety model:

1. paste/upload CSV
2. preview results
3. review valid / invalid / duplicate counts
4. confirm import
5. import only valid non-duplicate rows

Imports do **not** silently overwrite existing data.

---

## Shared rules

### Safety model
- create-only imports
- existing records are never overwritten
- duplicates are reported explicitly and skipped
- invalid rows are rejected with reasons
- import only runs after explicit confirmation

### Where imports live
- Rooms → `/workspace/rooms`
- Groups → `/workspace/groups`
- Courses → `/workspace/courses`

### Preview summary
Every import preview shows:
- total CSV rows
- ready rows
- invalid rows
- duplicate rows
- per-row details and messages

---

## Rooms CSV import

### Supported columns
Recommended columns:
- `buildingCode`
- `roomNumber`
- `name`
- `buildingName`
- `capacity`

Also supported aliases:
- `code`
- `roomCode`
- `fullCode`
- `building`
- `buildingLetter`
- `number`
- `seats`

### Example
```csv
buildingCode,roomNumber,name,buildingName,capacity
E,119,Room E119,Main Engineering Building,40
E,226,Room E226,,25
E,412,Room E412,,60
```

### Behavior
- room code is normalized from `buildingCode + roomNumber`
- level is derived automatically from room number
- if `name` is blank, the import uses `Room <code>`
- duplicate room codes are skipped, never overwritten

### Validation
Rejected examples include:
- missing building code
- missing room number
- malformed structured room code
- invalid capacity value

---

## Groups CSV import

### Supported columns
Recommended columns:
- `code`
- `name`
- `parentCode`

Also supported aliases:
- `groupCode`
- `groupName`
- `mainGroupCode`
- `parentGroupCode`

### Example
```csv
code,name,parentCode
A,Main Group A,
A1,Subgroup A1,A
A2,Subgroup A2,A
B,Main Group B,
B1,Subgroup B1,B
```

### Behavior
- top-level rows create main groups
- subgroup rows can attach to explicit `parentCode`
- if `parentCode` is missing, subgroup parent can be inferred from code patterns like `A1 -> A`
- if `name` is blank, safe default names are used
- duplicate group codes are skipped, never overwritten

### Validation
Rejected examples include:
- subgroup with no resolvable parent
- parent that resolves to another subgroup instead of a main group
- duplicate group code rows in the same CSV

---

## Courses + Sessions CSV import

### Import model
Use **one row per session**.
Rows with the same `courseCode` are grouped into **one course with many sessions**.

### Supported columns
Recommended columns:
- `courseCode`
- `courseTitle`
- `status`
- `sessionType`
- `day`
- `startTime`
- `endTime`
- `groupCode`
- `roomCode`
- `instructorName`
- `instructorEmail`
- `onlinePlatform`
- `onlineLink`
- `note`

### Example
```csv
courseCode,courseTitle,status,sessionType,day,startTime,endTime,groupCode,roomCode,instructorName,instructorEmail,onlinePlatform,onlineLink,note
EMIE,Electrical Machines & Industrial Electronics,ACTIVE,LECTURE,Sat,08:00,10:00,A,E119,Dr. Ahmed,,,
EMIE,Electrical Machines & Industrial Electronics,ACTIVE,LAB,Tue,10:00,12:00,A1,E226,Dr. Ahmed,,,
ROBO,Robotics Engineering,ACTIVE,ONLINE,Thu,13:00,15:00,A2,,Dr. Sara,,Google Meet,https://example.com/robo,Remote delivery
```

### Behavior
- one course code can generate many sessions
- exact linked-entity resolution is used for safety
- existing course codes are skipped, never overwritten
- grouped course rows must agree on title and status

### Linked entity resolution
- group → exact `groupCode`
- room → exact `roomCode`
- instructor → `instructorEmail` first, else exact unique instructor name

### Validation
Rejected examples include:
- missing course code or title
- invalid session type/day/time
- end time not after start time
- unknown group or room code
- unknown instructor
- ambiguous instructor name match
- conflicting titles/status values for the same course code
- duplicate session rows inside the same grouped course

---

## Operational note

These import flows are designed for safe bulk creation, not destructive synchronization.
If you need update/merge/replace imports later, treat that as a separate feature with stricter review and confirmation rules.
