-- =====================================================
-- school.sql : students, courses and enrolments
-- =====================================================

-- Let SQLite enforce foreign keys (it is OFF by default)
PRAGMA foreign_keys = ON;

-- Drop old tables so the file can be re-run safely
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- ---------- 1. TABLES ----------

CREATE TABLE students (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  title   TEXT NOT NULL,
  credits INTEGER NOT NULL
);

CREATE TABLE enrolments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id  INTEGER NOT NULL,
  grade      INTEGER,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id)  REFERENCES courses(id),
  UNIQUE (student_id, course_id)
);

-- ---------- 2. SAMPLE DATA ----------

INSERT INTO students (name, email) VALUES
  ('Wanjiru Kamau',   'wanjiru.kamau@example.com'),
  ('Otieno Odhiambo', 'otieno.odhiambo@example.com'),
  ('Aisha Mohamed',   'aisha.mohamed@example.com'),
  ('Kipchoge Mutai',  'kipchoge.mutai@example.com');   -- will have no enrolments

INSERT INTO courses (title, credits) VALUES
  ('Web Development', 4),
  ('Databases',       3),
  ('Mathematics',     3);

-- (student_id, course_id, grade)
INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 85),
  (1, 2, 78),
  (2, 1, 72),
  (2, 3, 90),
  (3, 2, 88),
  (3, 1, NULL);   -- not graded yet

-- ---------- 3. QUERIES ----------

-- Q1. All courses for one student (by name)
SELECT courses.title, courses.credits, enrolments.grade
FROM students
JOIN enrolments ON enrolments.student_id = students.id
JOIN courses    ON courses.id = enrolments.course_id
WHERE students.name = 'Wanjiru Kamau';

-- Q2. All students on one course
SELECT students.name, students.email, enrolments.grade
FROM courses
JOIN enrolments ON enrolments.course_id = courses.id
JOIN students   ON students.id = enrolments.student_id
WHERE courses.title = 'Web Development';

-- Q3. Number of students per course
SELECT courses.title, COUNT(enrolments.id) AS student_count
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.id
GROUP BY courses.id, courses.title;

-- Q4. Students who have no enrolments
SELECT students.name, students.email
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.id
WHERE enrolments.id IS NULL;

-- Q5. Update one enrolment's grade
UPDATE enrolments
SET grade = 91
WHERE student_id = (SELECT id FROM students WHERE name = 'Aisha Mohamed')
  AND course_id  = (SELECT id FROM courses  WHERE title = 'Web Development');

-- Check the update worked
SELECT students.name, courses.title, enrolments.grade
FROM enrolments
JOIN students ON students.id = enrolments.student_id
JOIN courses  ON courses.id  = enrolments.course_id
WHERE students.name = 'Aisha Mohamed';
