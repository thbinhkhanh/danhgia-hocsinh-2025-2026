export const exportQuestionsToJSON = ({
  questions,
  fileName = "de_trac_nghiem",
}) => {
  try {
    const exportData = questions.map((q, index) => {
      // 🔥 FIX MATCHING (giữ đầy đủ ảnh + text)
      let pairs = [];
      if (q.type === "matching") {
        pairs = (q.pairs || []).map((p) => ({
          left: p.left || "",
          right: p.right || "",
          leftImage: p.leftImage || "",
          rightImage: p.rightImage || "",
        }));
      }

      return {
        id: q.id || `q_${index + 1}`,
        question: q.question || "",
        questionImage: q.questionImage || "",

        type: q.type || "single",

        // 🔥 giữ nguyên options (có thể chứa image URL)
        options: Array.isArray(q.options) ? [...q.options] : [],

        correct: Array.isArray(q.correct) ? [...q.correct] : [],

        score: q.score ?? 0.5,

        sortType: q.sortType || "fixed",

        // 🔥 FIX ở đây
        pairs,

        columnRatio: q.columnRatio || { left: 1, right: 1 },

        answers: Array.isArray(q.answers) ? [...q.answers] : [],
      };
    });

    // 👉 stringify đẹp
    const jsonString = JSON.stringify(exportData, null, 2);

    // 👉 tạo file
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    // 🔥 đảm bảo có .json
    const finalName = fileName.endsWith(".json")
      ? fileName
      : `${fileName}.json`;

    a.download = finalName;
    a.click();

    URL.revokeObjectURL(url);

    return { success: true };
  } catch (err) {
    console.error("❌ Export JSON error:", err);
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

          // 🔥 normalize option (giữ image)
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

          const questions = jsonData.map((q, index) => {
            const isStringOptions =
              Array.isArray(q.options) &&
              typeof q.options[0] === "string";

            const base = {
              id: q.id || `q_${Date.now()}_${index}`,
              question: q.question || "",
              questionImage: q.questionImage || "",
              type: q.type || "single",

              // ✅ FIX: giữ image trong options
              options: isStringOptions
                ? q.options.map(normalizeOption)
                : (q.options || []).map(normalizeOption),

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
                  options: base.options.length
                    ? base.options
                    : [
                        { text: "Đúng", image: "", formats: {} },
                        { text: "Sai", image: "", formats: {} },
                      ],
                  correct: q.correct?.length ? q.correct : ["Đúng"],
                };

              // 🔥🔥🔥 FIX QUAN TRỌNG NHẤT Ở ĐÂY
              case "matching":
                return {
                  ...base,

                  pairs: (q.pairs || []).map((p) => ({
                    left: p.left ?? "",
                    right: p.right ?? "",

                    // ✅ GIỮ ẢNH LEFT
                    leftImage: p.leftImage?.url
                      ? {
                          url: p.leftImage.url,
                          name: p.leftImage.name || "",
                        }
                      : "",

                    // ✅ GIỮ ẢNH RIGHT (nếu có)
                    rightImage: p.rightImage?.url
                      ? {
                          url: p.rightImage.url,
                          name: p.rightImage.name || "",
                        }
                      : "",
                  })),

                  columnRatio: q.columnRatio || { left: 1, right: 1 },
                };

              case "sort":
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

              case "fillblank": {
                // 🔥 detect cấu trúc 2
                const isStructure2 =
                  Array.isArray(q.options) &&
                  q.options.length > 0 &&
                  typeof q.option === "string";

                if (isStructure2) {
                  return {
                    ...base,

                    // ✅ GIỮ NGUYÊN CÂU GỐC CÓ [...]
                    option: q.option,

                    // normalize options
                    options: q.options.map(normalizeOption),

                    // ❗ cấu trúc 1 không dùng correct
                    correct: [],
                    answers: [],
                  };
                }

                // =========================
                // 🔥 STRUCTURE 1 GIỮ NGUYÊN
                // =========================
                return {
                  ...base,
                  option: q.option || "",   // 🔥 FIX thêm dòng này luôn cho chắc
                  options: base.options || [],
                  answers: q.answers || [],
                  correct: [],
                };
              }

              case "multiple":
              case "single":
              default: {
                // =========================
                // normalize options (GIỮ INDEX GỐC)
                // =========================
                const optionsRaw =
                  Array.isArray(q.options) && q.options.length
                    ? q.options
                    : [
                        { text: "", image: "", formats: {} },
                        { text: "", image: "", formats: {} },
                        { text: "", image: "", formats: {} },
                        { text: "", image: "", formats: {} },
                      ];

                const normalizedOptions = optionsRaw.map((opt) =>
                  normalizeOption(opt)
                );

                // =========================
                // FIX QUAN TRỌNG: correct phải là INDEX NUMBER
                // =========================
                let correct = q.correct || [];

                // nếu data cũ là string → convert về index an toàn
                if (!Array.isArray(correct)) correct = [];

                correct = correct
                  .map((c) => Number(c))
                  .filter((n) => !isNaN(n));

                return {
                  ...base,

                  options: normalizedOptions,

                  // 🔥 QUAN TRỌNG: giữ đúng dạng index
                  correct,

                  // 🔥 thêm flag để shuffle sau này KHÔNG lỗi mapping
                  sortType: q.sortType || "shuffle",
                };
              }
            }
          });

          resolve({ success: true, data: questions });
        } catch (parseErr) {
          console.error(parseErr);
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