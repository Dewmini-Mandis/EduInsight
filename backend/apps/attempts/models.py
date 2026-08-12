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
