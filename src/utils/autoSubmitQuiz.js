import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

export const autoSubmitQuiz = async ({
  studentName,
  studentClass,
  studentId,
  studentInfo,
  questions,
  answers,
  startTime,
  db,
  config,
  configData,
  selectedWeek,
  getQuestionMax,

  // --- các state setter từ component ---
  setSnackbar,
  setSaving,
  setSubmitted,
  setOpenResultDialog,
  setStudentResult,

  // --- hàm utils từ component chính ---
  capitalizeName,
  mapHocKyToDocKey,
  formatTime,
  exportQuizPDF,
}) => {
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

  try {
    setSaving(true);

    // --- Tính điểm thô ---
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
    const durationSec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const durationStr = formatTime(durationSec);

    // --- PDF cho KTDK ---
    const hocKi = window.currentHocKi || "GKI";
    const monHoc = window.currentMonHoc || "Không rõ";
    if (configData?.kiemTraDinhKi === true) {
      const quizTitle = `KTĐK${hocKi ? ` ${hocKi.toUpperCase()}` : ""}${monHoc ? ` - ${monHoc.toUpperCase()}` : ""}`;
      exportQuizPDF(studentInfo, studentInfo.className, questions, answers, total, durationStr, quizTitle);
    }

    const ngayKiemTra = new Date().toLocaleDateString("vi-VN");
    const maxScore = questions.reduce((sum, q) => sum + getQuestionMax(q), 0);
    const phanTram = Math.round((total / maxScore) * 100);

    const normalizeName = (name) =>
      name.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d").replace(/Đ/g, "D")
          .toLowerCase().trim()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");

    setStudentResult({
      hoVaTen: capitalizeName(studentName),
      lop: studentClass,
      diem: total,
      diemTN: phanTram,
    });
    setOpenResultDialog(true);

    // --- Lưu Firestore ---
    if (!configData) return;
    const hocKiKey = mapHocKyToDocKey(configData.hocKy || "UNKNOWN");
    const lop = studentClass;
    const docId = studentInfo.id;

    if (kiemTraDinhKi) {
      const classKey = studentClass.replace(".", "_");
      const subjectKey = config?.mon === "Công nghệ" ? "CongNghe" : "TinHoc";

      const termDoc = mapHocKyToDocKey(configData?.hocKy || "Giữa kỳ I");

      const hsRef = doc(
        db,
        "DATA",
        classKey,
        "HOCSINH",
        studentId
      );

      await updateDoc(hsRef, {
        [`${subjectKey}.ktdk.${termDoc}.lyThuyet`]: total,
        [`${subjectKey}.ktdk.${termDoc}.lyThuyetPhanTram`]: phanTram,
      }).catch(async (err) => {
        if (err.code === "not-found") {
          await setDoc(
            hsRef,
            {
              [subjectKey]: {
                ktdk: {
                  [termDoc]: {
                    lyThuyet: total,
                    lyThuyetPhanTram: phanTram,
                  },
                },
              },
            },
            { merge: true }
          );
        } else {
          throw err;
        }
      });
    } else {
        const classKey = (studentClass || "").replace(".", "_");
        const monKey = config?.mon === "Công nghệ" ? "CongNghe" : "TinHoc";

        const weekNumber = Number(selectedWeek);
        if (!weekNumber) return;

        const hsRef = doc(
          db,
          "DATA",
          classKey,
          "HOCSINH",
          studentId
        );

        const percent = phanTram;
        const resultText =
          percent >= 75
            ? "Hoàn thành tốt"
            : percent >= 50
            ? "Hoàn thành"
            : "Chưa hoàn thành";

        // ⚠️ phân biệt ĐÁNH GIÁ TUẦN hay BÀI TẬP TUẦN
        const isDanhGiaTuan = config?.danhGiaTuan === true;

        const weekData = isDanhGiaTuan
          ? {
              status: resultText,
            }
          : {
              TN_diem: percent,
              TN_status: resultText,
            };

        await setDoc(
          hsRef,
          {
            [monKey]: {
              dgtx: {
                [`tuan_${weekNumber}`]: weekData,
              },
            },
          },
          { merge: true }
        );
      }

  } catch (err) {
    console.error("❌ Lỗi khi auto submit:", err);
  } finally {
    setSaving(false);
  }
};
