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

User = get_user_model()

def seed():
    print("Starting database seeding...")
    
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
        name="Grade 10 - Physics",
        school=school,
    )
    print(f"Class Room {class_room.name}: {'Created' if created else 'Already exists'}")

    # 4. Create Users
    # National Admin
    admin_user, created = User.objects.get_or_create(
        username="admin@moe.gov.lk",
        defaults={
            "email": "admin@moe.gov.lk",
            "first_name": "National",
            "last_name": "Admin",
            "role": roles[Role.ROLE_NATIONAL_ADMIN],
            "is_staff": True,
            "is_superuser": True,
        }
    )
    admin_user.set_password("password123")
    admin_user.save()
    print(f"User {admin_user.username}: {'Created' if created else 'Already exists'}")
    
    # Student
    student_user, created = User.objects.get_or_create(
        username="student@school.edu.lk",
        defaults={
            "email": "student@school.edu.lk",
            "first_name": "John",
            "last_name": "Doe",
            "role": roles[Role.ROLE_STUDENT],
            "school": school,
        }
    )
    student_user.set_password("password123")
    student_user.save()
    print(f"User {student_user.username}: {'Created' if created else 'Already exists'}")
    
    # Create student profile
    student_profile, created = Student.objects.get_or_create(
        user=student_user,
        defaults={
            "index_no": "INDEX-10024",
            "grade": "10",
            "class_name": "Physics",
            "class_room": class_room,
        }
    )
    print(f"Student profile: {'Created' if created else 'Already exists'}")
    
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
            "subjects": ["Physics", "Chemistry"],
        }
    )
    print(f"Teacher profile: {'Created' if created else 'Already exists'}")
    
    # 5. Create Lessons
    lesson_physics, created = Lesson.objects.get_or_create(
        title="Intro to Physics",
        defaults={
            "description": "Fundamental concepts of mechanics, kinematics, and thermodynamics.",
            "term": "1st Term",
            "created_by": admin_user,
        }
    )
    print(f"Lesson {lesson_physics.title}: {'Created' if created else 'Already exists'}")
    
    lesson_chem, created = Lesson.objects.get_or_create(
        title="Chemical Bonding",
        defaults={
            "description": "Ionic, covalent, and metallic bonds, plus molecular structures.",
            "term": "2nd Term",
            "created_by": admin_user,
        }
    )
    print(f"Lesson {lesson_chem.title}: {'Created' if created else 'Already exists'}")

    lesson_bio, created = Lesson.objects.get_or_create(
        title="Cell Biology",
        defaults={
            "description": "Structures, functions, and divisions of eukaryotic and prokaryotic cells.",
            "term": "3rd Term",
            "created_by": admin_user,
        }
    )
    print(f"Lesson {lesson_bio.title}: {'Created' if created else 'Already exists'}")
    
    # 6. Create 9 Quizzes for Intro to Physics
    # 3 Beginner Level
    beginner_quizzes = [
        ("Physics Basics 1", "Beginner level physics quiz 1"),
        ("Physics Basics 2", "Beginner level physics quiz 2"),
        ("Physics Basics 3", "Beginner level physics quiz 3"),
    ]
    # 3 Intermediate Level
    intermediate_quizzes = [
        ("Intermediate Mechanics 1", "Intermediate level mechanics 1"),
        ("Intermediate Mechanics 2", "Intermediate level mechanics 2"),
        ("Intermediate Mechanics 3", "Intermediate level mechanics 3"),
    ]
    # 3 Advanced Level
    advanced_quizzes = [
        ("Advanced Quantum 1", "Advanced level quantum mechanics 1"),
        ("Advanced Quantum 2", "Advanced level quantum mechanics 2"),
        ("Advanced Quantum 3", "Advanced level quantum mechanics 3"),
    ]
    
    levels_data = [
        ("Beginner", beginner_quizzes),
        ("Intermediate", intermediate_quizzes),
        ("Advanced", advanced_quizzes),
    ]
    
    for level_name, quiz_list in levels_data:
        for title, desc in quiz_list:
            quiz, created = Quiz.objects.get_or_create(
                title=title,
                defaults={
                    "description": desc,
                    "lesson": lesson_physics,
                    "learning_level": level_name,
                    "created_by": admin_user,
                    "max_attempts": 3,
                }
            )
            print(f"Quiz {quiz.title} ({level_name}): {'Created' if created else 'Already exists'}")
            
            # Add a question if it has none
            if quiz.questions.count() == 0:
                question = Question.objects.create(
                    quiz=quiz,
                    question_text="Solve: What is the unit of force in the SI system?",
                    question_type=Question.TYPE_MCQ,
                    difficulty_level="Medium",
                )
                Answer.objects.create(question=question, answer_text="Newton", is_correct=True)
                Answer.objects.create(question=question, answer_text="Joule", is_correct=False)
                Answer.objects.create(question=question, answer_text="Watt", is_correct=False)
                Answer.objects.create(question=question, answer_text="Pascal", is_correct=False)
                
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed()
