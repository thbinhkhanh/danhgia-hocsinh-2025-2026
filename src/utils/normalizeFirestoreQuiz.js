export const normalizeFirestoreQuiz = (data = []) => {
  const normalizeOption = (opt) => {
    if (typeof opt === "object" && opt !== null) {
      return {
        text: opt.text || "",
        image: opt.image || "",
        formats: opt.formats || {},
      };
    }
    return { text: opt || "", image: "", formats: {} };
  };

  return data.map((q, i) => {
    const rawOptions = Array.isArray(q.options) ? q.options : [];

    const base = {
      id: q.id || `q_${Date.now()}_${i}`,
      question: q.question || "",
      questionImage: q.questionImage || "",
      type: q.type || "single",
      options: rawOptions.map(normalizeOption),
      correct: Array.isArray(q.correct) ? q.correct : [],
      score: q.score ?? 0.5,
    };

    if (q.type === "image") {
      return {
        ...base,
        options: Array.from({ length: 4 }, (_, i) =>
          normalizeOption(q.options?.[i])
        ),
      };
    }

    if (q.type === "truefalse") {
      return {
        ...base,
        options: base.options.length
          ? base.options
          : [
              { text: "Đúng", image: "", formats: {} },
              { text: "Sai", image: "", formats: {} },
            ],
        correct: base.correct.length ? base.correct : ["Đúng"],
      };
    }

    if (q.type === "matching") {
      return {
        ...base,
        pairs: (q.pairs || []).map((p) => ({
          left: p.left ?? "",
          right: p.right ?? "",
        })),
      };
    }

    if (q.type === "sort") {
      return {
        ...base,
        correct: base.correct.length
          ? base.correct
          : rawOptions.map((_, i) => i),
        sortType: q.sortType || "fixed",
      };
    }

    if (q.type === "fillblank") {
      return {
        ...base,
        option: q.option || "",
        answers: Array.isArray(q.answers) ? q.answers : [],
        correct: [],
      };
    }

    // single + multiple
    return {
      ...base,
      correct: base.correct.map(Number).filter((n) => !isNaN(n)),
      sortType: q.sortType || "shuffle",
    };
  });
};