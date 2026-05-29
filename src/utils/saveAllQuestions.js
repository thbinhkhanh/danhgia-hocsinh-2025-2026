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

    /* =========================
       UPLOAD IMAGE (THEO HÀM MẪU 1)
    ========================== */
    const uploadImage = async (file) => {
      if (!(file instanceof File)) return file;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "tracnghiem_upload");
      formData.append("folder", "questions");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dxzpfljv4/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error("Upload hình thất bại: " + err);
      }

      const data = await response.json();
      return data.secure_url;
    };

    const isHttp = (v) =>
      typeof v === "string" && v.startsWith("http");

    const toFileFromBase64 = async (dataUrl, name = "image.png") => {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return new File([blob], name, { type: blob.type });
    };

    /* =========================
       NORMALIZE IMAGE (MẪU 1)
    ========================== */
    const normalizeImage = async (img) => {
      if (!img) return "";

      if (img instanceof File) return await uploadImage(img);

      if (isHttp(img)) return img;

      if (typeof img === "string" && img.startsWith("data:")) {
        const file = await toFileFromBase64(img);
        return await uploadImage(file);
      }

      return img;
    };

    /* =========================
       NORMALIZE OPTIONS (MẪU 1)
    ========================== */
    const normalizeOptions = async (options = []) => {
      return Promise.all(
        options.map(async (opt) => {
          if (!opt) {
            return { text: "", image: "", formats: {} };
          }

          if (typeof opt === "string") {
            return { text: opt, image: "", formats: {} };
          }

          let text = opt.text || "";
          let image = opt.image || opt.imagePreview || "";

          if (opt.file instanceof File) {
            const url = await uploadImage(opt.file);
            return { text: url, image: "", formats: opt.formats || {} };
          }

          if (typeof image === "string" && image.startsWith("data:")) {
            image = await uploadImage(await toFileFromBase64(image));
          }

          return {
            text,
            image,
            formats: opt.formats || {},
          };
        })
      );
    };

    /* =========================
       NORMALIZE MATCHING (MẪU 1)
    ========================== */
    const normalizeMatching = async (pairs = []) => {
      return Promise.all(
        pairs.map(async (p) => {
          const url = await normalizeImage(
            p?.leftImage?.file ||
            p?.leftImage?.url ||
            p?.leftImage ||
            ""
          );

          return {
            left: p.left || "",
            right: p.right || "",
            leftImage: {
              url,
              name: p.leftImage?.name || "",
            },
          };
        })
      );
    };

    const questionsToSave = [];

/* =========================
   MAIN LOOP (FIXED = GIỐNG HÀM GỐC)
========================= */
for (let q of questions) {
  let updatedQ = {
    ...q,
    ...(q.type === "matching" && !("columnRatio" in q)
      ? { columnRatio: { left: 1, right: 1 } }
      : {}),
  };

  // =========================
  // IMAGE QUESTION
  // =========================
  const questionImage = await normalizeImage(
    q.questionImage?.file ||
    q.questionImage?.url ||
    q.questionImage ||
    ""
  );

  updatedQ.questionImage = questionImage;

  if (q.type === "image") {
    updatedQ.image = questionImage;
  }

  // =========================
  // OPTIONS
  // =========================
  if (Array.isArray(q.options)) {
    updatedQ.options = await normalizeOptions(q.options);
  }

  // =========================
  // MATCHING (GIỐNG HÀM GỐC)
  // =========================
  if (q.type === "matching") {
    updatedQ.pairs = await Promise.all(
      (q.pairs || []).map(async (p) => {
        let leftImg =
          p?.leftImage?.file ||
          p?.leftImage?.url ||
          "";

        if (leftImg instanceof File) {
          leftImg = await uploadImage(leftImg);
        }

        if (
          typeof leftImg === "string" &&
          leftImg.startsWith("data:")
        ) {
          const res = await fetch(leftImg);
          const blob = await res.blob();
          leftImg = await uploadImage(
            new File([blob], "left.png", { type: blob.type })
          );
        }

        return {
          left: p.left || "",
          right: p.right || "",
          leftImage: leftImg
            ? {
                url: leftImg,
                name: p.leftImage?.name || "image.png",
              }
            : {
                url: "",
                name: "",
              },
        };
      })
    );

    updatedQ.correct = updatedQ.pairs.map((_, i) => i);
    updatedQ.options = [];

    updatedQ.type = "matching";
    updatedQ.columnRatio = q.columnRatio || { left: 1, right: 3 };
    updatedQ.sortType = q.sortType || "fixed";

    if (q.id) updatedQ.id = q.id;
  }

  // =========================
  // SORT
  // =========================
  if (q.type === "sort") {
    updatedQ.options = (updatedQ.options || []).map((opt) => ({
      text: (opt.text || "")
        .replace(/\s*\d+\s*<\/p>$/i, "</p>")
        .trim(),
      image: opt.image || "",
    }));

    updatedQ.correct = updatedQ.options.map((_, i) => i);

    delete updatedQ.correctTexts;
    delete updatedQ.initialSortOrder;
  }

  // =========================
  // SINGLE
  // =========================
  if (q.type === "single") {
    updatedQ.correct = q.correct?.length ? q.correct : [0];
  }

  // =========================
  // MULTIPLE
  // =========================
  if (q.type === "multiple") {
    updatedQ.correct = q.correct || [];
  }

  // =========================
  // TRUEFALSE
  // =========================
  if (q.type === "truefalse") {
    updatedQ.correct =
      q.correct?.length === q.options?.length
        ? q.correct
        : (q.options || []).map(() => "");
  }

  // =========================
  // FILL BLANK (GIỮ NGUYÊN LOGIC GỐC, KHÔNG OVERWRITE FULL OBJECT)
  // =========================
  if (q.type === "fillblank") {
    updatedQ = {
      ...updatedQ,

      id: q.id || `q_${Date.now()}`,
      type: "fillblank",

      option: q.option || "",
      question: q.question || "",

      image: updatedQ.questionImage || "",

      answers: [
        {
          option: q.option || "",
          correct: q.correct || [],
        },
      ],

      options: Array.isArray(q.options)
        ? q.options.map((opt) => ({
            text: opt.text || "",
            image: opt.image || "",
            formats: opt.formats || {},
          }))
        : [],

      correct: q.correct || [],
      score: q.score || 1,
    };
    
    delete updatedQ.image;    //khắc phục lỗi 2 hình trong Question Image
  }

  // =========================
  // FINAL PUSH
  // =========================
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

    // ===== ÔN TẬP (CHỈ THÊM MỚI) =====
    else if (examType === "ontap") {
      collectionName = "DE_ONTAP";

      docId =
        lessonName ||
        quizConfig?.deOntap ||
        localStorage.getItem("deTracNghiemId") || // 👈 THÊM DÒNG NÀY
        `ONTAP_${Date.now()}`;
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