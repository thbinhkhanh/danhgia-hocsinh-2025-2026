
import { doc, setDoc } from "firebase/firestore";

export const handleSubmitQuizPHT = async ({
  studentName,
  studentClass,
  studentId,
  studentInfo,
  setStudentResult,
  setSnackbar,
  setSaving,
  setSubmitted,
  questions,
  answers,
  startTime,
  durationStr,
  db,
  config,
  configData,
  selectedWeek,
  formatTime,
  capitalizeName,
  totalScore,
  maxTotalScore,
}) => {
  try {
    // Kiểm tra học sinh
    if (!studentName || !studentClass || !studentId) {
      setSnackbar?.({
        open: true,
        message: "Thiếu thông tin học sinh!",
        severity: "warning",
      });
      return;
    }

    // Kiểm tra dữ liệu câu hỏi
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Không có dữ liệu câu hỏi!");
    }

    // Kiểm tra điểm
    if (
      typeof totalScore !== "number" ||
      typeof maxTotalScore !== "number" ||
      maxTotalScore <= 0
    ) {
      throw new Error("Không xác định được điểm bài làm!");
    }

    setSaving?.(true);

    // Tính điểm thang 10 (làm tròn theo nấc 0.5)
    const diem10 =
      Math.ceil(
        ((totalScore / maxTotalScore) * 10) * 2 - 0.5
      ) / 2;

    // Điểm phần trăm (thang 100)
    const phanTram = Math.round(
      (totalScore / maxTotalScore) * 100
    );

    // Thời gian làm bài
    const thoiGianLamBai = durationStr || "00:00";

    // Ngày làm bài
    const ngayLam = new Date().toLocaleDateString("vi-VN");

    // Năm học
    const namHoc = config?.namHoc || configData?.namHoc;

    if (!namHoc) {
      throw new Error("Không xác định được năm học!");
    }

    const namHocKey = namHoc.replace(/-/g, "_");

    // Tuần học
    const weekNumber = Number(selectedWeek);

    if (!Number.isInteger(weekNumber) || weekNumber <= 0) {
      throw new Error("Không xác định được tuần học!");
    }

    // Chuẩn hóa lớp
    const classKey = studentClass.replace(/\./g, "_");

    // Xác định môn học
    const mon = config?.mon || configData?.mon;

    const monKey =
      mon === "Công nghệ"
        ? "CongNghe"
        : mon === "Tin học"
        ? "TinHoc"
        : null;

    if (!monKey) {
      throw new Error("Không xác định được môn học!");
    }

    // Đường dẫn document học sinh
    // DATA_2026_2027/{classKey}/HOCSINH/{studentId}
    const hsRef = doc(
      db,
      `DATA_${namHocKey}`,
      classKey,
      "HOCSINH",
      studentId
    );

    // Dữ liệu phiếu học tập
    // diem lưu theo thang phần trăm (0-100)
    const weekData = {
      studentId,
      tenHS: studentName,
      diem: phanTram,
      thoiGianLamBai,
      ngayLam,
    };

    // Cập nhật kết quả hiển thị Dialog
    setStudentResult?.({
      hoVaTen: capitalizeName
        ? capitalizeName(studentName)
        : studentName,
      lop: studentClass,
      diem: diem10,
      diemTN: phanTram,
    });

    // Lưu Firestore
    // Không ảnh hưởng dgtx, ktdk và dữ liệu các tuần khác
    await setDoc(
      hsRef,
      {
        [monKey]: {
          pht: {
            [`tuan_${weekNumber}`]: weekData,
          },
        },
      },
      { merge: true }
    );

    // Đánh dấu đã nộp bài
    setSubmitted?.(true);

    setSnackbar?.({
      open: true,
      message: "Đã lưu kết quả phiếu học tập thành công!",
      severity: "success",
    });

  } catch (err) {
    console.error("❌ Lỗi khi lưu phiếu học tập:", err);

    setSnackbar?.({
      open: true,
      message: err.message || "Không lưu được phiếu học tập!",
      severity: "error",
    });

  } finally {
    setSaving?.(false);
  }
};
