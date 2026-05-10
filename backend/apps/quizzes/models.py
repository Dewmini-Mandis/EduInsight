from django.db import models


class Quiz(models.Model):
	title = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	created_by = models.ForeignKey(
		"accounts.User",
		on_delete=models.SET_NULL,
		null=True,
		related_name="quizzes_created",
	)
	school = models.ForeignKey(
		"schools.School",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="quizzes",
	)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return self.title


class Question(models.Model):
	TYPE_MCQ = "MCQ"
	TYPE_NUMERIC = "NUMERIC"

	QUESTION_TYPES = [
		(TYPE_MCQ, "MCQ"),
		(TYPE_NUMERIC, "Numeric"),
	]

	quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
	question_text = models.TextField()
	question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
	difficulty_level = models.CharField(max_length=50, blank=True)

	def __str__(self) -> str:
		return f"{self.quiz.title} - {self.question_text[:40]}"


class QuestionVariant(models.Model):
	question = models.ForeignKey(
		Question, on_delete=models.CASCADE, related_name="variants"
	)
	variant_number = models.PositiveIntegerField()
	parameters = models.JSONField(default=dict, blank=True)
	correct_value = models.CharField(max_length=255)

	class Meta:
		unique_together = ("question", "variant_number")

	def __str__(self) -> str:
		return f"Variant {self.variant_number} for {self.question.id}"


class Answer(models.Model):
	question = models.ForeignKey(
		Question, on_delete=models.CASCADE, related_name="answers"
	)
	answer_text = models.CharField(max_length=255)
	is_correct = models.BooleanField(default=False)

	def __str__(self) -> str:
		return self.answer_text


class CorrectAnswer(models.Model):
	question = models.OneToOneField(
		Question, on_delete=models.CASCADE, related_name="correct_answer"
	)
	correct_value = models.CharField(max_length=255)

	def __str__(self) -> str:
		return self.correct_value


class Hint(models.Model):
	question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="hints")
	hint_text = models.TextField()
	sequence_no = models.PositiveIntegerField()

	class Meta:
		unique_together = ("question", "sequence_no")

	def __str__(self) -> str:
		return f"Hint {self.sequence_no}"
