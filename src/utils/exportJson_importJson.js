export const exportQuestionsToJSON = ({
  questions,
  fileName = "de_trac_nghiem",
}) => {
  try {
    const exportData = questions.map((q, index) => ({
      id: q.id || `q_${index + 1}`,
      question: q.question || "",
      questionImage: q.questionImage || "",
      type: q.type || "single",
      options: q.options || [],
      correct: q.correct || [],
      score: q.score ?? 0.5,
      sortType: q.sortType || "fixed",
      pairs: q.pairs || [],
      columnRatio: q.columnRatio || { left: 1, right: 1 },
      answers: q.answers || [],
    }));

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    // ❌ bỏ Date.now() đi
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url);

    return { success: true };
  } catch (err) {
    console.error("Export JSON error:", err);
    return { success: false, error: err.message };
  }
};

export const importQuestionsFromJSON = (file) => {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);

          if (!Array.isArray(jsonData)) {
            throw new Error("JSON không đúng format");
          }

          const questions = jsonData.map((q, index) => {
            // 🔥 detect options dạng app1 (string)
            const isStringOptions =
              Array.isArray(q.options) &&
              typeof q.options[0] === "string";

            // 🔥 normalize option (chỉ dùng cho options)
            const normalizeOption = (opt) => {
              if (typeof opt === "object" && opt !== null) {
                return {
                  text: opt.text || "",
                  image: opt.image || "",
                  formats: opt.formats || {},
                };
              }

              return {
                text: opt || "",
                image: "",
                formats: {},
              };
            };

            const base = {
              id: q.id || `q_${Date.now()}_${index}`,
              question: q.question || "",
              questionImage: q.questionImage || "",
              type: q.type || "single",

              // 🔥 chỉ convert options (KHÔNG đụng pairs)
              options: isStringOptions
                ? q.options.map(normalizeOption)
                : q.options || [],

              correct: q.correct || [],
              score: q.score ?? 0.5,
            };

            switch (q.type) {
              case "image":
                return {
                  ...base,
                  options: Array.from({ length: 4 }, (_, i) =>
                    normalizeOption(q.options?.[i])
                  ),
                  correct: Array.isArray(q.correct) ? q.correct : [],
                };

              case "truefalse":
                return {
                  ...base,
                  options: base.options?.length
                    ? base.options
                    : [
                        { text: "Đúng", image: "", formats: {} },
                        { text: "Sai", image: "", formats: {} },
                      ],
                  correct: q.correct?.length ? q.correct : ["Đúng"],
                };

              case "matching":
                return {
                  ...base,

                  // 🔥 FIX QUAN TRỌNG: giữ nguyên string (không convert)
                  pairs: (q.pairs || []).map((p) => ({
                    left: p.left ?? "",
                    right: p.right ?? "",
                  })),

                  columnRatio: q.columnRatio || { left: 1, right: 1 },
                };

              case "sort":
                return {
                  ...base,
                  options: base.options?.length
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

              case "fillblank":
                return {
                  ...base,
                  options: base.options || [],
                  answers: q.answers || [],
                };

              case "multiple":
              case "single":
              default:
                return {
                  ...base,
                  options: base.options?.length
                    ? base.options
                    : [
                        { text: "", image: "", formats: {} },
                        { text: "", image: "", formats: {} },
                        { text: "", image: "", formats: {} },
                        { text: "", image: "", formats: {} },
                      ],
                  correct: q.correct || [],
                };
            }
          });

          resolve({ success: true, data: questions });
        } catch (parseErr) {
          resolve({
            success: false,
            error: "❌ File JSON không hợp lệ hoặc sai cấu trúc",
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          error: "❌ Không thể đọc file",
        });
      };

      reader.readAsText(file);
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
};