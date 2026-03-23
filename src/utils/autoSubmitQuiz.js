import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

export const autoSubmitQuiz = async ({
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
    /*const unanswered = questions.filter(q => {
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
    }*/

    const unanswered = questions.filter(q => {
      const a = answers[q.id];
      if (q.type === "single") return a === undefined || a === null || a === "";
      if (q.type === "multiple") return !Array.isArray(a) || a.length === 0;
      if (q.type === "image") {
        const isSingle = Array.isArray(q.correct) && q.correct.length === 1;
        if (isSingle) return a === undefined || a === null || a.length === 0;
        return !Array.isArray(a) || a.length === 0;
      }
      if (q.type === "truefalse")
        return !Array.isArray(a) || a.length !== q.options.length;
      if (q.type === "fillblank")
        return !Array.isArray(a) || a.some(v => !v);
      // 👉 sort và matching không coi là unanswered
      return false;
    });

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
        const defaultOrder = q.options.map((_, idx) => idx);
        const userOrder =
          Array.isArray(rawAnswer) && rawAnswer.length > 0
            ? rawAnswer
            : defaultOrder;

        const userTexts = userOrder.map(idx => q.options[idx]);
        const correctTexts = Array.isArray(q.correctTexts) ? q.correctTexts : [];

        const isCorrect =
          userTexts.length === correctTexts.length &&
          userTexts.every((t, i) => t === correctTexts[i]);

        if (isCorrect) total += q.score ?? 1;
      } else if (q.type === "matching") {
        const correctArray = Array.isArray(q.correct) ? q.correct : [];

        const userArray =
          Array.isArray(rawAnswer) && rawAnswer.length > 0
            ? rawAnswer
            : correctArray; // 👈 KHÔNG tương tác → coi như đúng mặc định

        const isCorrect =
          userArray.length === correctArray.length &&
          userArray.every((val, i) => val === correctArray[i]);

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
          const isAllCorrect = correctAnswers.every((correct, i) => {
            if (!userAnswers[i] || !correct || typeof correct.text !== "string")
              return false;

            return (
              String(userAnswers[i]).trim().toLowerCase() ===
              correct.text.trim().toLowerCase()
            );
          });

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
      const classKey = studentClass.replace(".", "_");
      const subjectKey = config?.mon === "Công nghệ" ? "CongNghe" : "TinHoc";
      const termDoc = mapHocKyToDocKey(configData?.hocKy || "Giữa kỳ I");

      const hsRef = doc(db, "DATA", classKey, "HOCSINH", studentId);

      await updateDoc(hsRef, {
        [`${subjectKey}.ktdk.${termDoc}.lyThuyet`]: total,
        //[`${subjectKey}.ktdk.${termDoc}.tongCong`]: total,
        [`${subjectKey}.ktdk.${termDoc}.lyThuyetPhanTram`]: phanTram,
        [`${subjectKey}.ktdk.${termDoc}.ngayKiemTra`]: ngayKiemTra,          // thêm ngày
        [`${subjectKey}.ktdk.${termDoc}.thoiGianLamBai`]: durationStr,       // thêm thời gian làm bài
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
                    ngayKiemTra: ngayKiemTra,
                    thoiGianLamBai: durationStr,
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
    } else if (configData?.onTap === true) {
      // ❗ NHÁNH ÔN TẬP
      {/*const collectionRoot = "BINHKHANH_ONTAP";
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
      );*/}
    }

    // ❗ Nếu là bài tập tuần (DGTX)
    else {
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
    console.error("❌ Lỗi khi lưu điểm:", err);
  } finally {
    setSaving(false);
  }
};
