export function localized(value, language) {
  if (!value || typeof value !== "object") return "";
  return value[language] || value[language === "hi" ? "en" : "hi"] || "";
}

export function publicQuestion(question, language = "hi", extras = {}) {
  return {
    questionRef: question._id,
    bankId: question.bankId,
    questionId: question.questionId,
    chapterId: question.chapterId,
    chapterTitle: question.chapterTitle,
    sourceQuestionNumber: question.sourceQuestionNumber,
    sourcePageStart: question.sourcePageStart,
    sourcePageEnd: question.sourcePageEnd,
    type: question.type,
    question: localized(question.question, language),
    options: (question.options || []).map((option) => ({
      key: option.key,
      text: localized(option.text, language),
      rawText: option.rawText
    })),
    explanation: localized(question.explanation, language),
    examFacts: (question.examFacts || []).map((fact) => localized(fact, language)).filter(Boolean),
    ...extras
  };
}

export function weightedPick(items, weightField = "value") {
  if (!items.length) return null;
  const total = items.reduce((sum, item) => sum + Math.max(1, Number(item[weightField]) || 1), 0);
  let target = Math.random() * total;

  for (const item of items) {
    target -= Math.max(1, Number(item[weightField]) || 1);
    if (target <= 0) return item;
  }

  return items[items.length - 1];
}
