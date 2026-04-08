export const exportQuestionsToJSON = ({
  questions,
  fileName = "de_trac_nghiem",
}) => {
  try {
    // ✅ Chuẩn hóa FULL dữ liệu (KHÔNG làm mất field)
    const exportData = questions.map((q, index) => ({
      id: q.id || `q_${index + 1}`,

      // Nội dung
      question: q.question || "",
      questionImage: q.questionImage || "",

      // Loại câu hỏi
      type: q.type || "single",

      // Các field chung
      options: q.options || [],
      correct: q.correct || [],
      score: q.score ?? 0.5,

      // 🔥 SORT
      sortType: q.sortType || "fixed",

      // 🔥 MATCHING
      pairs: q.pairs || [],
      columnRatio: q.columnRatio || { left: 1, right: 1 },

      // 🔥 FILL BLANK
      answers: q.answers || [],

      // 🔥 TRUE/FALSE fallback
      // (để tránh mất dữ liệu nếu sau này mở rộng)
    }));

    const jsonString = JSON.stringify(exportData, null, 2);

    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}_${Date.now()}.json`;
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
            const base = {
              id: q.id || `q_${Date.now()}_${index}`,
              question: q.question || "",
              questionImage: q.questionImage || "",
              type: q.type || "single",
              options: q.options || [],
              correct: q.correct || [],
              score: q.score ?? 0.5,
            };

            switch (q.type) {
              case "image":
                return {
                  ...base,
                  options: Array.from({ length: 4 }, (_, i) => q.options?.[i] || ""),
                  correct: Array.isArray(q.correct) ? q.correct : [],
                };

              case "truefalse":
                return {
                  ...base,
                  options: q.options?.length ? q.options : ["Đúng", "Sai"],
                  correct: q.correct?.length ? q.correct : ["Đúng"],
                };

              case "matching":
                return {
                  ...base,
                  pairs: q.pairs || [],
                  columnRatio: q.columnRatio || { left: 1, right: 1 },
                };

              case "sort":
                return {
                  ...base,
                  options: q.options || ["", "", "", ""],
                  correct: q.correct || q.options?.map((_, i) => i) || [],
                  sortType: q.sortType || "fixed",
                };

              case "fillblank":
                return {
                  ...base,
                  options: q.options || [],
                  answers: q.answers || [],
                };

              case "multiple":
              case "single":
              default:
                return {
                  ...base,
                  options: q.options || ["", "", "", ""],
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