A Predictive Cross-School Learning Analytics Platform for Holistic Student Performance Evaluation in Sri Lankan Schools

1. Introduction

In modern digital learning environments such as Learning Management Systems (LMS), online quizzes, and intelligent tutoring systems, a large amount of data related to student learning activities is generated. This data includes learning indicators such as attempts, hint usage, response time, correctness, and emotional states.

However, most existing systems only store this data and provide limited support for extracting meaningful insights or assisting in decision-making.

Therefore, the aim of this research is to develop a Decision Support System that analyzes student learning data using Artificial Intelligence (AI) and Learning Analytics techniques.

2. Problem Statement

Educational systems generate large volumes of data, but analysis is limited

There is no effective mechanism to identify at-risk students early

Identifying difficult lessons is mostly a manual process

Lack of personalized learning recommendations

Limited support for data-driven decision-making

3. Research Objectives

3.1 Main Objective

To develop a Decision Support System that analyzes student performance using AI and Learning Analytics

3.2 Specific Objectives

To predict student performance risk

To identify difficult skills and lessons

To cluster student learning behavior

To provide personalized learning recommendations

To develop a multi-level analytics dashboard

4. System Overview

The system will be developed as a web-based analytics dashboard.

Key Users:

National Administrators

School Administrators

Teachers

Students

System Administrators

Levels of Analysis:

Student level

Class level

School level

National level

5. Data Collection

The system collects the following data:

Attempts count

Hint usage

Response time

Answer correctness

Failure rate

Emotional states (frustration, confusion, boredom, concentration)

6. Methodology

6.1 Data Preprocessing

Handling missing data

Data normalization

Feature extraction

6.2 Performance Risk Prediction

Machine learning models are used to identify students at risk.

Input Features:

Attempts

Hint usage

Response time

Correctness

Output:

Risk Level (Low / Medium / High)

6.3 Difficult Lesson Identification

Failure rate analysis

High hint usage detection

Multiple attempts analysis

Output:

Identification of difficult topics and skills

6.4 Student Behaviour Clustering

Clustering algorithms (e.g., K-Means) are used to group students based on learning behavior.

Identified Groups:

Fast learners

Struggling learners

Hint-dependent learners

Disengaged learners

6.5 Recommendation System

Identifies weak skills

Provides personalized learning activities

Supports adaptive learning

7. System Architecture

Components:

Data Collection Module

Data Processing Module

Machine Learning Engine

Analytics Engine

Recommendation Engine

Web Dashboard

8. Functional Requirements

Quiz management (create, update, delete quizzes, questions, hints, and answers)

School management (add and manage schools)

User management (teachers, students, administrators)

Student management within schools

Quiz assignment to students

Student quiz interaction (start quiz, answer questions, use hints, navigate, submit)

Answer updating during quiz attempts

Quiz attempt history tracking

Student performance tracking (marks, attempts, correctness)

AI-based risk prediction and alerts

Identification of difficult lessons and skills

Student behaviour clustering

Personalized learning recommendations

Analytics dashboards (student, class, school, national levels)

Report generation (school and national levels)

9. Non-Functional Requirements

Scalability (handling large volumes of student data)

Performance (fast analytics processing)

Security (protection of student data)

Usability (user-friendly interface)

10. Expected Outcomes

Early identification of at-risk students

Improved teaching strategies

Enhanced student performance

Support for data-driven decision-making

Improved personalized learning experiences

11. Conclusion

This research aims to transform raw educational data into meaningful insights to improve the student learning process.

By utilizing AI and Learning Analytics, the system will provide valuable support to teachers and school administrators in making informed decisions.

The system supports multiple user roles with role-based functionalities to enhance decision-making at different levels.

12. Future Enhancements

Real-time analytics

Emotion detection using AI

Integration with existing LMS platforms

Mobile application development

13. Tech Stack

Backend – Django (pre-built features)

Database – PostgreSQL

Analytics – scikit-learn

Frontend – React.js
