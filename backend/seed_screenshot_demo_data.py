"""
EduInsight Universal Demo Data Seeder
Populates the CURRENT runtime database (neondb on PostgreSQL) with comprehensive
demo operational data for EVERY SINGLE USER ACCOUNT (System Admin, Teachers, Students)
in the system so that NO MATTER WHICH ACCOUNT is logged in, all Reports, Analytics,
Dashboards, Charts, and Tables display populated, meaningful non-empty data.

Idempotent execution: safe to run multiple times without duplicating records.
"""

import os
import sys
import random
import datetime
from datetime import timedelta
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import transaction
from django.utils import timezone
from django.conf import settings

from apps.accounts.models import User, Role, SystemAccessLog, Notification
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student, TeacherProfile, TeacherClassroom
from apps.quizzes.models import (
    AcademicTerm, Lesson, Topic, Skill, QuizLevel, DifficultyLevel,
    Quiz, Question, Answer, CorrectAnswer, Hint, LearningMaterial,
    MaterialAttachment, VideoQuestion, EngagementQuestion
)
from apps.attempts.models import (
    QuizAttempt, AttemptQuestion, AttemptAnswer, ManualMark,
    StudentLessonProgress, StudentContentProgress, StudentEngagementAnswer,
    StudentRemediationState, TeacherIntervention
)
from apps.analytics.models import Analytics, RiskPrediction, ProficiencyPrediction
from apps.analytics.services.risk_predictor import evaluate_and_store_attempt_risk


def log(msg):
    print(msg, flush=True)


@transaction.atomic
def seed_screenshot_demo_data():
    log("==================================================")
    log("STARTING UNIVERSAL EDUINSIGHT DEMO DATA SEEDING")
    log("==================================================")
    log(f"Runtime DB Engine: {settings.DATABASES['default']['ENGINE']}")
    log(f"Runtime DB Name: {settings.DATABASES['default']['NAME']}")
    log(f"Runtime DB Host: {settings.DATABASES['default'].get('HOST', 'localhost')}")

    # --------------------------------------------------
    # 1. VERIFY & ASSIGN ROLES
    # --------------------------------------------------
    admin_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_SYSTEM_ADMIN)
    teacher_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
    student_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)

    # --------------------------------------------------
    # 2. SCHOOLS & CLASSROOMS
    # --------------------------------------------------
    school_homagama, _ = School.objects.get_or_create(
        id=1,
        defaults={
            "name": "Homagama Maha Vidyalaya",
            "location": "345, High Level Road, Homagama",
            "address": "High Level Road, Homagama",
            "province": "Western",
            "district": "Colombo",
            "zone": "Homagama Zone",
            "educational_zone": "Homagama Zone 1"
        }
    )

    school_visakha, _ = School.objects.get_or_create(
        name="Visakha Vidyalaya",
        defaults={
            "location": "12, Vajira Road, Colombo 4",
            "address": "Vajira Road, Colombo 04",
            "province": "Western",
            "district": "Colombo",
            "zone": "Colombo South",
            "educational_zone": "Zone 3"
        }
    )

    school_royal, _ = School.objects.get_or_create(
        name="Royal College",
        defaults={
            "location": "Rajakeeya Mawatha, Colombo 7",
            "address": "Rajakeeya Mawatha, Colombo 07",
            "province": "Western",
            "district": "Colombo",
            "zone": "Colombo Central",
            "educational_zone": "Zone 1"
        }
    )

    school_ananda, _ = School.objects.get_or_create(
        name="Ananda College",
        defaults={
            "location": "Maradana, Colombo 10",
            "address": "Kandy Road, Colombo 10",
            "province": "Western",
            "district": "Colombo",
            "zone": "Colombo North",
            "educational_zone": "Zone 2"
        }
    )

    class_10a, _ = SchoolClass.objects.get_or_create(name="10A", school=school_homagama)
    class_10b, _ = SchoolClass.objects.get_or_create(name="10B", school=school_homagama)
    class_11a, _ = SchoolClass.objects.get_or_create(name="11A", school=school_visakha)
    class_11b, _ = SchoolClass.objects.get_or_create(name="11B", school=school_visakha)
    class_10c, _ = SchoolClass.objects.get_or_create(name="10C", school=school_royal)
    class_11c, _ = SchoolClass.objects.get_or_create(name="11C", school=school_ananda)

    all_classrooms = [class_10a, class_10b, class_11a, class_11b, class_10c, class_11c]

    # --------------------------------------------------
    # 3. ALIGN ALL SYSTEM ADMINS & TEACHERS
    # --------------------------------------------------
    admin_users = list(User.objects.filter(role=admin_role))
    if not admin_users:
        admin_user = User.objects.create_superuser(
            username="admin@edu.lk",
            email="admin@edu.lk",
            password="password123",
            role=admin_role,
            first_name="System",
            last_name="Administrator"
        )
        admin_users = [admin_user]
    else:
        for au in admin_users:
            au.set_password("password123")
            if not au.first_name:
                au.first_name = "System"
                au.last_name = "Admin"
            au.save()

    main_admin = admin_users[0]

    # Teachers in DB
    teacher_users = list(User.objects.filter(role=teacher_role))
    schools_cycle = [school_homagama, school_visakha, school_royal, school_ananda]

    for idx, tu in enumerate(teacher_users):
        tu.set_password("password123")
        if not tu.school:
            tu.school = schools_cycle[idx % len(schools_cycle)]
        if not tu.first_name:
            tu.first_name = f"Teacher_{tu.username.split('@')[0]}"
            tu.last_name = "Edu"
        tu.save()
        
        TeacherProfile.objects.get_or_create(user=tu, defaults={"teacher_id": f"T-100{idx+1}", "subjects": ["Mathematics"]})
        # Assign 2 classrooms per teacher
        c1 = all_classrooms[idx % len(all_classrooms)]
        c2 = all_classrooms[(idx + 1) % len(all_classrooms)]
        TeacherClassroom.objects.get_or_create(teacher=tu, classroom=c1, defaults={"is_active": True})
        TeacherClassroom.objects.get_or_create(teacher=tu, classroom=c2, defaults={"is_active": True})

    primary_teacher = next((t for t in teacher_users if t.username == "pabudi@gmail.com"), teacher_users[0])

    log(f"Aligned {len(admin_users)} System Admins and {len(teacher_users)} Teachers across {len(all_classrooms)} Classrooms.")

    # --------------------------------------------------
    # 4. CURRICULUM HIERARCHY (G.C.E. O/L Mathematics)
    # --------------------------------------------------
    term1, _ = AcademicTerm.objects.get_or_create(name="Term 1", defaults={"order": 1, "is_active": True})
    term2, _ = AcademicTerm.objects.get_or_create(name="Term 2", defaults={"order": 2, "is_active": True})
    term3, _ = AcademicTerm.objects.get_or_create(name="Term 3", defaults={"order": 3, "is_active": True})

    quiz_lvl_beg, _ = QuizLevel.objects.get_or_create(name="Beginner", defaults={"order": 1})
    quiz_lvl_int, _ = QuizLevel.objects.get_or_create(name="Intermediate", defaults={"order": 2})
    quiz_lvl_adv, _ = QuizLevel.objects.get_or_create(name="Advanced", defaults={"order": 3})

    diff_easy, _ = DifficultyLevel.objects.get_or_create(name="Easy", defaults={"order": 1})
    diff_med, _ = DifficultyLevel.objects.get_or_create(name="Medium", defaults={"order": 2})
    diff_hard, _ = DifficultyLevel.objects.get_or_create(name="Hard", defaults={"order": 3})

    lesson_alg, _ = Lesson.objects.get_or_create(
        title="Algebraic Expressions & Factorization",
        defaults={
            "description": "Simplifying algebraic expressions, linear terms, expansion, and factorization of quadratic trinomials.",
            "term": term1,
            "grade": "Grade 10",
            "created_by": main_admin,
            "order": 1
        }
    )

    lesson_eq, _ = Lesson.objects.get_or_create(
        title="Linear Equations & Inequalities",
        defaults={
            "description": "Solving linear equations in one variable, simultaneous equations, and linear inequalities.",
            "term": term1,
            "grade": "Grade 10",
            "created_by": main_admin,
            "order": 2
        }
    )

    lesson_geo, _ = Lesson.objects.get_or_create(
        title="Perimeter & Area of Plane Figures",
        defaults={
            "description": "Calculating perimeters and areas of compound plane figures, circles, sectors, and triangles.",
            "term": term2,
            "grade": "Grade 10",
            "created_by": main_admin,
            "order": 3
        }
    )

    lesson_pyth, _ = Lesson.objects.get_or_create(
        title="Pythagoras Theorem & Trigonometry",
        defaults={
            "description": "Right-angled triangle properties, Pythagoras theorem applications, and basic trigonometric ratios.",
            "term": term3,
            "grade": "Grade 10",
            "created_by": main_admin,
            "order": 4
        }
    )

    all_lessons = [lesson_alg, lesson_eq, lesson_geo, lesson_pyth]

    topic_alg, _ = Topic.objects.get_or_create(name="Algebraic Foundations", lesson=lesson_alg)
    topic_eq, _ = Topic.objects.get_or_create(name="Linear Systems", lesson=lesson_eq)
    topic_geo, _ = Topic.objects.get_or_create(name="Plane Geometry", lesson=lesson_geo)
    topic_pyth, _ = Topic.objects.get_or_create(name="Trigonometry & Pythagoras", lesson=lesson_pyth)

    skill_simp, _ = Skill.objects.get_or_create(name="Simplifying Algebraic Expressions", defaults={"lesson": lesson_alg, "topic": topic_alg})
    skill_fact, _ = Skill.objects.get_or_create(name="Factorization of Quadratic Trinomials", defaults={"lesson": lesson_alg, "topic": topic_alg})
    skill_lin, _ = Skill.objects.get_or_create(name="Solving Linear Equations", defaults={"lesson": lesson_eq, "topic": topic_eq})
    skill_perim, _ = Skill.objects.get_or_create(name="Perimeter of Compound Figures", defaults={"lesson": lesson_geo, "topic": topic_geo})
    skill_pyth, _ = Skill.objects.get_or_create(name="Pythagoras Theorem Applications", defaults={"lesson": lesson_pyth, "topic": topic_pyth})

    # --------------------------------------------------
    # 5. LEARNING MATERIALS & ATTACHMENTS
    # --------------------------------------------------
    mat_video1, _ = LearningMaterial.objects.get_or_create(
        title="Introduction to Linear Equations Worked Examples",
        defaults={
            "material_type": LearningMaterial.TYPE_VIDEO,
            "content": "https://www.youtube.com/embed/bAerID24QJ0",
            "lesson": lesson_eq,
            "topic": topic_eq,
            "skill": skill_lin,
            "created_by": primary_teacher,
            "is_required": True,
            "order": 1
        }
    )

    mat_note1, _ = LearningMaterial.objects.get_or_create(
        title="Factorization & Expansion Step-by-Step Guide",
        defaults={
            "material_type": LearningMaterial.TYPE_TEXT,
            "content": "### Factorization Guide\n1. Identify the common factor in each term.\n2. Factorize quadratic expressions of the form ax^2 + bx + c.\n3. Verify by expanding terms.",
            "lesson": lesson_alg,
            "topic": topic_alg,
            "skill": skill_fact,
            "created_by": primary_teacher,
            "is_required": True,
            "order": 1
        }
    )

    mat_note2, _ = LearningMaterial.objects.get_or_create(
        title="Perimeter & Area Formulas Summary Sheet",
        defaults={
            "material_type": LearningMaterial.TYPE_TEXT,
            "content": "### Perimeter & Area Formulas\n- Rectangle: P = 2(l + w), A = l * w\n- Circle: P = 2 * pi * r, A = pi * r^2\n- Sector: Arc length = (theta / 360) * 2 * pi * r",
            "lesson": lesson_geo,
            "topic": topic_geo,
            "skill": skill_perim,
            "created_by": primary_teacher,
            "is_required": True,
            "order": 1
        }
    )

    mat_video2, _ = LearningMaterial.objects.get_or_create(
        title="Pythagoras Theorem Applications Video Lesson",
        defaults={
            "material_type": LearningMaterial.TYPE_VIDEO,
            "content": "https://www.youtube.com/embed/WqhlG3Vak3w",
            "lesson": lesson_pyth,
            "topic": topic_pyth,
            "skill": skill_pyth,
            "created_by": primary_teacher,
            "is_required": True,
            "order": 1
        }
    )

    all_materials = [mat_video1, mat_note1, mat_note2, mat_video2]

    # --------------------------------------------------
    # 6. QUIZZES PER TEACHER (Ensures Every Teacher Owns Quizzes & Matches Student Registered Teacher)
    # --------------------------------------------------
    def create_skill_questions(quiz_obj, skill_obj, question_prefix, count=10):
        questions = []
        for i in range(1, count + 1):
            if i % 2 != 0:
                q, _ = Question.objects.get_or_create(
                    quiz=quiz_obj,
                    question_text=f"{question_prefix} - MCQ Question {i}: Solve problem for {skill_obj.name}.",
                    defaults={
                        "question_type": Question.TYPE_MCQ,
                        "skill": skill_obj,
                        "difficulty_level": "Medium"
                    }
                )
                if q.answers.count() == 0:
                    Answer.objects.create(question=q, answer_text=f"Correct Option {i}", is_correct=True)
                    Answer.objects.create(question=q, answer_text=f"Wrong Option {i}A", is_correct=False)
                    Answer.objects.create(question=q, answer_text=f"Wrong Option {i}B", is_correct=False)
                    Answer.objects.create(question=q, answer_text=f"Wrong Option {i}C", is_correct=False)
                questions.append(q)
            else:
                q, _ = Question.objects.get_or_create(
                    quiz=quiz_obj,
                    question_text=f"{question_prefix} - Numeric Question {i}: Calculate exact value for {skill_obj.name}.",
                    defaults={
                        "question_type": Question.TYPE_NUMERIC,
                        "skill": skill_obj,
                        "difficulty_level": "Medium"
                    }
                )
                if not hasattr(q, 'correct_answer'):
                    CorrectAnswer.objects.create(question=q, correct_value=str(i * 5))
                questions.append(q)
        return questions

    # Create a set of 4 quizzes FOR EVERY TEACHER in the system
    teacher_quizzes = {} # teacher_user -> list of 4 quizzes
    for tu in teacher_users:
        teacher_quizzes[tu] = []
        
        # Quiz 1: Linear Equations
        q_lin, _ = Quiz.objects.get_or_create(
            title=f"Linear Equations Quiz ({tu.first_name})",
            created_by=tu,
            defaults={
                "description": "Assessment on solving linear equations and systems.",
                "status": Quiz.STATUS_PUBLISHED,
                "lesson": lesson_eq,
                "topic": topic_eq,
                "skill": skill_lin,
                "quiz_level": quiz_lvl_int,
                "difficulty": diff_med,
                "pass_mark": 50,
                "max_attempts": 3,
                "estimated_time_minutes": 15,
                "school": tu.school or school_homagama,
            }
        )
        q_lin.assigned_classes.add(*all_classrooms)
        q_lin.skills.add(skill_lin)
        create_skill_questions(q_lin, skill_lin, f"LinEq-{tu.username[:4]}", 10)
        teacher_quizzes[tu].append(q_lin)

        # Quiz 2: Factorization & Algebra
        q_fact, _ = Quiz.objects.get_or_create(
            title=f"Factorization & Algebra Quiz ({tu.first_name})",
            created_by=tu,
            defaults={
                "description": "Testing factorization of quadratic expressions and algebraic simplification.",
                "status": Quiz.STATUS_PUBLISHED,
                "lesson": lesson_alg,
                "topic": topic_alg,
                "skill": skill_fact,
                "quiz_level": quiz_lvl_adv,
                "difficulty": diff_hard,
                "pass_mark": 50,
                "max_attempts": 3,
                "estimated_time_minutes": 20,
                "school": tu.school or school_homagama,
            }
        )
        q_fact.assigned_classes.add(*all_classrooms)
        q_fact.skills.add(skill_fact)
        create_skill_questions(q_fact, skill_fact, f"Fact-{tu.username[:4]}", 10)
        teacher_quizzes[tu].append(q_fact)

        # Quiz 3: Perimeter & Geometry
        q_perim, _ = Quiz.objects.get_or_create(
            title=f"Perimeter & Geometry Check ({tu.first_name})",
            created_by=tu,
            defaults={
                "description": "Assessment on perimeter and areas of compound figures.",
                "status": Quiz.STATUS_PUBLISHED,
                "lesson": lesson_geo,
                "topic": topic_geo,
                "skill": skill_perim,
                "quiz_level": quiz_lvl_beg,
                "difficulty": diff_easy,
                "pass_mark": 50,
                "max_attempts": 3,
                "estimated_time_minutes": 15,
                "school": tu.school or school_homagama,
            }
        )
        q_perim.assigned_classes.add(*all_classrooms)
        q_perim.skills.add(skill_perim)
        create_skill_questions(q_perim, skill_perim, f"Perim-{tu.username[:4]}", 10)
        teacher_quizzes[tu].append(q_perim)

        # Quiz 4: Pythagoras Theorem
        q_pyth, _ = Quiz.objects.get_or_create(
            title=f"Pythagoras Theorem Skills ({tu.first_name})",
            created_by=tu,
            defaults={
                "description": "Applying Pythagoras theorem to right-angled triangles.",
                "status": Quiz.STATUS_PUBLISHED,
                "lesson": lesson_pyth,
                "topic": topic_pyth,
                "skill": skill_pyth,
                "quiz_level": quiz_lvl_int,
                "difficulty": diff_med,
                "pass_mark": 50,
                "max_attempts": 3,
                "estimated_time_minutes": 15,
                "school": tu.school or school_homagama,
            }
        )
        q_pyth.assigned_classes.add(*all_classrooms)
        q_pyth.skills.add(skill_pyth)
        create_skill_questions(q_pyth, skill_pyth, f"Pyth-{tu.username[:4]}", 10)
        teacher_quizzes[tu].append(q_pyth)

    log(f"Created/Verified 4 Quizzes per Teacher for all {len(teacher_users)} teachers.")

    # --------------------------------------------------
    # 7. ALIGN ALL STUDENTS ACROSS TEACHERS & POPULATE HISTORICAL ATTEMPTS
    # --------------------------------------------------
    all_student_users = list(User.objects.filter(role=student_role))
    log(f"Processing ALL {len(all_student_users)} Student accounts in DB...")

    def record_attempt_answers(attempt_obj, target_score_percent):
        """Helper to create 10 chronological AttemptAnswer records matching a target score."""
        questions = list(attempt_obj.quiz.questions.all()[:10])
        num_correct = int(round((target_score_percent / 100.0) * len(questions)))
        
        attempt_obj.answers.all().delete()
        total_awarded = 0.0
        now = attempt_obj.start_time
        
        for idx, q in enumerate(questions):
            is_corr = idx < num_correct
            resp_time = random.uniform(15.0, 40.0) if is_corr else random.uniform(55.0, 110.0)
            hints = random.choice([0, 1]) if not is_corr else 0
            
            sel_ans = q.answers.filter(is_correct=is_corr).first() if q.question_type == Question.TYPE_MCQ else None
            typed_ans = q.correct_answer.correct_value if (q.question_type == Question.TYPE_NUMERIC and is_corr) else "0"
            
            AttemptAnswer.objects.create(
                attempt=attempt_obj,
                question=q,
                selected_answer=sel_ans,
                typed_answer=typed_ans,
                is_correct=is_corr,
                response_time=resp_time,
                hint_count=hints,
                attempt_count=attempt_obj.attempt_number,
                answered_at=now + timedelta(seconds=idx * 20),
                skill=q.skill or attempt_obj.quiz.skill,
                model_eligible=True
            )
            if is_corr:
                total_awarded += max(0.0, 1.0 - 0.25 * hints)
                
        calculated_score = round((total_awarded / len(questions)) * 100.0, 2)
        attempt_obj.score = calculated_score
        attempt_obj.status = QuizAttempt.STATUS_SUBMITTED
        attempt_obj.end_time = now + timedelta(minutes=10)
        attempt_obj.save()
        return attempt_obj

    # Distribute students evenly among all teachers
    for idx, su in enumerate(all_student_users):
        su.set_password("password123")
        assigned_teacher = teacher_users[idx % len(teacher_users)]
        assigned_classroom = all_classrooms[idx % len(all_classrooms)]
        su.school = assigned_teacher.school
        su.save()

        student_obj, _ = Student.objects.get_or_create(
            user=su,
            defaults={
                "registered_by": assigned_teacher,
                "class_room": assigned_classroom,
                "class_name": assigned_classroom.name,
                "grade": "Grade 10" if "10" in assigned_classroom.name else "Grade 11",
                "index_no": f"IND-{1000+idx}"
            }
        )
        # Ensure relationships are strictly aligned
        student_obj.registered_by = assigned_teacher
        student_obj.class_room = assigned_classroom
        student_obj.class_name = assigned_classroom.name
        student_obj.save()

        # Quizzes created by THIS student's registered teacher
        t_quizzes = teacher_quizzes[assigned_teacher]
        primary_quiz = t_quizzes[idx % len(t_quizzes)]

        # Determine student profile archetype for realistic performance variation
        profile_type = idx % 5
        if profile_type == 0:  # High Performer
            scores = [85.0, 90.0, 95.0, 90.0, 100.0, 95.0, 90.0, 95.0, 100.0, 95.0]
        elif profile_type == 1: # Moderate Performer
            scores = [60.0, 65.0, 70.0, 65.0, 75.0, 70.0, 65.0, 70.0, 75.0, 70.0]
        elif profile_type == 2: # Struggling / High Risk
            scores = [30.0, 35.0, 25.0, 40.0, 30.0, 35.0, 20.0, 35.0, 30.0, 25.0]
        elif profile_type == 3: # Remediation Required
            scores = [35.0, 40.0, 30.0, 35.0, 40.0, 35.0, 30.0, 35.0, 40.0, 35.0]
        else: # Reassessment / Escalated
            scores = [40.0, 45.0, 35.0, 40.0, 35.0, 40.0, 45.0, 35.0, 40.0, 45.0]

        latest_attempt = None
        for att_idx, target_score in enumerate(scores, start=1):
            t_date = timezone.now() - timedelta(days=50 - att_idx * 4)
            # Cycle through the teacher's quizzes so the student has attempts across multiple quizzes
            curr_quiz = t_quizzes[(att_idx - 1) % len(t_quizzes)]
            
            att, _ = QuizAttempt.objects.get_or_create(
                student=student_obj,
                quiz=curr_quiz,
                attempt_type=QuizAttempt.TYPE_ORDINARY,
                attempt_number=att_idx,
                defaults={"start_time": t_date}
            )
            att.start_time = t_date
            att.save()
            latest_attempt = record_attempt_answers(att, target_score_percent=target_score)

        # Run ML risk prediction evaluation for EVERY student (has 10 same-skill/historical interactions)
        avg_score = round(sum(scores) / len(scores), 2)
        risk_lvl = "High Risk" if profile_type in [2, 3, 4] else "Not High Risk"
        cluster_grp = "Struggling" if profile_type in [2, 3, 4] else ("High Performer" if profile_type == 0 else "Moderate")
        prof_lvl = "Proficient" if profile_type == 0 else ("Developing" if profile_type == 1 else "Emerging")

        Analytics.objects.update_or_create(
            student=student_obj,
            defaults={
                "avg_score": avg_score,
                "avg_attempts": 1.2,
                "avg_response_time": 32.5,
                "risk_level": risk_lvl,
                "cluster_group": cluster_grp
            }
        )
        ProficiencyPrediction.objects.get_or_create(
            student=student_obj,
            defaults={
                "proficiency_level": prof_lvl,
                "confidence_score": 0.88
            }
        )

        if latest_attempt:
            try:
                evaluate_and_store_attempt_risk(latest_attempt)
            except Exception as e:
                log(f"Risk prediction evaluation note for {su.username}: {e}")

        # Seed Student Lesson Progress across all 4 lessons
        for l_idx, lesson_item in enumerate(all_lessons):
            status = StudentLessonProgress.STATUS_COMPLETED if l_idx < 2 else (
                StudentLessonProgress.STATUS_IN_PROGRESS if l_idx == 2 else StudentLessonProgress.STATUS_NOT_STARTED
            )
            pct = 100.0 if status == StudentLessonProgress.STATUS_COMPLETED else (65.0 if status == StudentLessonProgress.STATUS_IN_PROGRESS else 0.0)
            StudentLessonProgress.objects.update_or_create(
                student=student_obj,
                lesson=lesson_item,
                defaults={"status": status, "progress_percentage": pct, "completed_at": timezone.now() if status == StudentLessonProgress.STATUS_COMPLETED else None}
            )

        # Seed Student Content Progress across all 4 materials
        for mat_item in all_materials:
            StudentContentProgress.objects.update_or_create(
                student=student_obj,
                material=mat_item,
                defaults={"watched_percentage": 100.0, "is_completed": True, "completed_at": timezone.now()}
            )

        # Seed Remediation States & Interventions for Struggling/Remediation students
        if profile_type in [2, 3, 4]:
            rem_status = (
                StudentRemediationState.STATUS_PENDING_MATERIALS if profile_type == 3 else (
                    StudentRemediationState.STATUS_REASSESSMENT_UNLOCKED if profile_type == 2 else StudentRemediationState.STATUS_ESCALATED_TEACHER
                )
            )
            rem_state, _ = StudentRemediationState.objects.get_or_create(
                student=student_obj,
                quiz=primary_quiz,
                defaults={"status": rem_status}
            )
            rem_state.status = rem_status
            rem_state.weak_skills.add(primary_quiz.skill)
            rem_state.required_materials.add(mat_video1, mat_note1)
            rem_state.save()

            if rem_status == StudentRemediationState.STATUS_ESCALATED_TEACHER:
                re_att, _ = QuizAttempt.objects.get_or_create(
                    student=student_obj,
                    quiz=primary_quiz,
                    attempt_type=QuizAttempt.TYPE_REASSESSMENT,
                    attempt_number=1,
                    defaults={"start_time": timezone.now() - timedelta(days=2)}
                )
                record_attempt_answers(re_att, target_score_percent=42.0)
                rem_state.reassessment_attempt = re_att
                rem_state.save()

                TeacherIntervention.objects.get_or_create(
                    student=student_obj,
                    quiz=primary_quiz,
                    skill=primary_quiz.skill,
                    remediation_state=rem_state,
                    defaults={
                        "teacher": assigned_teacher,
                        "is_pending": True,
                        "notes": f"Student {su.username} failed post-remedial reassessment on {primary_quiz.skill.name}. 1-on-1 intervention required."
                    }
                )

    log(f"Successfully populated historical attempts, ML predictions, lesson progress, content progress, and remediation for ALL {len(all_student_users)} Students.")

    # --------------------------------------------------
    # 8. SYSTEM ACCESS LOGS & NOTIFICATIONS
    # --------------------------------------------------
    for tu in teacher_users[:3]:
        SystemAccessLog.objects.get_or_create(
            user=tu, action="Teacher Portal Login", status=SystemAccessLog.STATUS_SUCCESS,
            defaults={"ip_address": "127.0.0.1"}
        )
        Notification.objects.get_or_create(
            user=tu, title="Pending Intervention Alert",
            defaults={"message": "You have students requiring 1-on-1 remediation review.", "link": "/teacher/risk-alerts"}
        )

    for au in admin_users:
        SystemAccessLog.objects.get_or_create(
            user=au, action="System Admin Login", status=SystemAccessLog.STATUS_SUCCESS,
            defaults={"ip_address": "127.0.0.1"}
        )

    log("System Access Logs & Notifications Populated.")
    log("==================================================")
    log("UNIVERSAL DEMO DATA SEEDING COMPLETED SUCCESSFULLY!")
    log("==================================================")


if __name__ == "__main__":
    seed_screenshot_demo_data()
