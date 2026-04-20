// src/utils/processQuestions.js

export const processQuestions = ({
  data,
  buildRuntimeQuestions,
  setQuestions,
  setAnswers,
  setStarted,
}) => {
  try {
    if (!data?.questions) {
      console.error("❌ Không có dữ liệu câu hỏi");
      setQuestions([]);
      return;
    }

    // 🔹 Build câu hỏi runtime
    const runtimeQuestions = buildRuntimeQuestions(data.questions);

    // 🔹 Set state
    setQuestions(runtimeQuestions);
    setStarted(true);

    // 🔹 Init answers (cho dạng sort)
    setAnswers((prev) => {
      const next = { ...prev };

      runtimeQuestions.forEach((q) => {
        if (q.type === "sort" && Array.isArray(q.initialSortOrder)) {
          if (!Array.isArray(next[q.id])) {
            next[q.id] = q.initialSortOrder;
          }
        }
      });

      return next;
    });

  } catch (err) {
    console.error("❌ Lỗi xử lý câu hỏi:", err);
    setQuestions([]);
  }
};