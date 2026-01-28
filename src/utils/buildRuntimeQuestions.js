// src/utils/buildRuntimeQuestions.js

//import { shuffleArray, shuffleUntilDifferent } from "./shuffleUtils";
// ↑ nếu 2 hàm này đang nằm ở file khác
// nếu đang cùng file thì import đúng path tương ứng

export function shuffleArray(arr = []) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function shuffleUntilDifferent(arr = []) {
  if (arr.length <= 1) return arr;

  let shuffled;
  do {
    shuffled = shuffleArray(arr);
  } while (shuffled.every((v, i) => v.idx === arr[i].idx));

  return shuffled;
}


export function buildRuntimeQuestions(rawQuestions = []) {
  // 🔥 1. SHUFFLE THỨ TỰ CÂU HỎI
  let saved = shuffleArray([...rawQuestions]);

  const loadedQuestions = saved
    .map((q, index) => {
      const questionId = q.id ?? `q_${index}`;
      const questionText =
        typeof q.question === "string" ? q.question.trim() : "";

      const rawType = (q.type || "").toString().trim().toLowerCase();
      const type = [
        "sort",
        "matching",
        "single",
        "multiple",
        "image",
        "truefalse",
        "fillblank",
      ].includes(rawType)
        ? rawType
        : null;

      if (!type) return null;

      // ================= MATCHING =================
      if (type === "matching") {
        const pairs = Array.isArray(q.pairs) ? q.pairs : [];
        if (pairs.length === 0) return null;

        const leftOptions = pairs.map((p, idx) => {
          if (p.leftImage && p.leftImage.url) {
            return {
              type: "image",
              url: p.leftImage.url,
              name: p.leftImage.name || `img-${idx}`,
            };
          }

          if (
            typeof p.left === "string" &&
            /^https?:\/\//i.test(p.left.trim())
          ) {
            return {
              type: "image",
              url: p.left.trim(),
              name: `img-${idx}`,
            };
          }

          return p.left ?? "";
        });

        const rightOriginal = pairs.map((p, idx) => ({
          opt: p.right,
          idx,
        }));

        const processedRight =
          q.sortType === "shuffle"
            ? shuffleUntilDifferent(rightOriginal)
            : rightOriginal;

        const indexMap = {};
        processedRight.forEach((item, newIndex) => {
          indexMap[item.idx] = newIndex;
        });

        const correct = leftOptions.map((_, i) => indexMap[i]);

        return {
          ...q,
          id: questionId,
          type,
          question: questionText,
          image: q.image ?? null,
          leftOptions,
          rightOptions: processedRight.map(i => i.opt),
          correct,
          score: q.score ?? 1,
        };
      }

      // ================= SORT =================
      if (type === "sort") {
        const options =
          Array.isArray(q.options) && q.options.length > 0
            ? [...q.options]
            : ["", "", "", ""];

        const indexed = options.map((opt, idx) => ({ opt, idx }));

        const processed =
          q.sortType === "shuffle"
            ? shuffleUntilDifferent(indexed)
            : indexed;

        return {
          ...q,
          id: questionId,
          type,
          question: questionText,
          image: q.image ?? null,
          options: processed.map(i => i.opt),
          initialSortOrder: processed.map(i => i.idx),
          correctTexts: options,
          score: q.score ?? 1,
        };
      }

      // ================= SINGLE / MULTIPLE =================
      if (type === "single" || type === "multiple") {
        const options =
          Array.isArray(q.options) && q.options.length > 0
            ? q.options.map(opt => {
                if (typeof opt === "string") {
                  if (/^https?:\/\/.*\.(png|jpg|jpeg|gif)$/i.test(opt)) {
                    return { text: "", image: opt };
                  }
                  return { text: opt, image: null };
                }
                if (typeof opt === "object") {
                  return {
                    text: opt.text ?? "",
                    image: opt.image ?? null,
                  };
                }
                return { text: "", image: null };
              })
            : Array(4).fill({ text: "", image: null });

        const indexed = options.map((opt, idx) => ({ opt, idx }));
        const shouldShuffle =
          q.sortType === "shuffle" || q.shuffleOptions === true;

        const processed = shouldShuffle
          ? shuffleArray(indexed)
          : indexed;

        return {
          ...q,
          id: questionId,
          type,
          question: questionText,
          image: q.image ?? null,
          options,
          displayOrder: processed.map(i => i.idx),
          correct: Array.isArray(q.correct)
            ? q.correct.map(Number)
            : typeof q.correct === "number"
            ? [q.correct]
            : [],
          score: q.score ?? 1,
        };
      }

      // ================= IMAGE =================
      if (type === "image") {
        const options =
          Array.isArray(q.options) && q.options.length > 0
            ? q.options
            : ["", "", "", ""];

        return {
          ...q,
          id: questionId,
          type,
          question: questionText,
          image: q.image ?? null,
          options,
          displayOrder: shuffleArray(options.map((_, idx) => idx)),
          correct: Array.isArray(q.correct) ? q.correct : [],
          score: q.score ?? 1,
        };
      }

      // ================= TRUE / FALSE =================
      if (type === "truefalse") {
        const options =
          Array.isArray(q.options) && q.options.length >= 2
            ? [...q.options]
            : ["Đúng", "Sai"];

        const indexed = options.map((opt, idx) => ({ opt, idx }));
        const processed =
          q.sortType === "shuffle" ? shuffleArray(indexed) : indexed;

        return {
          ...q,
          id: questionId,
          type,
          question: questionText,
          image: q.image ?? null,
          options: processed.map(i => i.opt),
          initialOrder: processed.map(i => i.idx),
          correct:
            Array.isArray(q.correct) && q.correct.length === options.length
              ? q.correct
              : options.map(() => ""),
          score: q.score ?? 1,
        };
      }

      // ================= FILL BLANK =================
      if (type === "fillblank") {
        const options = Array.isArray(q.options) ? q.options : [];

        return {
          ...q,
          id: questionId,
          type,
          question: questionText,
          image: q.image ?? null,
          option: q.option,
          options,
          shuffledOptions: shuffleArray([...options]),
          score: q.score ?? 1,
        };
      }

      return null;
    })
    .filter(Boolean);

  // ================= VALIDATE =================
  return loadedQuestions.filter(q => {
    if (q.type === "matching")
      return q.question.trim() && q.leftOptions.length && q.rightOptions.length;
    if (q.type === "sort")
      return q.question.trim() && q.options.length;
    if (["single", "multiple", "image"].includes(q.type))
      return q.question.trim() && q.options.length;
    if (q.type === "truefalse")
      return q.question.trim() && q.options.length >= 2;
    if (q.type === "fillblank")
      return q.question.trim() && q.options.length;
    return false;
  });
}
