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
            let imageUrl = "";

            // Ưu tiên upload từ imageFile
            if (opt.imageFile) {
              imageUrl = await uploadImage(opt.imageFile);
            }
            // Nếu đã là Cloudinary URL thì giữ nguyên
            else if (isCloudinaryUrl(opt.image)) {
              imageUrl = opt.image;
            }
            // Nếu có preview base64 thì upload
            else if (typeof opt.imagePreview === "string" && opt.imagePreview.startsWith("data:")) {
              const res = await fetch(opt.imagePreview);
              const blob = await res.blob();
              const file = new File([blob], "option.png", { type: blob.type });
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

  // =========================
  // QUESTION IMAGE
  // =========================
  const normalizedQuestionImage = await normalizeImage(
    typeof q.questionImage === "string"
      ? q.questionImage
      : q.questionImage?.file || q.questionImage?.url || ""
  );

      let updatedQ = {
        ...q,

        // lưu field gốc
        questionImage: normalizedQuestionImage,

        // CHỈ thêm image cho type=image
        ...(q.type === "image"
          ? { image: normalizedQuestionImage }
          : {}),

        ...(q.type === "matching" && !("columnRatio" in q)
          ? { columnRatio: { left: 1, right: 1 } }
          : {}),
      };

      // =========================
      // IMAGE QUESTION
      // =========================

      updatedQ.options = await Promise.all(
        (q.options || []).map(async (opt) => {

          // =========================
          // STRING
          // =========================
          if (typeof opt === "string") {

            // URL cũ
            if (opt.startsWith("http")) {
              return opt;
            }

            // base64
            if (opt.startsWith("data:")) {
              const res = await fetch(opt);
              const blob = await res.blob();

              return await uploadImage(
                new File([blob], "option.png", {
                  type: blob.type,
                })
              );
            }

            return opt || "";
          }

          // =========================
          // OBJECT
          // =========================
          if (opt && typeof opt === "object") {

            // 1. file mới
            if (opt.file instanceof File) {
              return await uploadImage(opt.file);
            }

            // 2. image đã có URL
            if (
              typeof opt.image === "string" &&
              opt.image.startsWith("http")
            ) {
              return opt.image;
            }

            // 3. preview URL
            if (
              typeof opt.preview === "string" &&
              opt.preview.startsWith("http")
            ) {
              return opt.preview;
            }

            // 4. text chứa URL
            if (
              typeof opt.text === "string" &&
              opt.text.startsWith("http")
            ) {
              return opt.text;
            }

            // 5. base64 preview
            if (
              typeof opt.preview === "string" &&
              opt.preview.startsWith("data:")
            ) {
              const res = await fetch(opt.preview);
              const blob = await res.blob();

              return await uploadImage(
                new File([blob], "option.png", {
                  type: blob.type,
                })
              );
            }

            // 6. blob url => giữ nguyên image cũ nếu có
            if (
              typeof opt.preview === "string" &&
              opt.preview.startsWith("blob:")
            ) {
              return opt.image || "";
            }

            // 7. fallback giữ image cũ
            return opt.image || opt.text || "";
          }

          return "";
        })
      );

      // =========================
      // MATCHING (chỉ xử lý hình cột trái)
      // =========================
      if (q.type === "matching") {
        updatedQ.pairs = await Promise.all(
          (q.pairs || []).map(async (p) => {
            let leftImg = p?.leftImage?.file || p?.leftImage?.url || "";

            if (leftImg instanceof File) {
              leftImg = await uploadImage(leftImg);
            }

            if (typeof leftImg === "string" && leftImg.startsWith("data:")) {
              const res = await fetch(leftImg);
              const blob = await res.blob();
              leftImg = await uploadImage(
                new File([blob], "left.png", {
                  type: blob.type,
                })
              );
            }

            return {
              left: p.left || "",
              right: p.right || "",
              leftImage: {
                url: leftImg || "",
                name: p.leftImage?.name || "",
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
        updatedQ.options = await normalizeOptions(q.options);
      }

      // =========================
      // SINGLE
      // =========================
      if (q.type === "single") {
        updatedQ.options = await normalizeOptions(q.options);
        updatedQ.correct = q.correct?.length ? q.correct : [0];
      }

      // =========================
      // MULTIPLE
      // =========================
      if (q.type === "multiple") {
        updatedQ.options = await normalizeOptions(q.options);
        updatedQ.correct = q.correct || [];
      }

      // =========================
      // TRUEFALSE
      // =========================
      if (q.type === "truefalse") {
        updatedQ.options = await normalizeOptions(q.options);
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