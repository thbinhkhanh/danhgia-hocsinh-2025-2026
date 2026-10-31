import { writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase"; // Điều chỉnh đường dẫn import firebase cho đúng với dự án của bạn

// Hàm trợ giúp chuyển đổi termDoc
export const getTermDoc = (hocKy) => {
  switch (hocKy) {
    case "Giữa kỳ I": return "GKI";
    case "Cuối kỳ I": return "CKI";
    case "Giữa kỳ II": return "GKII";
    default: return "CN";
  }
};

export const handleSaveAll = async ({
  students,
  config,
  selectedClass,
  namHocKey,
  setStudentData,
  setStudentsForClass,
  setSnackbar,
}) => {
  if (!students || students.length === 0) return;

  const selectedSemester = config?.hocKy || "Giữa kỳ I";
  const selectedMon = config?.mon || "Công nghệ";
  const isCongNghe = selectedMon === "Công nghệ";
  const termDoc = getTermDoc(selectedSemester);

  const classKey = (selectedClass || "").replace(".", "_");
  const batch = writeBatch(db);

  students.forEach((s) => {
    const hsRef = doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", s.maDinhDanh);

    const ktdkData = {
      [termDoc]: {
        dgtx_gv: s.dgtx_mucdat || "",
        dgtx_mucdat: s.dgtx_mucdat || "",
        dgtx_nx: "",

        lyThuyet:
          s.lyThuyet !== "" &&
          s.lyThuyet !== null &&
          s.lyThuyet !== undefined
            ? Number(s.lyThuyet)
            : null,

        thucHanh: isCongNghe
          ? s.thucHanh ?? ""
          : s.thucHanh === "" || s.thucHanh === null || s.thucHanh === undefined
          ? null
          : Number(s.thucHanh),

        tongCong:
          s.tongCong !== null && s.tongCong !== undefined
            ? Number(s.tongCong)
            : null,

        mucDat: s.mucDat || "",
        nhanXet: s.nhanXet || "",
      },
    };

    batch.set(
      hsRef,
      {
        hoVaTen: s.hoVaTen || "",
        stt: s.stt || null,
        [isCongNghe ? "CongNghe" : "TinHoc"]: {
          ktdk: ktdkData,
        },
      },
      { merge: true }
    );
  });

  try {
    await batch.commit();

    if (typeof setStudentData === "function") {
      setStudentData((prev) => ({ ...prev, [classKey]: students }));
    }
    if (typeof setStudentsForClass === "function") {
      setStudentsForClass(termDoc, classKey, students);
    }

    setSnackbar({
      open: true,
      message: "✅ Lưu thành công!",
      severity: "success",
    });
  } catch (err) {
    console.error("❌ Lỗi lưu dữ liệu học sinh:", err);
    setSnackbar({
      open: true,
      message: "❌ Lỗi khi lưu dữ liệu học sinh!",
      severity: "error",
    });
  }
};

export const handleSaveOne = async ({
  student,
  config,
  selectedClass,
  namHocKey,
  setSnackbar,
}) => {
  if (!student) return;

  const selectedSemester = config?.hocKy || "Giữa kỳ I";
  const selectedMon = config?.mon || "Công nghệ";
  const isCongNghe = selectedMon === "Công nghệ";
  const termDoc = getTermDoc(selectedSemester);

  const classKey = (selectedClass || "").replace(".", "_");
  const batch = writeBatch(db);
  const hsRef = doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", student.maDinhDanh);

  const toNumberOrNull = (val) =>
    val === "" || val === null || val === undefined
      ? null
      : Number(val);

  const ktdkData = {
    [termDoc]: {
      dgtx_gv: student.dgtx_mucdat ?? "",
      dgtx_mucdat: student.dgtx_mucdat ?? "",
      dgtx_nx: "",

      lyThuyet: toNumberOrNull(student.lyThuyet),

      thucHanh: isCongNghe
        ? (student.thucHanh ?? "")
        : toNumberOrNull(student.thucHanh),

      tongCong: toNumberOrNull(student.tongCong),

      mucDat: student.mucDat ?? "",
      nhanXet: student.nhanXet ?? "",
    },
  };

  batch.set(
    hsRef,
    {
      hoVaTen: student.hoVaTen || "",
      stt: student.stt ?? null,
      [isCongNghe ? "CongNghe" : "TinHoc"]: {
        ktdk: ktdkData,
      },
    },
    { merge: true }
  );

  try {
    await batch.commit();

    setSnackbar({
      open: true,
      message: "✅ Cập nhật thành công!",
      severity: "success",
    });
  } catch (err) {
    console.error("❌ Lỗi lưu dữ liệu học sinh:", err);
    setSnackbar({
      open: true,
      message: "❌ Lỗi khi lưu dữ liệu học sinh!",
      severity: "error",
    });
  }
};