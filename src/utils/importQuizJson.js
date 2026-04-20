export const handleImportQuiz = async ({
  event,
  setQuestions,
  setSnackbar,
}) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);

        if (!Array.isArray(jsonData)) {
          throw new Error("JSON không đúng format");
        }

        // =========================
        // NORMALIZE OPTION
        // =========================
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

        // =========================
        // MAP QUESTIONS
        // =========================
        const questions = jsonData.map((q, index) => {
          const rawOptions = Array.isArray(q.options) ? q.options : [];

          const isStringOptions =
            rawOptions.length > 0 && typeof rawOptions[0] === "string";

          const base = {
            id: q.id || `q_${Date.now()}_${index}`,
            question: q.question || "",
            questionImage: q.questionImage || "",
            type: q.type || "single",

            options: isStringOptions
              ? rawOptions.map(normalizeOption)
              : rawOptions.map(normalizeOption),

            correct: Array.isArray(q.correct) ? q.correct : [],
            score: q.score ?? 0.5,
          };

          switch (q.type) {
            // =========================
            case "image":
              return {
                ...base,
                options: Array.from({ length: 4 }, (_, i) =>
                  normalizeOption(q.options?.[i])
                ),
                correct: Array.isArray(q.correct) ? q.correct : [],
              };

            // =========================
            case "truefalse":
              return {
                ...base,
                options: base.options?.length
                  ? base.options
                  : [
                      { text: "Đúng", image: "", formats: {} },
                      { text: "Sai", image: "", formats: {} },
                    ],
                correct: Array.isArray(q.correct)
                  ? q.correct
                  : ["Đúng"],
              };

            // =========================
            case "matching":
              return {
                ...base,
                pairs: Array.isArray(q.pairs)
                  ? q.pairs.map((p) => ({
                      left: p.left ?? "",
                      right: p.right ?? "",

                      leftImage: p.leftImage?.url
                        ? {
                            url: p.leftImage.url,
                            name: p.leftImage.name || "",
                          }
                        : "",

                      rightImage: p.rightImage?.url
                        ? {
                            url: p.rightImage.url,
                            name: p.rightImage.name || "",
                          }
                        : "",
                    }))
                  : [],

                columnRatio: q.columnRatio || { left: 1, right: 1 },
              };

            // =========================
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
                  Array.isArray(q.correct) && q.correct.length
                    ? q.correct
                    : Array.isArray(q.options)
                    ? q.options.map((_, i) => i)
                    : [],

                sortType: q.sortType || "fixed",
              };

            // =========================
            case "fillblank":
              return {
                ...base,
                option: q.option || "",
                options: base.options || [],
                answers: Array.isArray(q.answers) ? q.answers : [],
                correct: [],
              };

            // =========================
            case "multiple":
            case "single":
            default: {
              let correct = Array.isArray(q.correct)
                ? q.correct
                : [];

              correct = correct
                .map((c) => Number(c))
                .filter((n) => !isNaN(n));

              return {
                ...base,
                correct,
                options: base.options || [],
                sortType: q.sortType || "shuffle",
              };
            }
          }
        });

        setQuestions(questions);

        setSnackbar({
          open: true,
          message: "✅ Nhập đề thành công!",
          severity: "success",
        });
      } catch (err) {
        setSnackbar({
          open: true,
          message: "❌ File JSON không hợp lệ hoặc sai cấu trúc",
          severity: "error",
        });
      }
    };

    reader.onerror = () => {
      setSnackbar({
        open: true,
        message: "❌ Không thể đọc file",
        severity: "error",
      });
    };

    reader.readAsText(file);
  } catch (err) {
    setSnackbar({
      open: true,
      message: `❌ Lỗi import: ${err.message}`,
      severity: "error",
    });
  } finally {
    event.target.value = "";
  }
};