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
    let total = 0;
    questions.forEach(q => {
      const rawAnswer = answers[q.id];

      if (q.type === "single") {
        const ua = Number(rawAnswer);
        if (Array.isArray(q.correct) ? q.correct.includes(ua) : q.correct === ua)
          total += q.score ?? 1;

      } else if (q.type === "multiple" || q.type === "image") {
        const userSet = new Set(Array.isArray(rawAnswer) ? rawAnswer : []);
        const correctSet = new Set(Array.isArray(q.correct) ? q.correct : [q.correct]);
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
        const isCorrect =
          userArray.length === correctArray.length &&
          userArray.every((val, i) => val === correctArray[i]);
        if (isCorrect) total += q.score ?? 1;

      } else if (q.type === "truefalse") {
        const userArray = Array.isArray(rawAnswer) ? rawAnswer : [];
        const correctArray = Array.isArray(q.correct) ? q.correct : [];
        if (userArray.length === correctArray.length) {
          const isAllCorrect = userArray.every((val, i) => {
            const originalIdx = Array.isArray(q.initialOrder) ? q.initialOrder[i] : i;
            return val === correctArray[originalIdx];
          });
          if (isAllCorrect) total += q.score ?? 1;
        }

      } else if (q.type === "fillblank") {
        const userAnswers = Array.isArray(rawAnswer) ? rawAnswer : [];
        const correctAnswers = Array.isArray(q.options) ? q.options : [];
        if (correctAnswers.length > 0 && userAnswers.length === correctAnswers.length) {
          const isAllCorrect = correctAnswers.every((correct, i) =>
            userAnswers[i] && userAnswers[i].trim() === correct.trim()
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
      const collectionRoot = "BINHKHANH";
      const studentDocId = normalizeName(studentName);
      const docRef = doc(db, `${collectionRoot}/${configData.hocKy}/${lop}/${studentDocId}`);
      await setDoc(docRef, {
        hoVaTen: capitalizeName(studentName),
        lop,
        mon: monHoc,
        diem: total,
        ngayKiemTra,
        thoiGianLamBai: durationStr,
      }, { merge: true });

      const ktRef = doc(db, `KTDK/${hocKiKey}`);
      const ktSnap = await getDoc(ktRef);
      if (!ktSnap.exists()) await setDoc(ktRef, {});
      const ktData = ktSnap.exists() ? ktSnap.data() : {};
      const lopData = ktData[studentClass] || {};
      const studentData = lopData[docId] || {
        hoVaTen: capitalizeName(studentInfo.name),
        dgtx: "T",
        dgtx_gv: "",
        mucDat: "",
        nhanXet: "Em học tập nghiêm túc, thao tác nhanh, nắm vững kiến thức Tin học cơ bản.",
        thucHanh: null,
        tongCong: null,
        lyThuyet: null,
        lyThuyetPhanTram: null,
      };

      studentData.lyThuyet = total;
      studentData.lyThuyetPhanTram = phanTram;

      await setDoc(
        ktRef,
        { [studentClass]: { ...lopData, [docId]: studentData } },
        { merge: true }
      );
    } else {
      const classKey = config?.mon === "Công nghệ" ? `${studentClass}_CN` : studentClass;
      const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);
      const percent = phanTram;
      const resultText = percent >= 75 ? "Hoàn thành tốt" : percent >= 50 ? "Hoàn thành" : "Chưa hoàn thành";

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
        } else throw err;
      });
    }

  } catch (err) {
    console.error("❌ Lỗi khi auto submit:", err);
  } finally {
    setSaving(false);
  }
};
