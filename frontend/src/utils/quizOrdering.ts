export const getLevelRank = (quiz: any): number => {
  const levelName = (
    quiz.quiz_level_name ||
    quiz.quiz_level_details?.name ||
    quiz.learning_level ||
    (typeof quiz.quiz_level === "object" ? quiz.quiz_level?.name : "") ||
    (typeof quiz.quiz_level === "string" ? quiz.quiz_level : "")
  ).toLowerCase();

  if (levelName.includes("beginner") || levelName.includes("basic")) return 1;
  if (levelName.includes("intermediate") || levelName.includes("medium")) return 2;
  if (levelName.includes("advanced") || levelName.includes("hard")) return 3;

  if (typeof quiz.quiz_level === "object" && quiz.quiz_level?.order != null) {
    return Number(quiz.quiz_level.order) || 1;
  }
  if (typeof quiz.quiz_level === "number") {
    return quiz.quiz_level;
  }
  return 1;
};

export const getDifficultyRank = (quiz: any): number => {
  const diffName = (
    quiz.difficulty_name ||
    quiz.difficulty_details?.name ||
    (typeof quiz.difficulty === "object" ? quiz.difficulty?.name : "") ||
    (typeof quiz.difficulty === "string" ? quiz.difficulty : "")
  ).toLowerCase();

  if (diffName.includes("easy") || diffName.includes("low") || diffName.includes("beginner")) return 1;
  if (diffName.includes("medium") || diffName.includes("intermediate")) return 2;
  if (diffName.includes("hard") || diffName.includes("high") || diffName.includes("advanced")) return 3;

  if (typeof quiz.difficulty === "object" && quiz.difficulty?.order != null) {
    return Number(quiz.difficulty.order) || 1;
  }
  if (typeof quiz.difficulty === "number") {
    return quiz.difficulty;
  }
  return 1;
};

export const sortQuizzesByProgression = <T extends any>(quizzes: T[]): T[] => {
  const published = quizzes.filter((q: any) => q.status !== "DRAFT" && q.status !== "draft");
  const drafts = quizzes.filter((q: any) => q.status === "DRAFT" || q.status === "draft");

  const sortedPublished = [...published].sort((a: any, b: any) => {
    // 1. Level rank ASC (Beginner -> Intermediate -> Advanced)
    const lvlA = getLevelRank(a);
    const lvlB = getLevelRank(b);
    if (lvlA !== lvlB) return lvlA - lvlB;

    // 2. Difficulty rank ASC (Easy -> Medium -> Hard)
    const diffA = getDifficultyRank(a);
    const diffB = getDifficultyRank(b);
    if (diffA !== diffB) return diffA - diffB;

    // 3. Order Number ASC
    const orderA = Number(a.order ?? 1);
    const orderB = Number(b.order ?? 1);
    if (orderA !== orderB) return orderA - orderB;

    // Fallback: ID ASC
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

  const sortedDrafts = [...drafts].sort((a: any, b: any) => {
    // Sort drafts by updated_at DESC, created_at DESC, or ID DESC
    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });

  return [...sortedPublished, ...sortedDrafts];
};
