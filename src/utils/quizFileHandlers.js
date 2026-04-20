import { exportQuestionsToJSON, importQuestionsFromJSON } from "./exportJson_importJson";

// =============================
// EXPORT
// =============================
export const handleExportQuiz = ({
  selectedClass,
  semester,
  schoolYear,
  examLetter,
  selectedSubject,
  selectedDoc,
  questions,
  setFileName,
  setOpenExportDialog,
}) => {
  let defaultName = "";

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
};

// =============================
// CONFIRM EXPORT
// =============================
export const handleConfirmExportQuiz = ({
  fileName,
  questions,
  setSnackbar,
  setOpenExportDialog,
}) => {
  setOpenExportDialog(false);

  let finalName = fileName.trim();

  if (!finalName) {
    setSnackbar({
      open: true,
      message: "❌ Tên file không được để trống",
      severity: "error",
    });
    return;
  }

  finalName = finalName.replace(/\.json_\d+$/, "");

  if (!finalName.endsWith(".json")) {
    finalName += ".json";
  }

  const result = exportQuestionsToJSON({
    questions,
    fileName: finalName,
  });

  setSnackbar({
    open: true,
    message: result.success
      ? "✅ Xuất đề thành công!"
      : "❌ Lỗi khi xuất đề!",
    severity: result.success ? "success" : "error",
  });
};

// =============================
// IMPORT
// =============================
export const handleImportQuiz = async ({
  event,
  setQuestions,
  setSnackbar,
}) => {
  try {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await importQuestionsFromJSON(file);

    if (result.success) {
      setQuestions(result.data);
    }

    setSnackbar({
      open: true,
      message: result.success
        ? "✅ Nhập đề thành công!"
        : `❌ ${result.error}`,
      severity: result.success ? "success" : "error",
    });
  } catch (err) {
    setSnackbar({
      open: true,
      message: `❌ Import lỗi: ${err.message}`,
      severity: "error",
    });
  } finally {
    // luôn reset input dù lỗi hay không
    if (event?.target) event.target.value = "";
  }
};