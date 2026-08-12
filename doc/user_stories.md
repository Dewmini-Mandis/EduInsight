# User Stories for the Predictive Learning Analytics Platform

## 1. System Admin User Stories

### SA-01: Manage Teacher Accounts

**As a System Admin, I want to create, update, deactivate, and archive teacher accounts so that I can control teacher access to the platform.**

### SA-02: Manage User Roles and Permissions

**As a System Admin, I want to assign roles and permissions so that System Admins, Teachers, and Students can access only their authorized functions.**

### SA-03: Manage Academic Terms

**As a System Admin, I want to create and manage the First, Second, and Third Academic Terms so that learning content can be organized consistently.**

### SA-04: Manage Curriculum Lessons

**As a System Admin, I want to create and manage official curriculum lessons so that all teachers use a consistent lesson structure.**

### SA-05: Manage Curriculum Topics and Skills

**As a System Admin, I want to create and manage topics and skills under each lesson so that quizzes, questions, and learning materials can be categorized consistently.**

### SA-06: Manage Quiz Levels

**As a System Admin, I want to manage the Beginner, Intermediate, and Advanced quiz levels so that the same progression structure is used throughout the platform.**

### SA-07: Manage Difficulty Levels

**As a System Admin, I want to manage the Easy, Medium, and Hard difficulty levels so that quizzes use consistent difficulty categories.**

### SA-08: Manage Classrooms

**As a System Admin, I want to create, update, and archive classroom records so that teachers and students can be assigned to valid classes.**

### SA-09: Assign Teachers to Classrooms

**As a System Admin, I want to assign authorized teachers to classrooms so that multiple teachers can support students in the classes they teach.**

### SA-10: Monitor System Activity

**As a System Admin, I want to monitor system activity so that operational issues and suspicious actions can be identified.**

### SA-11: View Audit Logs

**As a System Admin, I want to view audit records of important user actions so that account, quiz, result, and permission changes can be investigated.**

### SA-12: Monitor Sensitive Data Access

**As a System Admin, I want access to sensitive student records and machine-learning predictions to be logged so that unauthorized access can be detected.**

### SA-13: View System Reports

**As a System Admin, I want to view reports about teachers, students, classrooms, quizzes, and platform usage so that I can evaluate overall system performance.**

### SA-14: Preserve Historical Records

**As a System Admin, I want student attempts, scores, quiz versions, and prediction histories to remain available after accounts or content are archived so that academic and research records are not lost.**

---

# 2. Teacher User Stories

## 2.1 Teacher Profile and Classroom Access

### T-01: View Teacher Profile

**As a Teacher, I want to view my profile so that I can check my personal and professional information.**

### T-02: Update Teacher Profile

**As a Teacher, I want to update my profile information so that my details remain accurate.**

### T-03: View Authorized Classrooms

**As a Teacher, I want to view the classrooms that I am authorized to teach so that I can manage the correct students and learning activities.**

### T-04: Request Classroom Access

**As a Teacher, I want to request access to a classroom that I teach so that the System Admin can authorize the assignment.**

### T-05: Manage Students in Authorized Classrooms

**As a Teacher, I want to access and manage students in my authorized classrooms so that multiple teachers can support the same students.**

### T-06: Use Authorized Classroom Dropdowns

**As a Teacher, I want only my authorized classrooms to appear in student-assignment and quiz-assignment fields so that content is not assigned to unauthorized classes.**

### T-07: Filter Information by Classroom

**As a Teacher, I want to filter students, results, engagement data, risk predictions, and proficiency levels by classroom so that each class can be analyzed separately.**

---

## 2.2 Student Account Management

### T-08: Add a Student

**As a Teacher, I want to add a student to an authorized classroom so that the student can access the platform.**

### T-09: Enter Required Student Details

**As a Teacher, I want to enter the student's first name, last name, email address, classroom assignment, and account-access information so that a valid student account can be created.**

### T-10: Add an Optional Index Number

**As a Teacher, I want to add a student index number when available so that the student can be identified using the school registration number.**

### T-11: Assign a Student to a Classroom

**As a Teacher, I want to assign a student to one of my authorized classrooms so that the student can access content assigned to that class.**

### T-12: Generate Secure Account Access

**As a Teacher, I want the system to generate a secure temporary password or account-activation link so that the student can access the account safely.**

### T-13: View Classroom Students

**As a Teacher, I want to view students in my authorized classrooms so that I can manage their accounts and progress.**

### T-14: Search for a Student

**As a Teacher, I want to search for a student by name, email address, index number, or classroom so that I can locate the student quickly.**

### T-15: Update Student Details

**As a Teacher, I want to update student details in my authorized classrooms so that incorrect information can be corrected.**

### T-16: Reset Student Account Access

**As a Teacher, I want to initiate a secure password reset for a student so that the student can regain access.**

### T-17: Deactivate a Student Account

**As a Teacher, I want to deactivate a student account when authorized so that students who have left the classroom cannot continue accessing class content.**

### T-18: Separate Account Creation from Content Access

**As a Teacher, I want student content access to depend on classroom assignment rather than on the teacher who created the account so that all authorized teachers can support the student.**

---

## 2.3 Curriculum Selection

### T-19: View Curriculum Lessons

**As a Teacher, I want to view official curriculum lessons created by the System Admin so that I can select valid lessons when creating content.**

### T-20: Select an Academic Term

**As a Teacher, I want to select the academic term associated with a lesson so that content appears under the correct term.**

### T-21: Select a Curriculum Lesson

**As a Teacher, I want to select a lesson from predefined curriculum options so that duplicate or inconsistent lesson names are avoided.**

### T-22: Select Topics and Skills

**As a Teacher, I want to select topics and skills belonging to the chosen lesson so that questions and materials are categorized accurately.**

### T-23: Request a Curriculum Correction

**As a Teacher, I want to report missing or incorrect lessons, topics, or skills so that the System Admin can review them.**

### T-24: Prevent Invalid Curriculum Combinations

**As a Teacher, I want the system to display only topics and skills belonging to the selected lesson so that invalid combinations cannot be saved.**

---

## 2.4 Theory and Remedial Material Management

### T-25: Add Theory Content

**As a Teacher, I want to add theory content to a lesson, topic, or skill so that students who fail can review the required knowledge.**

### T-26: Add Lesson Summaries

**As a Teacher, I want to add lesson summaries so that failed students can review the key points before reattempting a quiz.**

### T-27: Add Theory Questions

**As a Teacher, I want to add questions within theory content so that student understanding and engagement can be checked during remedial learning.**

### T-28: Add Educational Videos

**As a Teacher, I want to add educational videos to a lesson, topic, or skill so that failed students can study using visual explanations.**

### T-29: Add Video Questions

**As a Teacher, I want to add questions at selected points in a video so that student engagement and understanding can be evaluated.**

### T-30: Add QR-Based Question Access

**As a Teacher, I want to associate QR codes with video questions so that students can access them through supported devices.**

### T-31: Edit Learning Materials

**As a Teacher, I want to update theories, summaries, videos, and embedded questions so that learning content remains accurate.**

### T-32: Archive Learning Materials

**As a Teacher, I want to archive outdated learning materials so that they are no longer assigned while historical records remain available.**

### T-33: Link Materials to Topics and Skills

**As a Teacher, I want to link theories, videos, summaries, and activities to specific topics and skills so that failed students receive relevant remedial content.**

### T-34: Classify Remedial Activities

**As a Teacher, I want to mark remedial activities as required, optional, or additional practice so that the learning pathway can be controlled.**

### T-35: Restrict Materials Until Failure

**As a Teacher, I want theories, videos, summaries, and remedial activities to remain locked until a student fails the related quiz so that the student completes the assessment first.**

---

## 2.5 Quiz Creation and Management

### T-36: Create a Quiz

**As a Teacher, I want to create a quiz so that I can assess student knowledge before lesson materials become available.**

### T-37: Add a Quiz Title

**As a Teacher, I want to enter a required quiz title so that students can identify the quiz.**

### T-38: Add a Quiz Description

**As a Teacher, I want to add a short description so that students can understand the purpose of the quiz.**

### T-39: Select an Academic Term

**As a Teacher, I want to select a required academic term so that the quiz appears under the correct term.**

### T-40: Select a Lesson

**As a Teacher, I want to select a required lesson from the official curriculum so that the quiz is linked to the correct content.**

### T-41: Select a Topic or Skill

**As a Teacher, I want to select a required topic or skill belonging to the selected lesson so that student weaknesses can be analyzed accurately.**

### T-42: Set Estimated Completion Time

**As a Teacher, I want to enter the required estimated completion time in minutes so that students know approximately how long the quiz may take.**

### T-43: Select a Quiz Level

**As a Teacher, I want to assign the quiz to the Beginner, Intermediate, or Advanced quiz level so that assessments follow the required progression.**

### T-44: Select a Difficulty Level

**As a Teacher, I want to assign the quiz an Easy, Medium, or Hard difficulty so that students progress gradually.**

### T-45: Set a Pass Mark

**As a Teacher, I want to define a required pass mark percentage so that the system can determine whether a student has passed or failed.**

### T-46: Assign a Quiz to Classrooms

**As a Teacher, I want to assign a quiz to one or more authorized classrooms so that I do not need to recreate it for every class.**

### T-47: Set a Start Date

**As a Teacher, I want to set a start date so that students cannot attempt the quiz before the specified date.**

### T-48: Set a Due Date

**As a Teacher, I want to set a due date so that students know when the quiz must be completed.**

### T-49: Set a Release Time

**As a Teacher, I want to set a release time so that the quiz becomes available at the correct time.**

### T-50: Set an Attempt Limit

**As a Teacher, I want to set an attempt limit so that I can control how many attempts a student may make.**

### T-51: Save a Quiz as a Draft

**As a Teacher, I want to save an incomplete quiz as a draft so that I can finish it later.**

### T-52: Preview a Quiz

**As a Teacher, I want to preview a quiz before publishing so that I can verify its questions, answers, levels, difficulty, and settings.**

### T-53: Publish a Quiz

**As a Teacher, I want to publish a valid quiz so that students in the assigned classrooms can attempt it.**

### T-54: Duplicate a Quiz

**As a Teacher, I want to duplicate an existing quiz so that its structure can be reused for another classroom or assessment period.**

### T-55: Archive a Published Quiz

**As a Teacher, I want to archive a published quiz that contains student attempts so that historical results remain available.**

### T-56: Delete a Draft Quiz

**As a Teacher, I want to delete a draft quiz that has not been attempted so that unnecessary drafts can be removed.**

### T-57: Create a New Quiz Version

**As a Teacher, I want major changes to a published quiz with attempts to create a new version so that previous results remain linked to the original version.**

### T-58: Preserve Historical Quiz Results

**As a Teacher, I want previous scores to remain unchanged when a quiz is edited or versioned so that historical performance data remains reliable.**

---

## 2.6 Quiz Validation

### T-59: Validate Quiz Dates

**As a Teacher, I want the system to prevent a due date from occurring before the start date so that invalid schedules cannot be published.**

### T-60: Validate the Pass Mark

**As a Teacher, I want the system to require a pass mark between 0 and 100 so that results can be calculated correctly.**

### T-61: Validate Estimated Time

**As a Teacher, I want the system to require an estimated time greater than zero so that invalid completion times cannot be saved.**

### T-62: Validate the Attempt Limit

**As a Teacher, I want the system to require an attempt limit of at least one so that students can attempt the quiz.**

### T-63: Validate Curriculum Relationships

**As a Teacher, I want the system to confirm that the lesson belongs to the selected term and the topic or skill belongs to the lesson so that invalid relationships are prevented.**

### T-64: Prevent Empty Quiz Publication

**As a Teacher, I want the system to prevent a quiz without questions from being published so that students do not receive an incomplete assessment.**

### T-65: Validate Correct Answers

**As a Teacher, I want the system to warn me when automatically marked questions do not contain valid correct answers so that scores can be calculated accurately.**

### T-66: Detect Duplicate Progression Quizzes

**As a Teacher, I want the system to warn me when another quiz uses the same term, lesson, quiz level, difficulty, and classroom assignment so that unintended duplicates are avoided.**

---

## 2.7 Question and Question-Bank Management

### T-67: Add Multiple-Choice Questions

**As a Teacher, I want to add multiple-choice questions so that students can select an answer from several options.**

### T-68: Add True-or-False Questions

**As a Teacher, I want to add true-or-false questions so that basic knowledge can be assessed quickly.**

### T-69: Add Short-Answer Questions

**As a Teacher, I want to add short-answer questions so that students can respond using their own words.**

### T-70: Add Fill-in-the-Blank Questions

**As a Teacher, I want to add fill-in-the-blank questions so that students can complete missing words, values, or expressions.**

### T-71: Add Matching Questions

**As a Teacher, I want to add matching questions so that students can connect related items.**

### T-72: Add Answer Options

**As a Teacher, I want to add answer options where required so that students can select from available answers.**

### T-73: Specify Correct Answers

**As a Teacher, I want to specify correct answers for supported question types so that the system can automatically calculate scores.**

### T-74: Link Questions to Topics and Skills

**As a Teacher, I want to link each question to a curriculum topic or skill so that incorrect-answer rates and weak areas can be analyzed.**

### T-75: Manually Review Short Answers

**As a Teacher, I want to review and manually mark short-answer responses so that valid answer variations are not unfairly marked as incorrect.**

### T-76: View Pending Manual Marking

**As a Teacher, I want to view quizzes containing responses awaiting review so that final results can be completed.**

### T-77: Edit and Reorder Questions

**As a Teacher, I want to edit and reorder questions before publishing so that the quiz follows a clear structure.**

### T-78: Create a Question Bank

**As a Teacher, I want to create a question bank for each lesson so that the system can generate different question sets for attempts and reattempts.**

### T-79: Tag Question-Bank Questions

**As a Teacher, I want to tag each question with its term, lesson, topic, skill, quiz level, difficulty, question type, and marks so that suitable questions can be selected automatically.**

### T-80: Add Multiple Questions for the Same Skill

**As a Teacher, I want to create multiple questions that assess the same skill so that students can receive alternative questions during reattempts.**

### T-81: Create Equivalent Question Variants

**As a Teacher, I want to create different versions of a question with similar difficulty and learning outcomes so that understanding is measured instead of answer memorization.**

### T-82: Define Question Selection Rules

**As a Teacher, I want to define how many questions are selected from each topic or skill so that generated quizzes cover the required learning outcomes.**

### T-83: Define Question-Type Distribution

**As a Teacher, I want to define the required number of questions from each question type so that generated quizzes maintain a consistent structure.**

### T-84: Define Marks Distribution

**As a Teacher, I want to define the marks allocated to each topic, skill, or question category so that generated quiz sets have equivalent total marks.**

### T-85: Create Parameterized Mathematics Questions

**As a Teacher, I want to create parameterized mathematics questions in which numerical values change automatically so that multiple valid question versions can be generated.**

### T-86: Define Parameter Constraints

**As a Teacher, I want to define valid ranges and conditions for parameterized values so that generated questions remain appropriate for the selected level and difficulty.**

### T-87: Preview Generated Question Sets

**As a Teacher, I want to preview possible question sets from the question bank so that I can verify their content, difficulty, marks, and curriculum coverage.**

### T-88: Review Question Usage

**As a Teacher, I want to view how frequently each question has been used so that I can identify overused questions and add alternatives.**

### T-89: Validate Question-Bank Sufficiency

**As a Teacher, I want the system to warn me when the question bank does not contain enough alternative questions so that I can add more questions before publishing.**

### T-90: Control Question Reuse

**As a Teacher, I want to configure whether previously attempted questions may be reused when insufficient alternatives are available so that reattempt behaviour remains controlled.**

---

## 2.8 Randomized Quiz Generation

### T-91: Enable Question-Bank Mode

**As a Teacher, I want to configure a quiz to select questions from a question bank so that each attempt can contain a different set.**

### T-92: Define a Quiz Blueprint

**As a Teacher, I want to define a quiz blueprint containing required topics, skills, levels, difficulty, question types, marks, and question counts so that every generated quiz follows the same specification.**

### T-93: Randomize Question Order

**As a Teacher, I want question order to be randomized for each attempt so that students do not always receive the same sequence.**

### T-94: Randomize Answer Options

**As a Teacher, I want answer-option order to be randomized for supported question types so that students cannot rely on memorized option positions.**

### T-95: Exclude Recently Used Questions

**As a Teacher, I want the system to exclude questions recently attempted by the same student when sufficient alternatives exist so that reattempts contain different questions.**

### T-96: Generate Equivalent Reattempt Sets

**As a Teacher, I want every reattempt set to match the original quiz blueprint so that the same topics, skills, level, difficulty, and marks are assessed.**

### T-97: Store Generated Attempt Versions

**As a Teacher, I want the exact questions and answer-option order shown during every attempt to be stored so that student responses can be reviewed accurately.**

---

## 2.9 Teacher Notifications and Overrides

### T-98: Receive At-Risk Student Notifications

**As a Teacher, I want to receive a notification when a student is newly classified as at risk so that I can review the student's performance.**

### T-99: Receive Repeated-Failure Notifications

**As a Teacher, I want to receive a notification when a student repeatedly fails a quiz so that I can provide additional support.**

### T-100: Grant an Additional Attempt

**As a Teacher, I want to grant an additional quiz attempt with a recorded reason so that exceptional circumstances can be handled fairly.**

### T-101: Extend a Quiz for an Individual Student

**As a Teacher, I want to extend or reopen a quiz for an individual student so that absences and technical problems can be accommodated.**

### T-102: Record Override Reasons

**As a Teacher, I want every manual override to require a reason and be recorded in the audit log so that changes remain transparent.**

### T-103: Flag an Inaccurate Prediction

**As a Teacher, I want to flag a risk or proficiency prediction that appears inaccurate so that model performance can be reviewed.**

---

## 2.10 Teacher Analytics and Machine-Learning Stories

### T-104: View Student Quiz Results

**As a Teacher, I want to view student quiz results so that I can evaluate individual performance.**

### T-105: View Classroom Performance

**As a Teacher, I want to view performance by classroom so that common strengths and weaknesses can be identified.**

### T-106: View Pass and Failure Rates

**As a Teacher, I want to view quiz pass and failure rates so that I can evaluate student understanding.**

### T-107: View Student Attempt History

**As a Teacher, I want to view each student's attempt history so that repeated difficulties can be identified.**

### T-108: View Topic and Skill Error Rates

**As a Teacher, I want to view topics and skills with high incorrect-answer rates so that targeted support can be provided.**

### T-109: View Theory Engagement

**As a Teacher, I want to view theory completion, time spent, and theory-question accuracy so that student participation can be evaluated.**

### T-110: View Video Engagement

**As a Teacher, I want to view video completion, watch duration, QR interactions, and video-question accuracy so that student engagement can be evaluated.**

### T-111: Compare Learning Performance

**As a Teacher, I want to compare initial quiz, post-learning, and reattempt results so that student improvement can be measured.**

### T-112: View Student Risk Prediction

**As a Teacher, I want to view whether a student is predicted to be at risk of poor academic performance so that I can provide early support.**

### T-113: View Risk Prediction Factors

**As a Teacher, I want to view the main performance and engagement factors associated with a student's risk prediction so that I can understand the output.**

### T-114: View Insufficient Risk Data

**As a Teacher, I want the system to indicate when insufficient data is available for risk prediction so that missing predictions are not interpreted as low risk.**

### T-115: View Classroom Risk Summary

**As a Teacher, I want to view the number and percentage of students in each risk category so that classroom-level risk can be monitored.**

### T-116: View Predicted Student Proficiency

**As a Teacher, I want to view each student's predicted proficiency as Developing, Proficient, or Advanced so that I can understand the student's estimated academic ability.**

### T-117: View Proficiency Prediction Factors

**As a Teacher, I want to view the main factors associated with a student's predicted proficiency so that I can understand the classification.**

### T-118: View Insufficient Proficiency Data

**As a Teacher, I want the system to indicate when insufficient assessment data is available for a proficiency prediction so that unreliable classifications are avoided.**

### T-119: View Prediction Date and Reliability

**As a Teacher, I want each prediction to display its generation date and available reliability information so that I can judge how current and dependable it is.**

### T-120: Download Performance Reports

**As a Teacher, I want to download reports containing actual results, engagement analytics, risk predictions, and predicted proficiency levels so that they can support academic evaluation.**

---

# 3. Student User Stories

## 3.1 Student Account and Security

### ST-01: Log In

**As a Student, I want to log in securely so that I can access my learning account.**

### ST-02: Change the Temporary Password

**As a Student, I want to change my temporary password after my first login so that my account remains secure.**

### ST-03: Reset a Forgotten Password

**As a Student, I want to reset my forgotten password securely so that I can regain access without depending entirely on my teacher.**

### ST-04: View My Profile

**As a Student, I want to view my profile so that I can check my personal and classroom information.**

### ST-05: Protect My Educational Data

**As a Student, I want my detailed performance and prediction information to be visible only to me and authorized school staff so that my educational data remains private.**

---

## 3.2 Academic Term, Lesson, and Initial Quiz Access

### ST-06: Select an Academic Term

**As a Student, I want to select the First, Second, or Third Term so that I can view lessons belonging to that term.**

### ST-07: View Lessons by Term

**As a Student, I want to view lesson names belonging to the selected term so that I can choose the lesson assessment I need to attempt.**

### ST-08: Select a Lesson

**As a Student, I want to select a lesson so that I can view the currently available quiz for that lesson.**

### ST-09: Attempt the Quiz Before Accessing Materials

**As a Student, I want to attempt the available quiz before accessing theory, videos, summaries, and remedial activities so that my initial understanding can be measured.**

### ST-10: View Locked Lesson Materials

**As a Student, I want the system to show that lesson materials are locked before my initial quiz attempt so that the required learning flow is clear.**

### ST-11: View Lesson Progress

**As a Student, I want to view my quiz progression and remedial-learning status for each lesson so that I know what I have completed.**

---

## 3.3 Quiz Attempt and Progression

### ST-12: Begin with the Beginner Easy Quiz

**As a Student, I want to begin each lesson with the Beginner Easy quiz so that I follow the required progression.**

### ST-13: View Quiz Instructions

**As a Student, I want to view the quiz title, description, estimated time, pass mark, availability period, and attempt limit so that I understand the requirements.**

### ST-14: Start an Available Quiz

**As a Student, I want to start an unlocked quiz during its availability period so that I can test my knowledge.**

### ST-15: Answer Different Question Types

**As a Student, I want to answer multiple-choice, true-or-false, short-answer, fill-in-the-blank, and matching questions so that I can complete different assessments.**

### ST-16: Autosave Quiz Answers

**As a Student, I want my answers to be saved automatically so that temporary connection problems do not erase my progress.**

### ST-17: Resume an Interrupted Quiz

**As a Student, I want to resume an interrupted quiz when permitted by the teacher's settings so that I can complete the same attempt.**

### ST-18: View Timer Behaviour

**As a Student, I want to be informed whether the timer continues during an interruption so that the time rules are clear.**

### ST-19: Submit a Quiz

**As a Student, I want to submit my answers so that the system can calculate or prepare my result.**

### ST-20: View Pending Manual Review

**As a Student, I want to see when a short-answer response is awaiting teacher review so that I understand why my result is not final.**

### ST-21: View My Final Score

**As a Student, I want to view my final score after automatic and required manual marking is completed so that I know how well I performed.**

### ST-22: View Pass or Fail Status

**As a Student, I want to see whether I passed or failed so that I know what activity becomes available next.**

### ST-23: View Answer Feedback

**As a Student, I want to view feedback on my correct and incorrect answers so that I can understand my mistakes.**

### ST-24: Unlock the Next Quiz After Passing

**As a Student, I want the next quiz to unlock when my final score is greater than or equal to the pass mark so that I can continue the progression.**

### ST-25: View Locked Quizzes

**As a Student, I want to view locked quizzes and their unlocking requirements so that I understand what must be completed first.**

### ST-26: View Remaining Attempts

**As a Student, I want to view my remaining quiz attempts so that I know how many attempts are available.**

---

## 3.4 Failed Quiz and Lesson Access

### ST-27: Unlock Lesson Materials After Failure

**As a Student, I want the related theory, summaries, videos, and remedial activities to unlock only after I fail a quiz so that I can study the areas where I need support.**

### ST-28: View Incorrect Topics and Skills

**As a Student, I want to view the topics and skills associated with my incorrect answers so that I know what I need to study.**

### ST-29: Access Relevant Theory

**As a Student, I want to read theory linked to my incorrect topics and skills so that I can improve my understanding.**

### ST-30: Read Lesson Summaries

**As a Student, I want to read summaries of the failed topics and skills so that I can review the main points.**

### ST-31: Answer Theory Questions

**As a Student, I want to answer questions while reading theory so that my engagement and understanding can be checked.**

### ST-32: Watch Educational Videos

**As a Student, I want to watch videos linked to failed topics and skills so that I can learn through visual explanations.**

### ST-33: Answer Video Questions

**As a Student, I want to answer questions during video activities so that my engagement and understanding can be checked.**

### ST-34: Use QR-Based Questions

**As a Student, I want to scan QR codes associated with video questions when required so that I can complete the engagement check.**

### ST-35: View Remedial Activity Requirements

**As a Student, I want to see which remedial activities are required, optional, or additional practice so that I know what must be completed.**

### ST-36: Resume Remedial Activities

**As a Student, I want to resume incomplete theory or video activities so that I can continue from where I stopped.**

### ST-37: Complete Required Remedial Learning

**As a Student, I want to complete all required remedial activities linked to the failed quiz so that the post-learning quiz can be unlocked.**

---

## 3.5 Post-Learning Assessment and Reattempt

### ST-38: Attempt a Post-Learning Quiz

**As a Student, I want to attempt a post-learning quiz after completing required remedial activities so that my current understanding can be evaluated.**

### ST-39: View My Post-Learning Score

**As a Student, I want to view my post-learning score so that I can understand my performance after studying the lesson materials.**

### ST-40: Compare My Performance

**As a Student, I want to compare my initial quiz score with my post-learning score so that I can see whether I improved.**

### ST-41: Understand the Post-Learning Quiz

**As a Student, I want the system to explain that the post-learning quiz checks my understanding but does not replace the original progression quiz so that the flow is clear.**

### ST-42: Unlock a Reattempt

**As a Student, I want a reattempt to become available after completing the required remedial activities and post-learning quiz so that I can attempt to pass the progression assessment.**

### ST-43: Receive a Different Question Set

**As a Student, I want to receive a different question set during a reattempt when sufficient alternatives are available so that my understanding is assessed instead of my memory.**

### ST-44: Receive an Equivalent Assessment

**As a Student, I want the reattempt to cover the same lesson, topics, skills, quiz level, difficulty, and approximate marks as the original attempt so that the assessment remains fair.**

### ST-45: Receive Randomized Question Order

**As a Student, I want questions to appear in a different order during each attempt so that attempts are less predictable.**

### ST-46: Receive Randomized Answer Options

**As a Student, I want answer options to appear in a different order where appropriate so that memorizing an option position does not provide an unfair advantage.**

### ST-47: Reattempt the Progression Quiz

**As a Student, I want to reattempt the progression quiz using a new equivalent question set so that I can demonstrate that I have achieved the required knowledge.**

### ST-48: Continue Progression After Passing

**As a Student, I want the next difficulty or quiz level to unlock when I pass the progression reattempt so that I can continue through the learning pathway.**

---

## 3.6 Student Proficiency Prediction

### ST-49: View My Predicted Proficiency

**As a Student, I want to view my predicted proficiency as Developing, Proficient, or Advanced after sufficient data has been collected so that I can understand my estimated academic ability.**

### ST-50: Distinguish Quiz Level from Proficiency

**As a Student, I want the quiz level and my predicted proficiency to be labelled separately so that I do not confuse the assessment category with my estimated ability.**

### ST-51: View Insufficient Data Status

**As a Student, I want to be informed when insufficient data is available to predict my proficiency so that I do not receive an unreliable classification.**

### ST-52: Update My Predicted Proficiency

**As a Student, I want my predicted proficiency to be updated after sufficient new quiz or post-learning assessment data becomes available so that it reflects my recent performance.**

### ST-53: View Prediction Factors

**As a Student, I want to view the main factors associated with my predicted proficiency so that I can understand the result.**

### ST-54: View My Proficiency History

**As a Student, I want to view changes in my predicted proficiency over time so that I can monitor my academic development.**

### ST-55: View Prediction Date

**As a Student, I want to view when my predicted proficiency was generated so that I know whether it reflects my recent activity.**

---

## 3.7 Student Dashboard and Notifications

### ST-56: View Overall Progress

**As a Student, I want to view my overall progress across terms, lessons, levels, and difficulties so that I can understand my learning journey.**

### ST-57: View Completed Lessons

**As a Student, I want to view completed lessons so that I can track what I have finished.**

### ST-58: View Available Quizzes

**As a Student, I want to view currently available quizzes so that I know which assessments I can attempt.**

### ST-59: View Quiz History

**As a Student, I want to view my previous attempts, scores, and question-set versions so that I can track my assessment history.**

### ST-60: View Difficulty Progress

**As a Student, I want to view my Easy, Medium, and Hard progression so that I know which difficulty I have reached.**

### ST-61: View Assigned Remedial Activities

**As a Student, I want to view incomplete remedial activities so that I know what must be completed before continuing.**

### ST-62: View Performance Charts

**As a Student, I want to view charts of my scores, attempts, improvement, and predicted proficiency so that I can understand my performance visually.**

### ST-63: Receive Quiz Release Notifications

**As a Student, I want to receive a notification when a quiz is released so that I know when it becomes available.**

### ST-64: Receive Due-Date Reminders

**As a Student, I want to receive a reminder when a quiz due date is approaching so that I do not miss the assessment.**

### ST-65: Receive Remedial Access Notifications

**As a Student, I want to receive a notification when I fail a quiz and the related materials become available so that I know what to study next.**

### ST-66: Receive Reattempt Notifications

**As a Student, I want to receive a notification when a progression reattempt becomes available so that I can continue my learning pathway.**

---

## 3.8 Accessibility and Device Support

### ST-67: Use the Platform on Mobile Devices

**As a Student, I want the platform to work on mobile devices so that I can access quizzes and lessons without requiring a computer.**

### ST-68: Access Lower-Bandwidth Content

**As a Student, I want lower-bandwidth alternatives for videos and learning materials so that I can study with limited internet access.**

### ST-69: Use Accessible Navigation

**As a Student, I want clear navigation, readable content, keyboard support, and understandable error messages so that I can use the platform effectively.**

### ST-70: View Responsive Content

**As a Student, I want questions, matching activities, videos, and theory content to display correctly on different screen sizes so that I can complete activities using my available device.**

---

# 4. Final System Rules

1. The platform has three main roles: System Admin, Teacher, and Student.

2. The System Admin manages official academic terms, lessons, topics, skills, classrooms, quiz levels, and difficulty levels.

3. Teachers select official curriculum categories when creating quizzes and learning materials.

4. Student access is based on classroom assignment and teacher authorization.

5. Multiple authorized teachers may support students in the same classroom.

6. A student first selects an academic term.

7. The platform displays lessons belonging to the selected term.

8. After selecting a lesson, the student accesses the currently available quiz first.

9. The related theory, summaries, videos, and remedial activities remain locked before the initial quiz result.

10. Each lesson begins with the Beginner Easy quiz.

11. The progression sequence is:

**Beginner Easy → Beginner Medium → Beginner Hard → Intermediate Easy → Intermediate Medium → Intermediate Hard → Advanced Easy → Advanced Medium → Advanced Hard**

12. A student passes when the final score is greater than or equal to the teacher-defined pass mark.

13. Passing unlocks the next quiz in the progression.

14. Failing keeps the next progression quiz locked.

15. Only after failing can the student access the related theories, summaries, videos, embedded questions, and remedial activities.

16. Remedial content must be linked to the topics and skills associated with the failed quiz.

17. Required remedial activities must be completed before the post-learning quiz is unlocked.

18. The post-learning quiz measures understanding after remedial study.

19. Passing the post-learning quiz does not automatically pass the original progression assessment.

20. After completing the required remedial flow, the student receives a progression reattempt.

21. The reattempt normally contains a different but equivalent question set.

22. The reattempt must assess the same lesson, topics, skills, level, difficulty, marks, and learning outcomes as the original quiz.

23. The student must pass the progression reattempt to unlock the next quiz.

24. Every randomized quiz must follow a teacher-defined quiz blueprint.

25. The blueprint defines the required topics, skills, quiz level, difficulty, number of questions, question types, marks, and estimated time.

26. Question-bank questions must be tagged with their curriculum and assessment attributes.

27. The system should prioritize questions the student has not recently attempted.

28. Previously used questions may be reused only when sufficient alternatives are unavailable.

29. Any reused question must be recorded.

30. Question order should be randomized where appropriate.

31. Answer-option order should be randomized for supported question types.

32. Randomization must never change which answer is correct.

33. The exact questions and option order shown during every attempt must be stored.

34. Parameterized mathematics questions must follow teacher-defined ranges and validation conditions.

35. Generated questions must not be impossible, ambiguous, or unsuitable for the selected level.

36. A teacher should be warned when the question bank cannot produce enough alternative questions.

37. A quiz may be published with limited alternatives only after the teacher accepts the reuse warning.

38. Short-answer questions may require manual teacher marking.

39. Pass/fail status must not be finalized until required manual marking is complete.

40. Quiz answers should be autosaved.

41. Interrupted quizzes may be resumed according to teacher settings.

42. Timer behaviour during interruptions must be clearly communicated.

43. A published quiz with student attempts must not be permanently deleted.

44. Major edits to a published quiz with attempts must create a new version.

45. Historical attempts must remain linked to the exact quiz version and question set attempted.

46. A quiz may be assigned to one or more authorized classrooms.

47. Results and predictions must be filterable by classroom.

48. Quiz settings must be validated before publication.

49. Risk predictions are generated only when sufficient historical data is available.

50. Proficiency predictions are generated only when sufficient assessment data is available.

51. The system must display **Insufficient Data** instead of generating an unreliable prediction.

52. Quiz level and predicted student proficiency are separate concepts.

53. Quiz levels are Beginner, Intermediate, and Advanced.

54. Predicted proficiency levels are Developing, Proficient, and Advanced.

55. Pass/fail decisions and quiz unlocking depend on actual assessment results and system rules.

56. Machine-learning predictions must not automatically block students, unlock quizzes, reduce attempts, or replace teacher judgement.

57. A student predicted as Developing may still pass a higher-level quiz when the actual score meets the pass mark.

58. Predictions must display their generation date and available reliability information.

59. Predictions must be visible only to the student and authorized school staff.

60. Teachers may flag predictions that appear inaccurate.

61. Teachers may grant additional attempts or deadline extensions, but every override must include a reason and be logged.

62. Students should receive notifications for quiz releases, approaching due dates, remedial-material access, and reattempt availability.

63. The platform should support mobile devices, responsive layouts, accessible navigation, and lower-bandwidth alternatives.

# Final Student Learning Flow

**Select Academic Term**

↓

**Select Lesson**

↓

**Attempt Beginner Easy Quiz First**

↓

### When the Student Passes

**Record Result → Unlock Next Difficulty or Level**

### When the Student Fails

**Identify Incorrect Topics and Skills**

↓

**Unlock Related Theory, Summaries, Videos, and Remedial Activities**

↓

**Complete Required Remedial Activities**

↓

**Attempt Post-Learning Quiz**

↓

**Generate a Different but Equivalent Progression Quiz**

↓

**Reattempt the Progression Quiz**

↓

**Pass → Unlock Next Difficulty or Level**

or

**Fail → Continue the permitted remedial and reattempt process, subject to the attempt limit**
