Database Design Document

A Predictive Learning Analytics System (MCQ + Numeric + Question Variants Support)

📌 Overview

This database design supports a learning analytics system with:

- Multiple Choice Questions (MCQ)
- Numerical (typed) questions
- Parameterized Question Variants (for multiple attempts)

The system is optimized for mathematics-based learning and AI-driven analytics.

It ensures:
- Scalability
- Reduced data redundancy
- Flexible question generation
- AI-ready behavioral data collection

🔷 1. Users Table

Users
------
id (PK)
name
email
password
role_id (FK)
school_id (FK, nullable)
created_at

🔷 2. Roles Table

Roles
------
id (PK)
role_name (NationalAdmin, SchoolAdmin, Teacher, Student, SystemAdmin)

🔷 3. Schools Table

Schools
------
id (PK)
name
location
created_by (FK -> Users)

🔷 4. Classes Table

Classes
------
id (PK)
name
school_id (FK)
teacher_id (FK)

🔷 5. Students Table

Students
------
id (PK)
user_id (FK)
class_id (FK)

📘 QUIZ MANAGEMENT

🔷 6. Quizzes Table

Quizzes
------
id (PK)
title
description
created_by (FK)
school_id (FK, nullable)
created_at

🔷 7. Questions Table (UPDATED ⭐)

Questions
------
id (PK)
quiz_id (FK)
question_text          -- e.g. "What is a + b?"
question_type          -- (MCQ / NUMERIC)
difficulty_level

🔷 8. QuestionVariants Table (NEW 🔥)

QuestionVariants
------
id (PK)
question_id (FK)
variant_number
parameters (JSON)
correct_value

📌 Purpose
- Store different versions of the same question
- Avoid duplicating questions
- Support multiple quiz attempts

🔷 9. Answers Table (MCQ Only)

Answers
------
id (PK)
question_id (FK)
answer_text
is_correct (boolean)

🔷 10. CorrectAnswers Table (Numeric Questions)

CorrectAnswers
------
id (PK)
question_id (FK)
correct_value

🔷 11. Hints Table

Hints
------
id (PK)
question_id (FK)
hint_text
sequence_no

🧠 STUDENT INTERACTION

🔷 12. QuizAttempts Table (UPDATED ⭐)

QuizAttempts
------
id (PK)
student_id (FK)
quiz_id (FK)
attempt_number   -- (1, 2, 3...)
start_time
end_time
score

🔷 13. AttemptQuestions Table (NEW 🔥)

AttemptQuestions
------
id (PK)
attempt_id (FK)
question_id (FK)
variant_id (FK)

📌 Purpose
- Assign a specific question variant to each attempt
- Ensure different questions for each attempt

🔷 14. AttemptAnswers Table (UPDATED ⭐)

AttemptAnswers
------
id (PK)
attempt_id (FK)
question_id (FK)
variant_id (FK)
selected_answer_id (FK, nullable)
typed_answer (text, nullable)
is_correct
response_time
hint_count
attempt_count

🤖 AI & ANALYTICS SUPPORT

🔷 15. Recommendations Table

Recommendations
------
id (PK)
student_id (FK)
topic
recommended_activity
created_at

🔷 16. Analytics Table

Analytics
------
id (PK)
student_id (FK)
avg_score
avg_attempts
avg_response_time
risk_level
cluster_group

🔗 Relationships (Updated)

- Questions → QuestionVariants (One-to-Many)
- Questions → Answers (MCQ only)
- Questions → CorrectAnswers (Numeric only)
- QuizAttempts → AttemptQuestions (One-to-Many)
- AttemptQuestions → QuestionVariants (Many-to-One)
- QuizAttempts → AttemptAnswers (One-to-Many)

🔄 System Behavior (Important)

- Each quiz attempt is assigned different question variants
- If variants are available → use based on attempt number
- If not available → randomly select from existing variants
- Number of variants is flexible (not mandatory to have 3)

🔥 Key Improvements

✔ Supports MCQ + Numeric questions
✔ Supports multiple attempts with different values
✔ Eliminates duplicate questions
✔ Flexible variant system (not fixed count)
✔ AI-ready student behavior tracking

🧾 Conclusion

This updated database design introduces a variant-based approach to handle multiple quiz attempts with dynamic question generation. It improves flexibility, reduces redundancy, and enhances the system’s ability to support mathematics-based learning and AI-driven analytics.

💡 Key Design Justification

The system uses parameterized question variants instead of duplicating questions, ensuring efficient data management and flexible question generation across multiple attempts.
