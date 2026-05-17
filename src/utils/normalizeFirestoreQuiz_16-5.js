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

    // =========================
    // IMAGE
    // =========================
    if (q.type === "image") {
      return {
        ...base,
        options: Array.from({ length: 4 }, (_, i) =>
          normalizeOption(q.options?.[i])
        ),
      };
    }

    // =========================
    // TRUEFALSE
    // =========================
    if (q.type === "truefalse") {
      return {
        ...base,
        options: base.options.length
          ? base.options
          : [
              { text: "Đúng", image: "", formats: {} },
              { text: "Sai", image: "", formats: {} },
            ],
        correct: q.correct?.length ? q.correct : ["Đúng"],
      };
    }

    // =========================
    // MATCHING (🔥 FIX QUAN TRỌNG NHẤT)
    // =========================
    if (q.type === "matching") {
      return {
        ...base,

        pairs: (q.pairs || []).map((p) => ({
          left: p.left ?? "",
          right: p.right ?? "",

          // 🔥 GIỮ ẢNH LEFT (Firestore + JSON thống nhất)
          leftImage: p.leftImage?.url
            ? {
                url: p.leftImage.url,
                name: p.leftImage.name || "",
              }
            : p.leftImage?.url
              ? p.leftImage
              : "",

          // 🔥 GIỮ ẢNH RIGHT
          rightImage: p.rightImage?.url
            ? {
                url: p.rightImage.url,
                name: p.rightImage.name || "",
              }
            : "",
        })),

        columnRatio: q.columnRatio || { left: 1, right: 1 },
      };
    }

    // =========================
    // SORT
    // =========================
    if (q.type === "sort") {
      return {
        ...base,
        options: base.options.length
          ? base.options
          : [
              { text: "", image: "", formats: {} },
              { text: "", image: "", formats: {} },
              { text: "", image: "", formats: {} },
              { text: "", image: "", formats: {} },
            ],
        correct:
          q.correct?.length
            ? q.correct
            : q.options?.map((_, i) => i) || [],
        sortType: q.sortType || "fixed",
      };
    }

    // =========================
    // FILLBLANK
    // =========================
    if (q.type === "fillblank") {
      const isStructure2 =
        Array.isArray(q.options) &&
        q.options.length > 0 &&
        typeof q.option === "string";

      if (isStructure2) {
        return {
          ...base,
          option: q.option,
          options: q.options.map(normalizeOption),
          correct: [],
          answers: [],
        };
      }

      return {
        ...base,
        option: q.option || "",
        options: base.options || [],
        answers: q.answers || [],
        correct: [],
      };
    }

    // =========================
    // SINGLE / MULTIPLE
    // =========================
    return {
      ...base,
      correct: (q.correct || [])
        .map((c) => Number(c))
        .filter((n) => !isNaN(n)),
      sortType: q.sortType || "shuffle",
    };
  });
};