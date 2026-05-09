import { doc, setDoc, getDoc } from "firebase/firestore";

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
  lessonName, // ✅ đã truyền từ ngoài
}) => {
  try {
    const weekValue =
      typeof week !== "undefined" && week !== null
        ? week
        : quizConfig?.deTuan ?? localStorage.getItem("deTuan") ?? "1";

    const uploadImage = async (file) => {
      if (!(file instanceof File)) return file;
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

    const normalizeOptions = async (options) => {
      if (!options) return [];
      return Promise.all(
        options.map(async (opt) => {
          if (typeof opt === "string") {
            return { text: opt, formats: {}, image: "" };
          }
          if (opt && typeof opt === "object") {
            let imageUrl = opt.image;
            if (opt.image instanceof File) {
              imageUrl = await uploadImage(opt.image);
            }
            return {
              text: opt.text || "",
              formats: opt.formats || {},
              image: imageUrl || "",
            };
          }
          return { text: "", formats: {}, image: "" };
        })
      );
    };

    const questionsToSave = [];

    for (let q of questions) {
      let updatedQ = {
        ...q,
        ...(q.type === "matching" && !("columnRatio" in q)
          ? { columnRatio: { left: 1, right: 1 } }
          : {}),
      };

      updatedQ.options = await normalizeOptions(q.options);

      if (q.type === "image") {
        const uploadedOptions = await Promise.all(
          updatedQ.options.map(async (opt) =>
            opt.image instanceof File ? await uploadImage(opt.image) : opt.image
          )
        );
        updatedQ.options = uploadedOptions.map((url, i) => ({
          text: updatedQ.options[i].text || "",
          formats: updatedQ.options[i].formats || {},
          image: url,
        }));
        updatedQ.correct = updatedQ.correct || [];
      }

      if (q.type === "matching") updatedQ.correct = q.pairs.map((_, i) => i);
      if (q.type === "sort") updatedQ.correct = updatedQ.options.map((_, i) => i);
      if (q.type === "single") updatedQ.correct = q.correct?.length ? q.correct : [0];
      if (q.type === "multiple") updatedQ.correct = q.correct || [];
      if (q.type === "truefalse")
        updatedQ.correct =
          q.correct?.length === updatedQ.options?.length
            ? q.correct
            : updatedQ.options.map(() => "");

      questionsToSave.push(updatedQ);
    }

    localStorage.setItem("teacherQuiz", JSON.stringify(questionsToSave));
    localStorage.setItem(
      "teacherConfig",
      JSON.stringify({ selectedClass, selectedSubject, semester })
    );

    if (examType === "luyentap") {
      if (!selectedClass) {
        throw new Error("Vui lòng chọn lớp trước khi lưu");
      }
    } else {
      if (!selectedClass || !selectedSubject) {
        throw new Error("Vui lòng chọn lớp và môn trước khi lưu");
      }
    }

    let collectionName, docId;

    // ===== LUYỆN TẬP =====
    if (examType === "luyentap") {
      const classNumber = selectedClass.match(/\d+/)?.[0];

      if (!classNumber) {
        throw new Error("Không xác định được lớp cho luyện tập");
      }

      // ✅ Ưu tiên theo thứ tự
      let docName =
        lessonName || // 🥇 tên bài đang mở
        quizConfig?.deTracNghiem || // 🥈 context
        localStorage.getItem("deTracNghiemId"); // 🥉 local

      // 🔥 fallback nếu tạo mới chưa có tên
      if (!docName) {
        docName = `Bài_${Date.now()}`;
      }

      // 🔥 LẤY NĂM HỌC TỪ CONFIG
      let configYear = "";

      try {
        const configRef = doc(db, "CONFIG", "config");
        const snap = await getDoc(configRef);

        if (snap.exists()) {
          configYear = snap.data()?.namHoc || "";
        }
      } catch (err) {
        console.error("❌ Lỗi đọc CONFIG (namHoc):", err);
      }

      // 🔥 normalize để tránh lỗi dấu cách / dấu –
      const normalizeYear = (y = "") =>
        y.replace(/–/g, "-").replace(/\s/g, "").trim();

      const isOldYear = normalizeYear(configYear) === "2025-2026";

      collectionName = isOldYear
        ? `TRACNGHIEM${classNumber}`
        : `TRACNGHIEM${classNumber}_New`;

      docId = docName; // ✅ FIX CHUẨN
    }

    // ===== KTĐK =====
    else if (examType === "ktdk") {
      collectionName = "NGANHANG_DE";

      const semesterMap = {
        "Giữa kỳ I": "GKI",
        "Cuối kỳ I": "CKI",
        "Giữa kỳ II": "GKII",
        "Cả năm": "CN",
      };

      const shortSchoolYear = (year) => {
        const parts = year.split("-");
        return parts.length === 2
          ? parts[0].slice(2) + "-" + parts[1].slice(2)
          : year;
      };

      docId = `quiz_${selectedClass}_${selectedSubject}_${semesterMap[semester]}_${shortSchoolYear(
        schoolYear
      )} (${examLetter})`;
    }

    // ===== BÀI TẬP TUẦN =====
    else {
      collectionName = "BAITAP_TUAN";
      docId = `quiz_${selectedClass}_${selectedSubject}_${weekValue}`;
    }

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

    const newDoc = {
      id: docId,
      class: selectedClass,
      subject: selectedSubject,
      semester,
      week: weekValue,
      examType,
      questions: questionsToSave,
    };

    setDeTuan(weekValue);
    localStorage.setItem("deTuan", weekValue);

    const existed = quizConfig.quizList?.some((d) => d.id === docId);
    if (!existed)
      updateQuizConfig({ quizList: [...(quizConfig.quizList || []), newDoc] });

    setSnackbar({ open: true, message: "✅ Đã lưu thành công!", severity: "success" });
    setIsEditingNewDoc(false);
  } catch (err) {
    console.error(err);
    setSnackbar({
      open: true,
      message: `❌ Lỗi khi lưu đề: ${err.message}`,
      severity: "error",
    });
  }
};