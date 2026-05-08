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
