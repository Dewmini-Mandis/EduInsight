from django.db import models


class QuizAttempt(models.Model):
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
	start_time = models.DateTimeField()
	end_time = models.DateTimeField(null=True, blank=True)
	score = models.FloatField(null=True, blank=True)

	class Meta:
		unique_together = ("student", "quiz", "attempt_number")

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

	def __str__(self) -> str:
		return f"Attempt {self.attempt_id} - Question {self.question_id}"


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
