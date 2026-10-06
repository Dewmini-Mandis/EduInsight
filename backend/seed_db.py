import os
import django

# Set up django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.schools.models import School
from apps.classes.models import SchoolClass, Student, TeacherProfile
from apps.quizzes.models import Lesson, Quiz, Question, Answer, CorrectAnswer
from apps.attempts.models import QuizAttempt, AttemptAnswer
from apps.recommendations.models import Recommendation
from django.utils import timezone
from datetime import datetime, timedelta
import random

User = get_user_model()

def seed():
    print("Starting database seeding...")
    
    # Clear old non-math structures to prevent duplicates
    print("Clearing old records...")
    from apps.quizzes.models import Lesson, Quiz
    from apps.attempts.models import QuizAttempt
    from apps.recommendations.models import Recommendation
    QuizAttempt.objects.all().delete()
    Recommendation.objects.all().delete()
    Quiz.objects.all().delete()
    Lesson.objects.all().delete()
    
    # 1. Create Roles
    roles = {}
    for role_name, display_name in Role.ROLE_CHOICES:
        role, created = Role.objects.get_or_create(role_name=role_name)
        roles[role_name] = role
        print(f"Role {role_name}: {'Created' if created else 'Already exists'}")
        
    # 2. Create a School
    school, created = School.objects.get_or_create(
        name="National Science College",
        defaults={
            "location": "Colombo",
            "address": "123 Main Street, Colombo",
            "province": "Western",
            "district": "Colombo",
            "zone": "Colombo Central",
            "educational_zone": "Colombo Zone 1",
        }
    )
    print(f"School {school.name}: {'Created' if created else 'Already exists'}")
    
    # 3. Create a Class Room
    class_room, created = SchoolClass.objects.get_or_create(
        name="Grade 10 - Mathematics",
        school=school,
    )
    print(f"Class Room {class_room.name}: {'Created' if created else 'Already exists'}")

    # 4. Create Users
    # System Admin
    admin_user, created = User.objects.get_or_create(
        username="admin@moe.gov.lk",
        defaults={
            "email": "admin@moe.gov.lk",
            "first_name": "System",
            "last_name": "Admin",
            "role": roles[Role.ROLE_SYSTEM_ADMIN],
            "is_staff": True,
            "is_superuser": True,
        }
    )
    admin_user.set_password("password123")
    admin_user.save()
    print(f"User {admin_user.username}: {'Created' if created else 'Already exists'}")
    
    # Students List to Create
    students_info = [
        ("student@school.edu.lk", "John", "Doe", "INDEX-10024"),
        ("aanya@school.edu.lk", "Aanya", "Mehta", "INDEX-10025"),
        ("rashan@school.edu.lk", "Rashan", "Kulathunga", "INDEX-10026"),
        ("nethmi@school.edu.lk", "Nethmi", "Silva", "INDEX-10027"),
        ("tharindu@school.edu.lk", "Tharindu", "Herath", "INDEX-10028"),
        ("dinuli@school.edu.lk", "Dinuli", "Perera", "INDEX-10029"),
        ("sahan@school.edu.lk", "Sahan", "M.", "INDEX-10030"),
        ("nethmina@school.edu.lk", "Nethmina", "S.", "INDEX-10031"),
        ("thilini@school.edu.lk", "Thilini", "R.", "INDEX-10032"),
        ("dinuka@school.edu.lk", "Dinuka", "Perera", "INDEX-10033"),
        ("sewlini@school.edu.lk", "Sewlini", "Sadaruwan", "INDEX-10034"),
        ("matin@school.edu.lk", "Matin", "Bandara", "INDEX-10035"),
        ("yasara@school.edu.lk", "Yasara", "Wickramasinghe", "INDEX-10036"),
    ]
    
    seeded_students = []
    for email, first_name, last_name, index_no in students_info:
        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "role": roles[Role.ROLE_STUDENT],
                "school": school,
            }
        )
        if created:
            user.set_password("password123")
            user.save()
            print(f"User {user.username} created.")
        
        student_prof, created = Student.objects.get_or_create(
            user=user,
            defaults={
                "index_no": index_no,
                "grade": "10",
                "class_name": "Mathematics",
                "class_room": class_room,
            }
        )
        seeded_students.append(student_prof)
        print(f"Student profile for {first_name} {'Created' if created else 'Already exists'}")

    # Teacher
    teacher_user, created = User.objects.get_or_create(
        username="teacher@school.edu.lk",
        defaults={
            "email": "teacher@school.edu.lk",
            "first_name": "Sarah",
            "last_name": "Smith",
            "role": roles[Role.ROLE_TEACHER],
            "school": school,
        }
    )
    teacher_user.set_password("password123")
    teacher_user.save()
    print(f"User {teacher_user.username}: {'Created' if created else 'Already exists'}")
    
    # Create teacher profile
    teacher_profile, created = TeacherProfile.objects.get_or_create(
        user=teacher_user,
        defaults={
            "subjects": ["Mathematics"],
        }
    )
    print(f"Teacher profile: {'Created' if created else 'Already exists'}")
    
    # Update SchoolClass with teacher link
    class_room.teacher = teacher_user
    class_room.save()
    
    # 5. Create Academic Terms & Lessons (Mathematics)
    from apps.quizzes.models import AcademicTerm
    term_1, _ = AcademicTerm.objects.get_or_create(name="Term 1", defaults={"order": 1})
    term_2, _ = AcademicTerm.objects.get_or_create(name="Term 2", defaults={"order": 2})

    lesson_sets, created = Lesson.objects.get_or_create(
        title="Sets",
        defaults={
            "description": "Concepts of sets, Venn diagrams, subset relations, and operations on sets.",
            "term": term_1,
            "created_by": admin_user,
        }
    )
    print(f"Lesson {lesson_sets.title}: {'Created' if created else 'Already exists'}")
    
    lesson_real_nums, created = Lesson.objects.get_or_create(
        title="Real Numbers",
        defaults={
            "description": "Rational and irrational numbers, decimal representations, and number line mapping.",
            "term": term_2,
            "created_by": admin_user,
        }
    )
    print(f"Lesson {lesson_real_nums.title}: {'Created' if created else 'Already exists'}")

    term_3, _ = AcademicTerm.objects.get_or_create(name="Term 3", defaults={"order": 3})

    lesson_linear_eq, created = Lesson.objects.get_or_create(
        title="Linear Equations",
        defaults={
            "description": "Solving linear equations, inequalities, and plotting system graphs.",
            "term": term_3,
            "created_by": admin_user,
        }
    )
    print(f"Lesson {lesson_linear_eq.title}: {'Created' if created else 'Already exists'}")
    
    # 6. Create 9 Quizzes for Mathematics
    # 3 Beginner Level (Sets)
    beginner_quizzes = [
        ("Sets Basics 1", "Beginner level sets quiz 1", lesson_sets, "If Set A = {1, 2, 3} and Set B = {3, 4, 5}, find the intersection A ∩ B.", "{3}", "{1, 2, 3, 4, 5}", "{4, 5}", "{}"),
        ("Sets Basics 2", "Beginner level sets quiz 2", lesson_sets, "If Set A = {1, 2} and Set B = {3, 4}, find the intersection A ∩ B.", "{}", "{1, 2, 3, 4}", "{1, 2}", "{3, 4}"),
        ("Sets Basics 3", "Beginner level sets quiz 3", lesson_sets, "Which of the following represents the universal set symbol?", "U", "∩", "∪", "∅"),
    ]
    # 3 Intermediate Level (Real Numbers)
    intermediate_quizzes = [
        ("Real Numbers Intermediate 1", "Intermediate level real numbers 1", lesson_real_nums, "Which of the following is an irrational number?", "√2", "0.5", "3/4", "√4"),
        ("Real Numbers Intermediate 2", "Intermediate level real numbers 2", lesson_real_nums, "What is the decimal representation of 1/8?", "0.125", "0.25", "0.08", "0.5"),
        ("Real Numbers Intermediate 3", "Intermediate level real numbers 3", lesson_real_nums, "Which of the following is a rational number?", "0.333...", "π", "√5", "√3"),
    ]
    # 3 Advanced Level (Linear Equations)
    advanced_quizzes = [
        ("Linear Equations Advanced 1", "Advanced level linear equations 1", lesson_linear_eq, "Solve for x: 3x - 5 = 10.", "5", "3", "15", "2"),
        ("Linear Equations Advanced 2", "Advanced level linear equations 2", lesson_linear_eq, "Solve for y: 2(y + 3) = 14.", "4", "5", "8", "3"),
        ("Linear Equations Advanced 3", "Advanced level linear equations 3", lesson_linear_eq, "Solve for x: 5x + 3 = 2x + 12.", "3", "4", "5", "2"),
    ]
    
    levels_data = [
        ("Beginner", beginner_quizzes),
        ("Intermediate", intermediate_quizzes),
        ("Advanced", advanced_quizzes),
    ]
    
    all_seeded_quizzes = []
    from apps.quizzes.models import QuizLevel
    for level_name, quiz_list in levels_data:
        q_level, _ = QuizLevel.objects.get_or_create(name=level_name)
        for title, desc, lesson_obj, q_text, ans_correct, ans_wrong1, ans_wrong2, ans_wrong3 in quiz_list:
            quiz, created = Quiz.objects.get_or_create(
                title=title,
                defaults={
                    "description": desc,
                    "lesson": lesson_obj,
                    "quiz_level": q_level,
                    "created_by": admin_user,
                    "max_attempts": 3,
                }
            )
            all_seeded_quizzes.append(quiz)
            print(f"Quiz {quiz.title} ({level_name}): {'Created' if created else 'Already exists'}")
            
            # Add a question if it has none
            if quiz.questions.count() == 0:
                question = Question.objects.create(
                    quiz=quiz,
                    question_text=q_text,
                    question_type=Question.TYPE_MCQ,
                    difficulty_level="Medium",
                )
                Answer.objects.create(question=question, answer_text=ans_correct, is_correct=True)
                Answer.objects.create(question=question, answer_text=ans_wrong1, is_correct=False)
                Answer.objects.create(question=question, answer_text=ans_wrong2, is_correct=False)
                Answer.objects.create(question=question, answer_text=ans_wrong3, is_correct=False)
                
    # 7. Create Quiz Attempts and AI Recommendations
    print("Seeding quiz attempts and recommendations...")
    students = list(Student.objects.filter(class_room=class_room))
    
    # We want to create attempts over the last 8 weeks to populate the trend chart
    base_date = timezone.now() - timedelta(days=56)
    
    for i, student in enumerate(students):
        is_at_risk = student.user.email in ["dinuka@school.edu.lk", "sewlini@school.edu.lk", "matin@school.edu.lk", "yasara@school.edu.lk"]
        
        # Determine number of quizzes completed
        num_quizzes = random.randint(6, 8)
        selected_quizzes = random.sample(all_seeded_quizzes, num_quizzes)
        
        for q_idx, quiz in enumerate(selected_quizzes):
            # Attempt date distributed over the last 8 weeks
            attempt_date = base_date + timedelta(days=random.randint(1, 54), hours=random.randint(1, 23))
            
            if is_at_risk:
                score = random.choice([25.0, 33.3, 40.0, 48.0])
            else:
                score = random.choice([70.0, 75.0, 80.0, 85.0, 90.0, 100.0])
                
            QuizAttempt.objects.create(
                student=student,
                quiz=quiz,
                attempt_number=1,
                start_time=attempt_date,
                end_time=attempt_date + timedelta(minutes=random.randint(10, 25)),
                score=score
            )
            
        if is_at_risk:
            # Create AI recommendations
            Recommendation.objects.create(
                student=student,
                topic="Linear Equations",
                recommended_activity="Reinforce Linear Equations Fundamentals"
            )
            Recommendation.objects.create(
                student=student,
                topic="Percentage",
                recommended_activity="Strengthen Percentage Problem Solving"
            )
            Recommendation.objects.create(
                student=student,
                topic="Real Numbers",
                recommended_activity="Build Fluency in Real Number Operations"
            )

    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed()
