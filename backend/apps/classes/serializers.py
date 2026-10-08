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
    teachers = serializers.SerializerMethodField()

    class Meta:
        model = SchoolClass
        fields = ["id", "name", "school", "school_name", "is_active", "teachers"]
        extra_kwargs = {
            "school": {"required": False, "allow_null": True}
        }

    def get_teachers(self, obj):
        active_tc = obj.teacherclassroom_set.filter(is_active=True)
        return TeacherClassroomSerializer(active_tc, many=True).data

class StudentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    school_id = serializers.IntegerField(source="school_id", read_only=True)
    school_name = serializers.CharField(source="school.name", read_only=True)
    registered_by_id = serializers.IntegerField(source="registered_by_id", read_only=True)
    
    class Meta:
        model = Student
        fields = ["id", "user", "username", "email", "user_name", "index_no", "grade", "class_name", "class_room", "school_id", "school_name", "registered_by_id"]

    def get_user_name(self, obj):
        name = obj.user.get_full_name()
        return name if name else obj.user.username

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
