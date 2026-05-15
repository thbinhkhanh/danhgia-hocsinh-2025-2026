import { doc, setDoc } from "firebase/firestore";

export const saveAllQuestions = async ({
  questions,
  db,
  selectedClass,
  semester,
  schoolYear,
  examLetter,
  quizConfig,
  updateQuizConfig,
  setQuizCache,
  setSnackbar,
  setIsEditingNewDoc,
}) => {
  try {
    if (!selectedClass || !semester || !schoolYear) {
      throw new Error("Vui lòng chọn đầy đủ lớp, học kỳ và năm học");
    }

    const SUBJECT = "Tin học";

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
  }

  // =========================
  // FINAL PUSH
  // =========================
  questionsToSave.push(updatedQ);
}

    /* =========================
       ID ĐỀ
    ========================== */
    const semesterMap = {
      "Giữa kỳ I": "GKI",
      "Cuối kỳ I": "CKI",
      "Giữa kỳ II": "GKII",
      "Cả năm": "CN",
    };

    const shortSchoolYear = (year) => {
      const [y1, y2] = year.split("-");
      return `${y1.slice(2)}-${y2.slice(2)}`;
    };

    const docId = `quiz_${selectedClass}_${SUBJECT}_${
      semesterMap[semester]
    }_${shortSchoolYear(schoolYear)}${
      examLetter ? ` (${examLetter})` : ""
    }`;

    /* =========================
       FIRESTORE
    ========================== */
    const quizRef = doc(db, "NGANHANG_DE", docId);

    await setDoc(quizRef, {
      class: selectedClass,
      subject: SUBJECT,
      semester,
      schoolYear,
      examLetter,
      questions: questionsToSave,
      updatedAt: Date.now(),
    });

    /* =========================
       CONFIG
    ========================== */
    await setDoc(
      doc(db, "CONFIG", "config"),
      { deTracNghiem: docId },
      { merge: true }
    );

    /* =========================
       CONTEXT
    ========================== */
    const newDoc = {
      id: docId,
      class: selectedClass,
      subject: SUBJECT,
      semester,
      schoolYear,
      examLetter,
    };

    const existed = quizConfig.quizList?.some((d) => d.id === docId);
    if (!existed) {
      updateQuizConfig({
        quizList: [...(quizConfig.quizList || []), newDoc],
      });
    }

    localStorage.setItem("teacherQuiz", JSON.stringify(questionsToSave));

    setSnackbar({
      open: true,
      message: "✅ Đã lưu đề thành công!",
      severity: "success",
    });

    setIsEditingNewDoc(false);
  } catch (err) {
    console.error("❌ Lỗi khi lưu đề:", err);
    setSnackbar({
      open: true,
      message: `❌ Lỗi khi lưu đề: ${err.message}`,
      severity: "error",
    });
  }
};