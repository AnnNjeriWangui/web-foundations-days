# School Database Design

## Tables

### students
Stores one row per student. Columns: `id` (primary key), `name` (required) and `email` (required and unique, so no two students share an address).

### courses
Stores one row per course. Columns: `id` (primary key), `title` (required) and `credits` (required).

### enrolments
Records that a particular student is taking a particular course. Columns: `id` (primary key), `student_id` (foreign key to students), `course_id` (foreign key to courses) and `grade` (optional, because a grade is not known when a student first enrols). A `UNIQUE (student_id, course_id)` rule stops the same student enrolling on the same course twice.

## Relationships

- **students to enrolments: one-to-many.** One student can have many enrolments, but each enrolment belongs to exactly one student.
- **courses to enrolments: one-to-many.** One course can have many enrolments, but each enrolment belongs to exactly one course.
- **students to courses: many-to-many.** A student can take many courses and a course can have many students. Because of this, a join table is needed.

### Why a join table is needed
A relational table cannot store a list in one cell. Putting several course ids inside a student row would break the one-value-per-field rule and make searching and updating messy. The `enrolments` table solves this by holding one row per student-course pair. It is also the natural place for data that belongs to the pair itself, such as the grade, which is neither a property of the student alone nor of the course alone.

## Index

I would add an index on `enrolments(course_id)`:

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);
```

The `UNIQUE (student_id, course_id)` rule already creates an index that speeds up searches starting from a student. Queries that start from a course, such as "all students on this course" or "students per course", have no matching index and would scan the whole table. As the number of enrolments grows, this index keeps those queries fast.

## SQL or NoSQL?

I would choose SQL for this system. The data is structured and has clear relationships: students take courses, courses have enrolments, and data integrity is paramount. Enforcing constraints like foreign keys (referential integrity) and unique email / enrolment combinations is handled natively by an RDBMS. Furthermore, relational databases excel at multi-table JOIN operations and aggregations without needing redundant duplicated records or complex manual sync logic across documents.
