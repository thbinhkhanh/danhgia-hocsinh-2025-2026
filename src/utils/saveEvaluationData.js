import { doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { tinhVaLuuDiemDGTX } from "./tinhVaLuuDiemDGTX"; // 👈 Điều chỉnh lại đường dẫn import cho đúng với thư mục của thầy

export const handleSaveAll = async ({
  students,
  config,
  selectedClass,
  selectedSubject,
  namHocKey,
  setStudentData,
  setSnackbar,
}) => {
  if (!students || students.length === 0) return;

  const selectedSemester = config?.hocKy || "Giữa kỳ I";
  const selectedMon = selectedSubject || config?.mon || "Công nghệ";
  const isCongNghe = selectedMon === "Công nghệ";

  // 🔹 MAP HỌC KỲ
  const mapTerm = {
    "Giữa kỳ I": "GKI",
    "Cuối kỳ I": "CKI",
    "Giữa kỳ II": "GKII",
    "Cuối năm": "CN",
  };

  const termDoc = mapTerm[selectedSemester] || "CN";
  const isGiuaKy = selectedSemester.toLowerCase().includes("giữa");

  // 🔹 KHOẢNG TUẦN CHO GIỮA KỲ
  const weekRangeMap = {
    "Giữa kỳ I": { from: 1, to: 9 },
    "Giữa kỳ II": { from: 19, to: 27 },
  };
  const weekRange = weekRangeMap[selectedSemester] || { from: 1, to: 9 };

  // 🔹 KEY LỚP (chuẩn DATA)
  const classKey = String(selectedClass || "").replace(/\./g, "_");
  const namHoc = String(namHocKey || "").replace(/-/g, "_");

  const batch = writeBatch(db);

  students.forEach((s) => {
    const hsRef = doc(db, `DATA_${namHoc}`, classKey, "HOCSINH", s.maDinhDanh);

    const termUpdate = {};

    // ✅ Giáo viên
    if (s.dgtx_gv !== undefined) {
      termUpdate.dgtx_gv = s.dgtx_gv;
    }

    // ✅ Mức đạt (lấy từ dgtx hoặc dgtx_mucdat)
    if (s.dgtx !== undefined) {
      termUpdate.dgtx_mucdat = s.dgtx;
    }

    // ⛔ Không có gì thì không ghi
    if (Object.keys(termUpdate).length === 0) return;

    batch.set(
      hsRef,
      {
        [isCongNghe ? "CongNghe" : "TinHoc"]: {
          ktdk: {
            [termDoc]: termUpdate,
          },
        },
      },
      { merge: true }
    );
  });

  // ⚡ 1. BẬT THÔNG BÁO THÀNH CÔNG NGAY LẬP TỨC (Phản hồi siêu tốc cho người dùng)
  if (setSnackbar) {
    setSnackbar({
      open: true,
      message: "✅ Lưu dữ liệu thành công!",
      severity: "success",
    });
  }

  // ⚡ 2. XÓA CACHE NGAY LẬP TỨC
  const cacheKey = `${classKey}_${selectedMon}_${termDoc}`;
  if (setStudentData) {
    setStudentData((prev) => {
      const newCache = { ...prev };
      delete newCache[cacheKey];
      return newCache;
    });
  }

  // ⚡ 3. GHI FIRESTORE & TÍNH ĐIỂM ĐGTX CHẠY NGẦM (Background) PHÍA SAU
  (async () => {
    try {
      await batch.commit();

      if (isGiuaKy) {
        await tinhVaLuuDiemDGTX({
          namHocKey,
          selectedClass,
          selectedSubject: selectedMon,
          selectedSemester,
          weekFrom: weekRange.from,
          weekTo: weekRange.to,
        });
      }
      console.log("background sync completed successfully.");
    } catch (err) {
      console.error("❌ Lỗi ghi dữ liệu ngầm lên Firestore:", err);
      if (setSnackbar) {
        setSnackbar({
          open: true,
          message: `❌ Lỗi đồng bộ ngầm: ${err.message}`,
          severity: "error",
        });
      }
    }
  })();
};