from django.db import models


class AcademicTerm(models.Model):
	name = models.CharField(max_length=50, unique=True)
	is_active = models.BooleanField(default=True)
	order = models.PositiveIntegerField(default=0)

	def __str__(self) -> str:
		return self.name

class Lesson(models.Model):
	title = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	term = models.ForeignKey(
		AcademicTerm,
		on_delete=models.SET_NULL,
		null=True,
		related_name="lessons",
	)
	grade = models.CharField(max_length=20, default="Grade 10", blank=True)
	created_by = models.ForeignKey(
		"accounts.User",
		on_delete=models.SET_NULL,
		null=True,
		related_name="lessons_created",
	)
	created_at = models.DateTimeField(auto_now_add=True)
	is_active = models.BooleanField(default=True)

	quiz = models.ForeignKey(
		"Quiz",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="remedial_lessons",
	)
	order = models.PositiveIntegerField(default=1)
	def __str__(self) -> str:
		return f"{self.title} ({self.term})"

class Topic(models.Model):
	name = models.CharField(max_length=255)
	lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="topics")
	is_active = models.BooleanField(default=True)

	def __str__(self) -> str:
		return self.name

class Skill(models.Model):
	name = models.CharField(max_length=255)
	lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="skills", null=True, blank=True)
	topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name="skills", null=True, blank=True)
	is_active = models.BooleanField(default=True)

	def __str__(self) -> str:
		return self.name

class QuizLevel(models.Model):
	name = models.CharField(max_length=50, unique=True)
	order = models.PositiveIntegerField(default=0)
	
	def __str__(self) -> str:
		return self.name

class DifficultyLevel(models.Model):
	name = models.CharField(max_length=50, unique=True)
	order = models.PositiveIntegerField(default=0)
	
	def __str__(self) -> str:
		return self.name


class LearningMaterial(models.Model):
	TYPE_VIDEO = "VIDEO"
	TYPE_PDF = "PDF"
	TYPE_TEXT = "TEXT"
	
	MATERIAL_TYPES = [
		(TYPE_VIDEO, "Video"),
		(TYPE_PDF, "PDF Document"),
		(TYPE_TEXT, "Text/Summary"),
	]

	title = models.CharField(max_length=255)
	material_type = models.CharField(max_length=20, choices=MATERIAL_TYPES)
	content = models.TextField(blank=True, help_text="Text content or URL")
	file = models.FileField(upload_to="materials/videos/", null=True, blank=True)
	
	lesson = models.ForeignKey(Lesson, on_delete=models.SET_NULL, null=True, blank=True, related_name="materials")
	topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name="materials")
	skill = models.ForeignKey(Skill, on_delete=models.SET_NULL, null=True, blank=True, related_name="materials")
	quiz = models.ForeignKey("quizzes.Quiz", on_delete=models.SET_NULL, null=True, blank=True, related_name="learning_materials")
	
	created_by = models.ForeignKey(
		"accounts.User",
		on_delete=models.SET_NULL,
		null=True,
		related_name="materials_created",
	)
	created_at = models.DateTimeField(auto_now_add=True)
	
	is_required = models.BooleanField(default=True)
	order = models.PositiveIntegerField(default=1)
	section_order = models.JSONField(default=list, blank=True, help_text="Ordered list of section types, e.g. ['NOTE', 'ATTACHMENTS', 'VIDEO']")
	estimated_completion_minutes = models.PositiveIntegerField(default=5, null=True, blank=True, help_text="Estimated completion time in minutes for Note and PDF/Attachment materials.")
	class Meta:
		indexes = [
			models.Index(fields=["-created_at"], name="idx_mat_created_at"),
			models.Index(fields=["skill", "lesson"], name="idx_mat_skill_lesson"),
		]

	def __str__(self) -> str:
		return self.title


class MaterialAttachment(models.Model):
	material = models.ForeignKey(LearningMaterial, on_delete=models.CASCADE, related_name="attachments")
	file = models.FileField(upload_to="materials/attachments/")
	attachment_type = models.CharField(max_length=20, choices=[("PDF", "PDF"), ("IMAGE", "Image")])
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"{self.attachment_type} for {self.material.title}"


class VideoQuestion(models.Model):
	TYPE_MCQ = "MCQ"
	TYPE_TF = "True / False"

	QUESTION_TYPES = [
		(TYPE_MCQ, "Multiple Choice"),
		(TYPE_TF, "True / False")
	]

	material = models.ForeignKey(LearningMaterial, on_delete=models.CASCADE, related_name="video_questions")
	timestamp = models.FloatField(help_text="Timestamp in seconds")
	question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
	question_text = models.TextField()
	options = models.JSONField(default=list, help_text="List of options with text and is_correct flags")

	def __str__(self):
		return f"Question at {self.timestamp}s for {self.material.title}"


class Quiz(models.Model):
	STATUS_DRAFT = "DRAFT"
	STATUS_PUBLISHED = "PUBLISHED"
	STATUS_UNPUBLISHED = "UNPUBLISHED"
	
	STATUS_CHOICES = [
		(STATUS_DRAFT, "Draft"),
		(STATUS_PUBLISHED, "Published"),
		(STATUS_UNPUBLISHED, "Unpublished"),
	]

	title = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
	lesson = models.ForeignKey(
		Lesson,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="quizzes",
	)
	topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name="quizzes")
	skill = models.ForeignKey(Skill, on_delete=models.SET_NULL, null=True, blank=True, related_name="quizzes")
	quiz_level = models.ForeignKey(QuizLevel, on_delete=models.SET_NULL, null=True, blank=True, related_name="quizzes")
	difficulty = models.ForeignKey(DifficultyLevel, on_delete=models.SET_NULL, null=True, blank=True, related_name="quizzes")
	order = models.PositiveIntegerField(default=1)
	pass_mark = models.PositiveIntegerField(default=50)
	estimated_time_minutes = models.PositiveIntegerField(default=10)
	created_by = models.ForeignKey(
		"accounts.User",
		on_delete=models.SET_NULL,
		null=True,
		related_name="quizzes_created",
	)
	assigned_class = models.ForeignKey(
		"classes.SchoolClass",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="quizzes",
	)
	assigned_classes = models.ManyToManyField(
		"classes.SchoolClass",
		blank=True,
		related_name="multi_assigned_quizzes",
	)
	school = models.ForeignKey(
		"schools.School",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="quizzes",
	)
	skills = models.ManyToManyField(Skill, blank=True, related_name="multi_skill_quizzes")
	created_at = models.DateTimeField(auto_now_add=True)
	max_attempts = models.PositiveIntegerField(default=3)
	is_deleted = models.BooleanField(default=False)

	def get_covered_skills(self):
		skills = set()
		if self.skill_id:
			skills.add(self.skill)
		for s in self.skills.all():
			skills.add(s)
		qs_skill_ids = set(self.questions.exclude(skill_id=None).values_list("skill_id", flat=True))
		if qs_skill_ids:
			skills.update(Skill.objects.filter(id__in=qs_skill_ids))
		return list(skills)

	def __str__(self) -> str:
		return self.title


class QuestionBank(models.Model):
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	school = models.ForeignKey(
		"schools.School",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="question_banks",
	)
	created_by = models.ForeignKey(
		"accounts.User",
		on_delete=models.SET_NULL,
		null=True,
		related_name="question_banks_created",
	)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return self.name


class QuizBlueprint(models.Model):
	quiz = models.OneToOneField(Quiz, on_delete=models.CASCADE, related_name="blueprint")
	question_bank = models.ForeignKey(QuestionBank, on_delete=models.CASCADE, related_name="blueprints")
	total_questions = models.PositiveIntegerField(default=10)
	beginner_count = models.PositiveIntegerField(default=3)
	intermediate_count = models.PositiveIntegerField(default=4)
	advanced_count = models.PositiveIntegerField(default=3)

	def __str__(self) -> str:
		return f"Blueprint for {self.quiz.title}"


class Question(models.Model):
	TYPE_MCQ = "MCQ"
	TYPE_NUMERIC = "NUMERIC"

	QUESTION_TYPES = [
		(TYPE_MCQ, "MCQ"),
		(TYPE_NUMERIC, "Numeric"),
	]

	quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions", null=True, blank=True)
	question_bank = models.ForeignKey(QuestionBank, on_delete=models.CASCADE, related_name="questions", null=True, blank=True)
	skill = models.ForeignKey("quizzes.Skill", on_delete=models.SET_NULL, null=True, blank=True, related_name="questions")
	question_text = models.TextField()
	question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
	difficulty_level = models.CharField(max_length=50, blank=True)

	def __str__(self) -> str:
		parent = self.quiz.title if self.quiz else (self.question_bank.name if self.question_bank else "Unassigned")
		return f"{parent} - {self.question_text[:40]}"


class QuestionVersion(models.Model):
	question = models.ForeignKey(
		Question, on_delete=models.CASCADE, related_name="versions"
	)
	version_number = models.PositiveIntegerField()
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ("question", "version_number")

	def __str__(self) -> str:
		return f"Version {self.version_number} of Q{self.question.id}"

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

class EngagementQuestion(models.Model):
	TYPE_MCQ = "MCQ"
	TYPE_TF = "TF"
	QUESTION_TYPES = [
		(TYPE_MCQ, "Multiple Choice"),
		(TYPE_TF, "True/False"),
	]

	material = models.ForeignKey(LearningMaterial, on_delete=models.CASCADE, related_name="engagement_questions")
	question_text = models.TextField()
	question_type = models.CharField(max_length=10, choices=QUESTION_TYPES)
	options = models.JSONField(default=dict, blank=True)
	correct_answer = models.CharField(max_length=255)
	timestamp = models.PositiveIntegerField(null=True, blank=True)
	position = models.PositiveIntegerField(null=True, blank=True)
	explanation = models.TextField(blank=True)
	is_required = models.BooleanField(default=True)
	order = models.PositiveIntegerField(default=1)

	def __str__(self) -> str:
		return f"Engagement: {self.question_text[:30]}"
