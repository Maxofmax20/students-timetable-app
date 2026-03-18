# DATA-MODEL-V2.md

## Core entities
### Existing retained entities
- User
- Workspace
- WorkspaceMember
- Course
- SessionEntry
- AcademicGroup
- Instructor
- Room

### New V2 planning entities
- **AcademicTerm**
  - workspaceId
  - userId
  - name
  - season
  - academicYear
  - startsAt
  - endsAt
  - isActive
- **Exam**
  - workspaceId
  - academicTermId
  - courseId
  - title
  - examType
  - examDate
  - startMinute / endMinute
  - location
  - notes
- **Assignment**
  - workspaceId
  - academicTermId
  - courseId
  - title
  - description
  - dueAt
  - priority
  - status
  - estimatedMinutes
- **UserPreference**
  - userId
  - workspaceId
  - theme
  - timetableView
  - dashboardLayout
  - weekStartsOn
  - reduceMotion

## Relationship rules
- A workspace can own many academic terms.
- A term can own many courses/exams/assignments.
- Courses continue owning many session entries.
- Preferences are user + workspace scoped.

## Migration note
Legacy timetable-era models stay temporarily for compatibility, but all new student productivity work should attach to the workspace-centric domain.
