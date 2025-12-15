import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
//import { exportQuizPDF } from "./utils/exportQuizPDF";

export const handleSubmitQuiz = async ({
  studentName,
  studentClass,
  studentId,
  studentInfo,
  studentResult,
  setStudentResult,
  setSnackbar,
  setSaving,
  setSubmitted,
  setOpenAlertDialog,
  setUnansweredQuestions,
  setOpenResultDialog,
  questions,
  answers,
  startTime,
  db,
  config,
  configData,
  selectedWeek,
  getQuestionMax,
  capitalizeName,
  mapHocKyToDocKey,
  formatTime,
  exportQuizPDF,
}) => {
  try {
    if (studentName === "Test") {
      setSnackbar({
        open: true,
        message: "Đây là trang test",
        severity: "info",
      });
      return;
    }

    const kiemTraDinhKi = config?.kiemTraDinhKi === true;
    const hocKiConfig = configData.hocKy || "UNKNOWN";
    const hocKiKey = mapHocKyToDocKey(hocKiConfig);

    if (!studentClass || !studentName) {
      setSnackbar({
        open: true,
        message: "Thiếu thông tin học sinh",
        severity: "info",
      });
      return;
    }

    // --- Kiểm tra câu chưa trả lời ---
    const unanswered = questions.filter(q => {
      const userAnswer = answers[q.id];
      if (q.type === "single") {
        return userAnswer === undefined || userAnswer === null || userAnswer === "";
      }
      if (q.type === "multiple" || q.type === "image") {
        return !Array.isArray(userAnswer) || userAnswer.length === 0;
      }
      if (q.type === "truefalse") {
        return !Array.isArray(userAnswer) || userAnswer.length !== q.options.length;
      }
      return false;
    });

    if (unanswered.length > 0) {
      setUnansweredQuestions(
        unanswered.map(q => questions.findIndex(item => item.id === q.id) + 1)
      );
      setOpenAlertDialog(true);
      return;
    }

    // --- Tính điểm ---
    setSaving(true);

    let total = 0;
    questions.forEach(q => {
      const rawAnswer = answers[q.id];

      if (q.type === "single") {
        const ua = Number(rawAnswer);
        if (Array.isArray(q.correct) ? q.correct.includes(ua) : q.correct === ua)
          total += q.score ?? 1;

      } else if (q.type === "multiple" || q.type === "image") {
        const userSet = new Set(Array.isArray(rawAnswer) ? rawAnswer : []);
        const correctSet = new Set(
          Array.isArray(q.correct) ? q.correct : [q.correct]
        );
        if (
          userSet.size === correctSet.size &&
          [...correctSet].every(x => userSet.has(x))
        )
          total += q.score ?? 1;

      } else if (q.type === "sort") {
        const userOrder = Array.isArray(rawAnswer) ? rawAnswer : [];
        const userTexts = userOrder.map(idx => q.options[idx]);
        const correctTexts = Array.isArray(q.correctTexts) ? q.correctTexts : [];

        const isCorrect =
          userTexts.length === correctTexts.length &&
          userTexts.every((t, i) => t === correctTexts[i]);

        if (isCorrect) total += q.score ?? 1;

      } else if (q.type === "matching") {
        const userArray = Array.isArray(rawAnswer) ? rawAnswer : [];
        const correctArray = Array.isArray(q.correct) ? q.correct : [];

        let isCorrect = false;

        if (userArray.length > 0) {
          // Người dùng có sắp xếp → so sánh trực tiếp
          isCorrect =
            userArray.length === correctArray.length &&
            userArray.every((val, i) => val === correctArray[i]);
        }
        // Nếu userArray.length === 0 → không tương tác → không cộng điểm

        if (isCorrect) total += q.score ?? 1;
      } else if (q.type === "truefalse") {
        const userArray = Array.isArray(rawAnswer) ? rawAnswer : [];
        const correctArray = Array.isArray(q.correct) ? q.correct : [];

        if (userArray.length === correctArray.length) {
          const isAllCorrect = userArray.every((val, i) => {
            const originalIdx = Array.isArray(q.initialOrder)
              ? q.initialOrder[i]
              : i;
            return val === correctArray[originalIdx];
          });
          if (isAllCorrect) total += q.score ?? 1;
        }

      } else if (q.type === "fillblank") {
        const userAnswers = Array.isArray(rawAnswer) ? rawAnswer : [];
        const correctAnswers = Array.isArray(q.options) ? q.options : [];

        if (userAnswers.length === correctAnswers.length) {
          const isAllCorrect = correctAnswers.every(
            (correct, i) =>
              userAnswers[i] &&
              userAnswers[i].trim() === correct.trim()
          );
          if (isAllCorrect) total += q.score ?? 1;
        }
      }
    });

    setSubmitted(true);

    // --- Tính thời gian ---
    const durationSec = startTime
      ? Math.floor((Date.now() - startTime) / 1000)
      : 0;
    const durationStr = formatTime(durationSec);

    // --- PDF cho KTDK ---
    const hocKi = window.currentHocKi || "GKI";
    const monHoc = window.currentMonHoc || "Không rõ";

    if (configData?.kiemTraDinhKi === true) {
      const quizTitle = `KTĐK ${hocKi.toUpperCase()} - ${monHoc.toUpperCase()}`;
      exportQuizPDF(
        studentInfo,
        studentInfo.className,
        questions,
        answers,
        total,
        durationStr,
        quizTitle
      );
    }

    const ngayKiemTra = new Date().toLocaleDateString("vi-VN");

    const maxScore = questions.reduce((sum, q) => sum + getQuestionMax(q), 0);
    const phanTram = Math.round((total / maxScore) * 100);

    const normalizeName = name =>
      name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

    // --- Hiển thị kết quả ---
    setStudentResult({
      hoVaTen: capitalizeName(studentName),
      lop: studentClass,
      diem: total,
      diemTN: phanTram,
    });
    setOpenResultDialog(true);

    // ------------------- FIRESTORE -------------------

    // ❗ Nếu là kiểm tra định kỳ
    if (kiemTraDinhKi) {
      const collectionRoot = "BINHKHANH";
      const studentDocId = normalizeName(studentName);

      // Lưu kết quả vào BINHKHANH
      const docRef = doc(
        db,
        `${collectionRoot}/${configData.hocKy}/${studentClass}/${studentDocId}`
      );
      await setDoc(
        docRef,
        {
          hoVaTen: capitalizeName(studentName),
          lop: studentClass,
          mon: monHoc,
          diem: total,
          ngayKiemTra,
          thoiGianLamBai: durationStr,
        },
        { merge: true }
      );

      // Lưu điểm vào KTDK
      const ktRef = doc(db, `KTDK/${hocKiKey}`);
      const ktSnap = await getDoc(ktRef);
      if (!ktSnap.exists()) {
        await setDoc(ktRef, {});
      }

      const ktData = ktSnap.exists() ? ktSnap.data() : {};
      const lopData = ktData[studentClass] || {};

      const studentData = lopData[studentId] || {
        hoVaTen: capitalizeName(studentInfo.name),
        dgtx: "T",
        dgtx_gv: "",
        mucDat: "",
        nhanXet:
          "Em học tập nghiêm túc, thao tác nhanh, nắm vững kiến thức Tin học cơ bản.",
        thucHanh: null,
        tongCong: null,
        lyThuyet: null,
        lyThuyetPhanTram: null,
      };

      studentData.lyThuyet = total;
      studentData.lyThuyetPhanTram = phanTram;

      await setDoc(
        ktRef,
        {
          [studentClass]: {
            ...lopData,
            [studentId]: studentData,
          },
        },
        { merge: true }
      );
    } else if (configData?.onTap === true) {
      // ❗ NHÁNH ÔN TẬP
      const collectionRoot = "BINHKHANH_ONTAP";
      const studentDocId = normalizeName(studentName);

      const docRef = doc(
        db,
        `${collectionRoot}/${configData.hocKy}/${studentClass}/${studentDocId}`
      );
      await setDoc(
        docRef,
        {
          hoVaTen: capitalizeName(studentName),
          lop: studentClass,
          mon: monHoc,
          diem: total,
          phanTram,
          ngayLam: new Date().toLocaleDateString("vi-VN"),
          thoiGianLamBai: durationStr,
        },
        { merge: true }
      );
    }

    // ❗ Nếu là bài tập tuần (DGTX)
    else {
      const classKey =
        config?.mon === "Công nghệ" ? `${studentClass}_CN` : studentClass;
      const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

      const percent = phanTram;
      const resultText =
        percent >= 75
          ? "Hoàn thành tốt"
          : percent >= 50
          ? "Hoàn thành"
          : "Chưa hoàn thành";

      await updateDoc(tuanRef, {
        [`${studentId}.hoVaTen`]: studentName,
        [`${studentId}.diemTracNghiem`]: resultText,
        [`${studentId}.diemTN`]: percent,
      }).catch(async err => {
        if (err.code === "not-found") {
          await setDoc(tuanRef, {
            [studentId]: {
              hoVaTen: studentName,
              diemTracNghiem: resultText,
              diemTN: percent,
            },
          });
        } else {
          throw err;
        }
      });
    }
  } catch (err) {
    console.error("❌ Lỗi khi lưu điểm:", err);
  } finally {
    setSaving(false);
  }
};
