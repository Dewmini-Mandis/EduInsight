from rest_framework import serializers
from .models import SchoolClass, TeacherClassroom, Student, TeacherProfile, ClassroomAccessRequest

class TeacherClassroomSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True)
    teacher_email = serializers.CharField(source="teacher.email", read_only=True)

    class Meta:
        model = TeacherClassroom
        fields = ["id", "teacher", "teacher_name", "teacher_email", "classroom", "is_active", "assigned_at"]

class SchoolClassSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source="school.name", read_only=True)
    teachers = TeacherClassroomSerializer(source="teacherclassroom_set", many=True, read_only=True)

    class Meta:
        model = SchoolClass
        fields = ["id", "name", "school", "school_name", "is_active", "teachers"]

class StudentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    
    class Meta:
        model = Student
        fields = ["id", "user", "user_name", "index_no", "grade", "class_name", "class_room"]

class TeacherProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = ["id", "user", "subjects", "classrooms"]

class ClassroomAccessRequestSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True)
    classroom_name = serializers.CharField(source="classroom.name", read_only=True)

    class Meta:
        model = ClassroomAccessRequest
        fields = "__all__"
        read_only_fields = ["requested_at", "resolved_at", "resolved_by"]
