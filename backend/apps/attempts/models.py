from django.db import models
from django.utils import timezone


class QuizAttempt(models.Model):
	STATUS_IN_PROGRESS = "IN_PROGRESS"
	STATUS_SUBMITTED = "SUBMITTED"
	STATUS_EXPIRED = "EXPIRED"

	STATUS_CHOICES = [
		(STATUS_IN_PROGRESS, "In Progress"),
		(STATUS_SUBMITTED, "Submitted"),
		(STATUS_EXPIRED, "Expired"),
	]

	TYPE_ORDINARY = "ORDINARY"
	TYPE_REASSESSMENT = "REASSESSMENT"

	ATTEMPT_TYPES = [
		(TYPE_ORDINARY, "Ordinary Attempt"),
		(TYPE_REASSESSMENT, "Post-Remedial Reassessment"),
	]

	student = models.ForeignKey(
		"classes.Student",
		on_delete=models.CASCADE,
		related_name="quiz_attempts",
	)
	quiz = models.ForeignKey(
		"quizzes.Quiz",
		on_delete=models.CASCADE,
		related_name="attempts",
	)
	attempt_number = models.PositiveIntegerField()
	attempt_type = models.CharField(max_length=20, choices=ATTEMPT_TYPES, default=TYPE_ORDINARY)
	start_time = models.DateTimeField()
	end_time = models.DateTimeField(null=True, blank=True)
	expires_at = models.DateTimeField(null=True, blank=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SUBMITTED)
	auto_submitted = models.BooleanField(default=False)
	score = models.FloatField(null=True, blank=True)

	class Meta:
		unique_together = ("student", "quiz", "attempt_type", "attempt_number")
		indexes = [
			models.Index(fields=["-start_time"], name="idx_attempt_start_time"),
			models.Index(fields=["student", "quiz", "status"], name="idx_attempt_stud_quiz_stat"),
		]

	def __str__(self) -> str:
		return f"Attempt {self.attempt_number} - {self.quiz.title}"


class AttemptQuestion(models.Model):
	attempt = models.ForeignKey(
		QuizAttempt,
		on_delete=models.CASCADE,
		related_name="attempt_questions",
	)
	question = models.ForeignKey(
		"quizzes.Question",
		on_delete=models.CASCADE,
		related_name="attempt_questions",
	)
	variant = models.ForeignKey(
		"quizzes.QuestionVariant",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="attempt_questions",
	)
	order = models.PositiveIntegerField(default=1)

	class Meta:
		ordering = ["order", "id"]

	def __str__(self) -> str:
		return f"Attempt {self.attempt_id} - Question {self.question_id} (Order {self.order})"


class AttemptAnswer(models.Model):
	attempt = models.ForeignKey(
		QuizAttempt,
		on_delete=models.CASCADE,
		related_name="answers",
	)
	question = models.ForeignKey(
		"quizzes.Question",
		on_delete=models.CASCADE,
		related_name="attempt_answers",
	)
	variant = models.ForeignKey(
		"quizzes.QuestionVariant",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="attempt_answers",
	)
	selected_answer = models.ForeignKey(
		"quizzes.Answer",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="attempt_answers",
	)
	typed_answer = models.TextField(null=True, blank=True)
	is_correct = models.BooleanField(default=False)
	response_time = models.FloatField(null=True, blank=True)
	hint_count = models.PositiveIntegerField(default=0)
	attempt_count = models.PositiveIntegerField(default=1)
	answered_at = models.DateTimeField(default=timezone.now)
	skill = models.ForeignKey(
		"quizzes.Skill",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="attempt_answers",
	)
	model_eligible = models.BooleanField(default=True)

	def __str__(self) -> str:
		return f"Answer {self.id}"


class ManualMark(models.Model):
	attempt_answer = models.OneToOneField(
		AttemptAnswer,
		on_delete=models.CASCADE,
		related_name="manual_mark"
	)
	teacher = models.ForeignKey(
		"accounts.User",
		on_delete=models.SET_NULL,
		null=True,
		related_name="manual_marks"
	)
	original_mark = models.FloatField(null=True, blank=True)
	updated_mark = models.FloatField()
	feedback = models.TextField(blank=True)
	reason_for_change = models.TextField(blank=True)
	marked_at = models.DateTimeField(auto_now_add=True)
	is_draft = models.BooleanField(default=False)

	def __str__(self) -> str:
		return f"Mark for Answer {self.attempt_answer_id}"

class TeacherOverride(models.Model):
	teacher = models.ForeignKey(
		"accounts.User",
		on_delete=models.SET_NULL,
		null=True,
		related_name="granted_overrides"
	)
	student = models.ForeignKey(
		"classes.Student",
		on_delete=models.CASCADE,
		related_name="overrides"
	)
	quiz = models.ForeignKey(
		"quizzes.Quiz",
		on_delete=models.CASCADE,
		related_name="overrides"
	)
	override_type = models.CharField(max_length=50) # e.g. "EXTRA_ATTEMPT", "EXTEND_DEADLINE", "REOPEN"
	previous_value = models.CharField(max_length=255, null=True, blank=True)
	new_value = models.CharField(max_length=255)
	reason = models.TextField()
	is_consumed = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return f"Override {self.override_type} for {self.student_id} on {self.quiz_id}"

class StudentLessonProgress(models.Model):
	STATUS_NOT_STARTED = "NOT_STARTED"
	STATUS_IN_PROGRESS = "IN_PROGRESS"
	STATUS_COMPLETED = "COMPLETED"
	STATUS_CHOICES = [
		(STATUS_NOT_STARTED, "Not Started"),
		(STATUS_IN_PROGRESS, "In Progress"),
		(STATUS_COMPLETED, "Completed"),
	]

	student = models.ForeignKey("classes.Student", on_delete=models.CASCADE, related_name="lesson_progress")
	lesson = models.ForeignKey("quizzes.Lesson", on_delete=models.CASCADE, related_name="student_progress")
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NOT_STARTED)
	progress_percentage = models.FloatField(default=0)
	started_at = models.DateTimeField(null=True, blank=True)
	completed_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		unique_together = ("student", "lesson")

	def __str__(self):
		return f"{self.student.user.username} - {self.lesson.title} - {self.status}"


class StudentContentProgress(models.Model):
	student = models.ForeignKey("classes.Student", on_delete=models.CASCADE, related_name="content_progress")
	material = models.ForeignKey("quizzes.LearningMaterial", on_delete=models.CASCADE, related_name="student_progress")
	watched_percentage = models.FloatField(default=0)
	is_completed = models.BooleanField(default=False)
	started_at = models.DateTimeField(null=True, blank=True)
	completed_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		unique_together = ("student", "material")

	def __str__(self):
		return f"{self.student.user.username} - {self.material.title} - {'Completed' if self.is_completed else 'In Progress'}"


class StudentEngagementAnswer(models.Model):
	student = models.ForeignKey("classes.Student", on_delete=models.CASCADE, related_name="engagement_answers")
	question = models.ForeignKey("quizzes.EngagementQuestion", on_delete=models.CASCADE, related_name="student_answers")
	selected_answer = models.CharField(max_length=255)
	is_correct = models.BooleanField(default=False)
	answered_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ("student", "question")

	def __str__(self):
		return f"{self.student.user.username} - {self.question.id} - {'Correct' if self.is_correct else 'Incorrect'}"

class StudentRemediationState(models.Model):
	STATUS_PENDING_MATERIALS = "PENDING_MATERIALS"
	STATUS_REASSESSMENT_UNLOCKED = "REASSESSMENT_UNLOCKED"
	STATUS_REASSESSMENT_IN_PROGRESS = "REASSESSMENT_IN_PROGRESS"
	STATUS_COMPLETED_SUCCESS = "COMPLETED_SUCCESS"
	STATUS_ESCALATED_TEACHER = "ESCALATED_TEACHER"

	STATUS_CHOICES = [
		(STATUS_PENDING_MATERIALS, "Pending Required Materials"),
		(STATUS_REASSESSMENT_UNLOCKED, "Reassessment Unlocked"),
		(STATUS_REASSESSMENT_IN_PROGRESS, "Reassessment In Progress"),
		(STATUS_COMPLETED_SUCCESS, "Remediation Passed"),
		(STATUS_ESCALATED_TEACHER, "Escalated to Teacher"),
	]

	student = models.ForeignKey(
		"classes.Student",
		on_delete=models.CASCADE,
		related_name="remediation_states",
	)
	quiz = models.ForeignKey(
		"quizzes.Quiz",
		on_delete=models.CASCADE,
		related_name="remediation_states",
	)
	status = models.CharField(
		max_length=30,
		choices=STATUS_CHOICES,
		default=STATUS_PENDING_MATERIALS,
	)
	weak_skills = models.ManyToManyField(
		"quizzes.Skill",
		blank=True,
		related_name="remediation_weak_states",
	)
	required_materials = models.ManyToManyField(
		"quizzes.LearningMaterial",
		blank=True,
		related_name="remediation_required_states",
	)
	reassessment_attempt = models.ForeignKey(
		QuizAttempt,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="remediation_states",
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ("student", "quiz")

	def __str__(self) -> str:
		return f"RemediationState: {self.student.user.username} - {self.quiz.title} ({self.status})"


class TeacherIntervention(models.Model):
	OUTCOME_IMPROVED = "IMPROVED"
	OUTCOME_STABLE = "STABLE"
	OUTCOME_STILL_STRUGGLING = "STILL_STRUGGLING"
	
	OUTCOME_CHOICES = [
		(OUTCOME_IMPROVED, "Improved"),
		(OUTCOME_STABLE, "Stable"),
		(OUTCOME_STILL_STRUGGLING, "Still Struggling"),
	]

	TYPE_EXTRA_PRACTICE = "EXTRA_PRACTICE"
	TYPE_1ON1 = "1ON1"
	
	TYPE_CHOICES = [
		(TYPE_EXTRA_PRACTICE, "Extra Practice"),
		(TYPE_1ON1, "1-on-1 Session"),
	]

	teacher = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="recorded_interventions", null=True, blank=True)
	student = models.ForeignKey("classes.Student", on_delete=models.CASCADE, related_name="interventions")
	quiz = models.ForeignKey("quizzes.Quiz", on_delete=models.CASCADE, related_name="teacher_interventions", null=True, blank=True)
	skill = models.ForeignKey("quizzes.Skill", on_delete=models.CASCADE, related_name="interventions", null=True, blank=True)
	remediation_state = models.ForeignKey(
		StudentRemediationState,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="teacher_interventions",
	)
	is_pending = models.BooleanField(default=True)
	notes = models.TextField(blank=True)
	intervention_type = models.CharField(max_length=50, choices=TYPE_CHOICES, blank=True)
	outcome = models.CharField(max_length=50, choices=OUTCOME_CHOICES, blank=True)
	date_recorded = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		t_name = self.teacher.username if self.teacher else "Pending System Alert"
		return f"Intervention for {self.student.user.username} (Teacher: {t_name}, Pending: {self.is_pending})"

