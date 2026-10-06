from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from apps.accounts.models import User, Role
from apps.classes.models import SchoolClass, Student
from apps.schools.models import School


class StudentTeacherOwnershipTests(APITestCase):
    def setUp(self):
        self.sys_admin_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_SYSTEM_ADMIN)
        self.teacher_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_TEACHER)
        self.student_role, _ = Role.objects.get_or_create(role_name=Role.ROLE_STUDENT)

        self.school = School.objects.create(name="Test School")
        self.classroom = SchoolClass.objects.create(name="Grade 10-A", school=self.school)

        self.sys_admin = User.objects.create_user(
            username="admin@test.com", email="admin@test.com", password="password123", role=self.sys_admin_role
        )
        self.teacher_a = User.objects.create_user(
            username="teachera@test.com", email="teachera@test.com", password="password123", role=self.teacher_role, school=self.school
        )
        self.teacher_b = User.objects.create_user(
            username="teacherb@test.com", email="teacherb@test.com", password="password123", role=self.teacher_role, school=self.school
        )

        self.user_a1 = User.objects.create_user(
            username="s_a1@test.com", email="s_a1@test.com", password="password123", role=self.student_role, school=self.school
        )
        self.student_a1 = Student.objects.create(user=self.user_a1, index_no="IND001", class_room=self.classroom, registered_by=self.teacher_a)

        self.user_b1 = User.objects.create_user(
            username="s_b1@test.com", email="s_b1@test.com", password="password123", role=self.student_role, school=self.school
        )
        self.student_b1 = Student.objects.create(user=self.user_b1, index_no="IND002", class_room=self.classroom, registered_by=self.teacher_b)

        from apps.classes.models import TeacherClassroom
        TeacherClassroom.objects.create(teacher=self.teacher_a, classroom=self.classroom, is_active=True)
        TeacherClassroom.objects.create(teacher=self.teacher_b, classroom=self.classroom, is_active=True)

        self.users_list_url = "/api/accounts/users/"

    def test_teacher_student_list_isolation(self):
        """
        Verify Teacher A sees only Student A1, Teacher B sees only Student B1.
        """
        def get_items(res):
            return res.data["results"] if isinstance(res.data, dict) and "results" in res.data else res.data

        # Teacher A
        self.client.force_authenticate(user=self.teacher_a)
        res = self.client.get(self.users_list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = get_items(res)
        emails = [s["email"] for s in items]
        self.assertIn("s_a1@test.com", emails)
        self.assertNotIn("s_b1@test.com", emails)

        # Teacher B
        self.client.force_authenticate(user=self.teacher_b)
        res = self.client.get(self.users_list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = get_items(res)
        emails = [s["email"] for s in items]
        self.assertIn("s_b1@test.com", emails)
        self.assertNotIn("s_a1@test.com", emails)

    def test_teacher_direct_student_access_security(self):
        """
        Verify Teacher B cannot view details, edit, or delete Teacher A's student.
        """
        detail_url = f"{self.users_list_url}{self.user_a1.id}/"
        self.client.force_authenticate(user=self.teacher_b)

        # Detail GET
        res = self.client.get(detail_url)
        self.assertIn(res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        # PATCH
        res = self.client.patch(detail_url, {"first_name": "Hacked"}, format="json")
        self.assertIn(res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        # DELETE
        res = self.client.delete(detail_url)
        self.assertIn(res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    def test_teacher_create_student_auto_assigned(self):
        """
        Verify student created by Teacher A is automatically assigned to Teacher A.
        """
        self.client.force_authenticate(user=self.teacher_a)
        payload = {
            "email": "newstudent@test.com",
            "first_name": "New",
            "last_name": "Student",
            "password": "password123",
            "role": "STUDENT",
            "school_id": self.school.id,
            "class_room_id": self.classroom.id,
            "index_no": "IND003"
        }
        res = self.client.post(self.users_list_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_user_id = res.data["id"]
        created_student = Student.objects.get(user_id=new_user_id)
        self.assertEqual(created_student.registered_by, self.teacher_a)

    def test_sysadmin_create_and_reassign_student(self):
        """
        Verify System Admin can select assigned teacher during creation and reassign student.
        """
        self.client.force_authenticate(user=self.sys_admin)
        payload = {
            "email": "admincreated@test.com",
            "first_name": "Admin",
            "last_name": "Created",
            "password": "password123",
            "role": "STUDENT",
            "school_id": self.school.id,
            "class_room_id": self.classroom.id,
            "assigned_teacher_id": self.teacher_a.id,
            "index_no": "IND004"
        }
        res = self.client.post(self.users_list_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_user_id = res.data["id"]
        created_student = Student.objects.get(user_id=new_user_id)
        self.assertEqual(created_student.registered_by, self.teacher_a)

        # Reassign to Teacher B
        update_url = f"{self.users_list_url}{new_user_id}/"
        res = self.client.patch(update_url, {"assigned_teacher_id": self.teacher_b.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        created_student.refresh_from_db()
        self.assertEqual(created_student.registered_by, self.teacher_b)

    def test_student_class_update_persists_in_db(self):
        """
        Verify updating student class_room_id persists the new class relationship in database.
        """
        from apps.classes.models import TeacherClassroom
        new_classroom = SchoolClass.objects.create(name="Grade 10-B", school=self.school)
        TeacherClassroom.objects.create(teacher=self.teacher_a, classroom=new_classroom, is_active=True)
        TeacherClassroom.objects.get_or_create(teacher=self.teacher_a, classroom=self.classroom, is_active=True)

        self.client.force_authenticate(user=self.teacher_a)
        update_url = f"{self.users_list_url}{self.user_a1.id}/"
        res = self.client.patch(update_url, {"class_room_id": new_classroom.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.student_a1.refresh_from_db()
        self.assertEqual(self.student_a1.class_room, new_classroom)

    def test_teacher_cannot_assign_student_to_other_teacher_class(self):
        """
        Verify Teacher A cannot assign student to a classroom assigned only to Teacher B.
        """
        from apps.classes.models import TeacherClassroom
        other_classroom = SchoolClass.objects.create(name="Grade 11-A", school=self.school)
        TeacherClassroom.objects.create(teacher=self.teacher_b, classroom=other_classroom, is_active=True)

        self.client.force_authenticate(user=self.teacher_a)
        update_url = f"{self.users_list_url}{self.user_a1.id}/"
        res = self.client.patch(update_url, {"class_room_id": other_classroom.id}, format="json")
        self.assertIn(res.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])

    def test_teacher_class_removal_safety_with_assigned_students(self):
        """
        Verify removing a class assignment from a teacher is blocked if students are assigned.
        """
        from apps.classes.models import TeacherClassroom
        tc, _ = TeacherClassroom.objects.get_or_create(teacher=self.teacher_a, classroom=self.classroom)
        tc.is_active = True
        tc.save()

        self.client.force_authenticate(user=self.teacher_a)
        remove_url = "/api/classes/teacher-assignments/remove-classroom/"
        res = self.client.post(remove_url, {"classroom_id": self.classroom.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("students are currently assigned to it", res.data["detail"])

    def test_teacher_class_removal_success_without_students(self):
        """
        Verify removing a class assignment succeeds if no students are assigned.
        """
        from apps.classes.models import TeacherClassroom
        empty_classroom = SchoolClass.objects.create(name="Empty Class", school=self.school)
        tc = TeacherClassroom.objects.create(teacher=self.teacher_a, classroom=empty_classroom, is_active=True)

        self.client.force_authenticate(user=self.teacher_a)
        remove_url = "/api/classes/teacher-assignments/remove-classroom/"
        res = self.client.post(remove_url, {"classroom_id": empty_classroom.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        tc.refresh_from_db()
        self.assertFalse(tc.is_active)

