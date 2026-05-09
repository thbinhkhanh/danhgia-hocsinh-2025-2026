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
      formData.append("folder", "questions"); // optional nhưng nên giữ

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

    const isCloudinaryUrl = (url = "") =>
      typeof url === "string" && url.includes("res.cloudinary.com");
    
    const normalizeImage = async (img) => {
      if (!img) return "";

      if (isCloudinaryUrl(img)) return img;

      if (img instanceof File) {
        return await uploadImage(img);
      }

      if (typeof img === "string" && img.startsWith("data:")) {
        const res = await fetch(img);
        const blob = await res.blob();
        const file = new File([blob], "image.png", {
          type: blob.type,
        });

        return await uploadImage(file);
      }

      return img;
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

            // =========================
            // 1. ĐÃ LÀ CLOUDINARY → GIỮ NGUYÊN
            // =========================
            if (isCloudinaryUrl(imageUrl)) {
              return {
                text: opt.text || "",
                formats: opt.formats || {},
                image: imageUrl,
              };
            }

            // =========================
            // 2. FILE → UPLOAD CLOUDINARY
            // =========================
            if (imageUrl instanceof File) {
              imageUrl = await uploadImage(imageUrl);
            }

            // =========================
            // 3. BASE64 (data:) → UPLOAD CLOUDINARY
            // =========================
            if (
              typeof imageUrl === "string" &&
              imageUrl.startsWith("data:")
            ) {
              const res = await fetch(imageUrl);
              const blob = await res.blob();
              const file = new File([blob], "image.png", {
                type: blob.type,
              });

              imageUrl = await uploadImage(file);
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

    const normalizeMatchingPairs = async (pairs) => {
      if (!pairs) return [];

      return Promise.all(
        pairs.map(async (p) => {
          let leftImage = p.leftImage;

          // không có ảnh
          if (!leftImage) {
            return p;
          }

          let url = leftImage.url;

          // đã là cloudinary → giữ nguyên
          if (isCloudinaryUrl(url)) {
            return p;
          }

          // File
          if (url instanceof File) {
            url = await uploadImage(url);
          }

          // base64
          if (typeof url === "string" && url.startsWith("data:")) {
            const res = await fetch(url);
            const blob = await res.blob();
            const file = new File([blob], "image.png", { type: blob.type });
            url = await uploadImage(file);
          }

          return {
            ...p,
            leftImage: {
              ...leftImage,
              url,
            },
          };
        })
      );
    };

    const questionsToSave = [];

    for (let q of questions) {
      let updatedQ = {
        ...q,
        questionImage: await normalizeImage(q.questionImage), // 🔥 THÊM DÒNG NÀY
        ...(q.type === "matching" && !("columnRatio" in q)
          ? { columnRatio: { left: 1, right: 1 } }
          : {}),
      };

  // =========================
  // IMAGE QUESTION
  // =========================
  if (q.type === "image") {
    const uploadedOptions = await Promise.all(
      (q.options || []).map(async (opt) => {
        let img = opt.image;

        if (isCloudinaryUrl(img)) return img;

        if (img instanceof File) {
          img = await uploadImage(img);
        }

        if (typeof img === "string" && img.startsWith("data:")) {
          const res = await fetch(img);
          const blob = await res.blob();
          const file = new File([blob], "image.png", {
            type: blob.type,
          });
          img = await uploadImage(file);
        }

        return img; // ✅ CHỈ RETURN URL
      })
    );

    updatedQ.options = uploadedOptions; // ✅ ARRAY STRING
    updatedQ.correct = updatedQ.correct || [];
  }

  // =========================
  // MATCHING
  // =========================
  if (q.type === "matching") {
    updatedQ.pairs = await Promise.all(
      (q.pairs || []).map(async (p) => {
        let img = p?.leftImage?.url;

        if (!img) {
          return {
            ...p,
            leftImage: p.leftImage || { url: "" },
          };
        }

        // =========================
        // CLOUDINARY → GIỮ NGUYÊN
        // =========================
        if (isCloudinaryUrl(img)) {
          return {
            ...p,
            leftImage: {
              ...p.leftImage,
              url: img,
            },
          };
        }

        // =========================
        // FILE → UPLOAD
        // =========================
        if (img instanceof File) {
          img = await uploadImage(img);
        }

        // =========================
        // BASE64 → UPLOAD
        // =========================
        if (typeof img === "string" && img.startsWith("data:")) {
          const res = await fetch(img);
          const blob = await res.blob();
          const file = new File([blob], "image.png", {
            type: blob.type,
          });
          img = await uploadImage(file);
        }

        return {
          ...p,
          leftImage: {
            ...p.leftImage,
            url: img,
          },
        };
      })
    );

    updatedQ.correct = updatedQ.pairs.map((_, i) => i);
  }

  // =========================
  // SORT
  // =========================
  if (q.type === "sort") {
    updatedQ.correct = q.options.map((_, i) => i);
    updatedQ.options = q.options;
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
        : q.options.map(() => "");
  }

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