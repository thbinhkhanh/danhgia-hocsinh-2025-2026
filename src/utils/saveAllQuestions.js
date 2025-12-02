import { doc, setDoc } from "firebase/firestore";

export const saveAllQuestions = async ({
  questions,
  isQuestionValid,
  db,
  selectedClass,
  selectedSubject,
  semester,
  schoolYear,
  examLetter,
  examType,
  week,
  quizConfig,
  updateQuizConfig,
  setDeTuan,
  setSnackbar,
  setIsEditingNewDoc,
}) => {
  const invalid = questions
    .map((q, i) => (!isQuestionValid(q) ? `Câu ${i + 1}` : null))
    .filter(Boolean);

  if (invalid.length > 0) {
    setSnackbar({
      open: true,
      message: `❌ Các câu hỏi chưa hợp lệ: ${invalid.join(", ")}`,
      severity: "error",
    });
    return;
  }

  try {
    const weekValue =
      typeof week !== "undefined" && week !== null
        ? week
        : quizConfig?.deTuan ?? localStorage.getItem("deTuan") ?? "1";

    const uploadImage = async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "tracnghiem_upload");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload",
        { method: "POST", body: formData }
      );
      if (!response.ok) throw new Error("Upload hình thất bại");
      const data = await response.json();
      return data.secure_url;
    };

    const questionsToSave = [];

    for (let q of questions) {
      let updatedQ = { ...q };

      if (q.type === "image") {
        const uploadedOptions = await Promise.all(
          (q.options || []).map(async (opt) => (opt instanceof File ? await uploadImage(opt) : opt))
        );
        updatedQ.options = uploadedOptions;
        updatedQ.correct = updatedQ.correct || [];
      }

      if (q.type === "matching") updatedQ.correct = q.pairs.map((_, i) => i);
      if (q.type === "sort") updatedQ.correct = q.options.map((_, i) => i);
      if (q.type === "single") updatedQ.correct = q.correct?.length ? q.correct : [0];
      if (q.type === "multiple") updatedQ.correct = q.correct || [];
      if (q.type === "truefalse")
        updatedQ.correct = q.correct?.length === q.options?.length ? q.correct : q.options.map(() => "");

      questionsToSave.push(updatedQ);
    }

    localStorage.setItem("teacherQuiz", JSON.stringify(questionsToSave));
    localStorage.setItem(
      "teacherConfig",
      JSON.stringify({ selectedClass, selectedSubject, semester })
    );

    if (!selectedClass || !selectedSubject) {
      throw new Error("Vui lòng chọn lớp và môn trước khi lưu");
    }

    let collectionName, docId;

    if (examType === "ktdk") {
      collectionName = "TRACNGHIEM_BK";
      const semesterMap = { "Giữa kỳ I": "GKI", "Cuối kỳ I": "CKI", "Giữa kỳ II": "GKII", "Cả năm": "CN" };
      const shortSchoolYear = (year) => {
        const parts = year.split("-");
        return parts.length === 2 ? parts[0].slice(2) + "-" + parts[1].slice(2) : year;
      };
      docId = `quiz_${selectedClass}_${selectedSubject}_${semesterMap[semester]}_${shortSchoolYear(schoolYear)} (${examLetter})`;
    } else {
      collectionName = "BAITAP_TUAN";
      docId = `quiz_${selectedClass}_${selectedSubject}_${weekValue}`;
    }

    console.log("📁 Document path:", `${collectionName} / ${docId}`);
    const quizRef = doc(db, collectionName, docId);
    await setDoc(quizRef, {
      class: selectedClass,
      subject: selectedSubject,
      semester,
      schoolYear,
      examLetter,
      week: weekValue,
      examType,
      questions: questionsToSave,
    });

    // Cập nhật CONFIG
    try {
      const configRef = doc(db, "CONFIG", "config");
      await setDoc(
        configRef,
        { deTracNghiem: docId, tenDe: docId, deTuan: weekValue },
        { merge: true }
      );
    } catch (err) {
      console.error("❌ Lỗi khi ghi CONFIG:", err);
    }

    // Cập nhật context
    const newDoc = { id: docId, class: selectedClass, subject: selectedSubject, semester, week: weekValue, examType, questions: questionsToSave };
    setDeTuan(weekValue);
    localStorage.setItem("deTuan", weekValue);

    const existed = quizConfig.quizList?.some((d) => d.id === docId);
    if (!existed) updateQuizConfig({ quizList: [...(quizConfig.quizList || []), newDoc] });

    setSnackbar({ open: true, message: "✅ Đã lưu thành công!", severity: "success" });
    setIsEditingNewDoc(false);
  } catch (err) {
    console.error(err);
    setSnackbar({ open: true, message: `❌ Lỗi khi lưu đề: ${err.message}`, severity: "error" });
  }
};
