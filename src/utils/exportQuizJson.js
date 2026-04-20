export const handleExportQuiz = ({
  questions,
  selectedClass,
  semester,
  schoolYear,
  examLetter,
  selectedSubject,
  selectedDoc,
  fileName,
  setFileName,
  setOpenExportDialog,
  setSnackbar,
}) => {
  try {
    let defaultName = "";

    // =========================
    // 1. TẠO TÊN FILE TỰ ĐỘNG
    // =========================
    if (selectedClass || semester || schoolYear || examLetter) {
      const subject = selectedSubject || "Tin học";
      const lop = selectedClass || "";

      const hk =
        semester === "Cuối kỳ I"
          ? "HK1"
          : semester === "Giữa kỳ I"
          ? "HK1"
          : semester === "Giữa kỳ II"
          ? "HK2"
          : semester === "Cả năm"
          ? "CN"
          : "HK2";

      const year = schoolYear || "";
      const code = examLetter ? ` (${examLetter.toUpperCase()})` : "";

      defaultName = `Đề ${subject} ${lop} ${hk} ${year}${code}`;
    } else if (selectedDoc) {
      const parts = selectedDoc.split("_");

      if (parts.length >= 7) {
        const subject = "Tin học";
        const lop = `Lớp ${parts[3]}`;
        const hk = parts[4].toUpperCase();
        const year = parts[5];
        const code = ` (${parts[6].toUpperCase()})`;

        defaultName = `Đề_${subject}_${lop}_${hk}_${year}${code}`;
      } else {
        defaultName = selectedDoc;
      }
    }

    setFileName(defaultName);
    setOpenExportDialog(true);
  } catch (err) {
    setSnackbar?.({
      open: true,
      message: `❌ Lỗi tạo tên file: ${err.message}`,
      severity: "error",
    });
  }
};

export const handleConfirmExportQuiz = ({
  fileName,
  questions,
  setSnackbar,
}) => {
  try {
    let finalName = fileName.trim();

    if (!finalName) {
      setSnackbar({
        open: true,
        message: "❌ Tên file không được để trống",
        severity: "error",
      });
      return;
    }

    // =========================
    // CLEAN NAME
    // =========================
    finalName = finalName.replace(/\.json_\d+$/, "");

    if (!finalName.endsWith(".json")) {
      finalName += ".json";
    }

    // =========================
    // MAP QUESTIONS
    // =========================
    const exportData = questions.map((q, index) => {
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
        options: Array.isArray(q.options) ? [...q.options] : [],
        correct: Array.isArray(q.correct) ? [...q.correct] : [],
        score: q.score ?? 0.5,
        sortType: q.sortType || "fixed",
        pairs,
        columnRatio: q.columnRatio || { left: 1, right: 1 },
        answers: Array.isArray(q.answers) ? [...q.answers] : [],
        option: q.option || "",
      };
    });

    // =========================
    // DOWNLOAD FILE
    // =========================
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = finalName;
    a.click();

    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: "✅ Xuất đề thành công!",
      severity: "success",
    });

    return { success: true };
  } catch (err) {
    console.error("❌ Export error:", err);

    setSnackbar?.({
      open: true,
      message: `❌ Lỗi export: ${err.message}`,
      severity: "error",
    });

    return { success: false, error: err.message };
  }
};