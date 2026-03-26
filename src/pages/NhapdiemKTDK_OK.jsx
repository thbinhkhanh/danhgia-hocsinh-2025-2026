import React, { useState, useEffect, useContext } from "react";

import {
  Box,
  Card,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  TextField,
  useMediaQuery,
  InputLabel,
  Snackbar,
  Alert,
} from "@mui/material";

import { db } from "../firebase";
import { doc, getDoc, getDocs, collection, setDoc, writeBatch } from "firebase/firestore";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { StudentKTDKContext } from "../context/StudentKTDKContext";

import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import CapNhatLyThuyetDialog from "../dialog/CapNhatLyThuyetDialog";
import EditIcon from "@mui/icons-material/Edit";

import { exportKTDK } from "../utils/exportKTDK";
import { printKTDK } from "../utils/printKTDK";
//import { nhanXetTinHocCuoiKy, nhanXetCongNgheCuoiKy } from '../utils/nhanXet.js';
import {
  nhanXetTinHocCuoiKy,
  nhanXetTinHocGiuaKy,
  nhanXetCongNgheCuoiKy,
  nhanXetCongNgheGiuaKy
} from '../utils/nhanXet.js';

export default function NhapdiemKTDK() {
  const { classData, setClassData, studentData, setStudentData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);
  const { getStudentsForClass, setStudentsForClass } = useContext(StudentKTDKContext);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [selectedSubject, setSelectedSubject] = useState(() => config?.mon || "Tin học");

  const [openLTDialog, setOpenLTDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [ltValue, setLtValue] = useState("");
  const [fillThucHanh, setFillThucHanh] = useState("");
  const [originalStudents, setOriginalStudents] = useState([]);

  useEffect(() => {
    if (config?.mon && config.mon !== selectedSubject) {
      setSelectedSubject(config.mon);
    }
  }, [config?.mon]);

  useEffect(() => {
    if (config?.lop) setSelectedClass(config.lop);
  }, [config?.lop]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        if (classData && classData.length > 0) {
          setClasses(classData);
          setSelectedClass((prev) => prev || classData[0]);
          return;
        }

        const snapshot = await getDocs(collection(db, "DANHSACH"));
        const classList = snapshot.docs.map((doc) => doc.id);
        setClassData(classList);
        setClasses(classList);
        if (classList.length > 0) setSelectedClass(classList[0]);
      } catch (err) {
        console.error("Lỗi lấy danh sách lớp:", err);
        setClasses([]);
        setClassData([]);
      }
    };

    fetchClasses();
  }, [classData, setClassData]);

  /*const getNhanXetMuc = (subject) => {
    if (subject === "Công nghệ") return nhanXetCongNgheCuoiKy;
    return nhanXetTinHocCuoiKy; // mặc định Tin học
  };*/

  // ------------------------
// 🔹 HÀM SINH NHẬN XÉT TỰ ĐỘNG
// ------------------------
const generateNhanXet = (student, subject, tongCong = null, mucDat = null) => {
  // Xác định mức đạt nếu chưa có
  let computedMucDat = mucDat;
  if (!computedMucDat && subject === "Tin học" && tongCong != null) {
    computedMucDat = tongCong >= 9 ? "T" : tongCong >= 5 ? "H" : "C";
  } else if (!computedMucDat && subject === "Công nghệ" && student.thucHanh) {
    const lt = parseFloat(student.lyThuyet);
    const ltLoai = !isNaN(lt) ? (lt >= 9 ? "T" : lt >= 5 ? "H" : "C") : "C";
    computedMucDat = ltLoai; // ưu tiên LT
  }

  if (!computedMucDat) return student.nhanXet || "";

  // Chuyển mức đạt sang loại nhận xét
  const getLoaiMucDat = (xepLoai) =>
    xepLoai === "T"
      ? "tot"
      : xepLoai === "H"
      ? "kha"
      : xepLoai === "C"
      ? "trungbinh"
      : "yeu";

  const loai = getLoaiMucDat(computedMucDat);

  // Chọn bộ nhận xét theo môn và theo kỳ
  let source;
  const isCuoiKy = tongCong > 0;
  if (subject === "Công nghệ") {
    source = isCuoiKy ? nhanXetCongNgheCuoiKy : nhanXetCongNgheGiuaKy;
  } else {
    source = isCuoiKy ? nhanXetTinHocCuoiKy : nhanXetTinHocGiuaKy;
  }

  const pickRandom = (arr) =>
    arr.length ? arr[Math.floor(Math.random() * arr.length)] : "";

  if (subject === "Công nghệ") {
    if (isCuoiKy) {
      // Cuối kỳ: vế 1 theo LT, vế 2 theo TH
      const lt = parseFloat(student.lyThuyet);
      const th = student.thucHanh;

      const loaiLT =
        !isNaN(lt) ? (lt >= 9 ? "tot" : lt >= 7 ? "kha" : lt >= 5 ? "trungbinh" : "yeu") : loai;
      const loaiTH =
        th === "T" ? "tot" : th === "H" ? "kha" : th === "C" ? "yeu" : loai;

      const arrLT = source[loaiLT]?.lyThuyet || [];
      const arrTH = source[loaiTH]?.thucHanh || [];

      let nxLT = pickRandom(arrLT);
      let nxTH = pickRandom(arrTH);

      if (!nxLT && nxTH) nxLT = nxTH;
      if (!nxTH && nxLT) nxTH = nxLT;

      return nxLT && nxTH ? `${nxLT}; ${nxTH}` : nxLT || nxTH || "";
    } else {
      // Giữa kỳ: chỉ cần một câu theo mức đạt
      const arr = source[loai] || [];
      return pickRandom(arr);
    }
  }

  if (isCuoiKy) {
    // Tin học cuối kỳ: có lyThuyet và thucHanh
    const arrLT = source[loai]?.lyThuyet || [];
    const arrTH = source[loai]?.thucHanh || [];
    let nxLT = pickRandom(arrLT);
    let nxTH = pickRandom(arrTH);

    if (!nxLT && nxTH) nxLT = nxTH;
    if (!nxTH && nxLT) nxTH = nxLT;

    return nxLT && nxTH ? `${nxLT}; ${nxTH}` : nxLT || nxTH || "";
  } else {
    // Tin học giữa kỳ: chỉ cần một câu
    const arr = source[loai] || [];
    return pickRandom(arr);
  }
};

const fetchStudentsAndStatus = async (cls) => {
  const currentClass = cls || selectedClass;
  if (!currentClass) return;

  try {
    let termDoc;
    switch (config.hocKy) {
      case "Giữa kỳ I": termDoc = "GKI"; break;
      case "Cuối kỳ I": termDoc = "CKI"; break;
      case "Giữa kỳ II": termDoc = "GKII"; break;
      default: termDoc = "CN";
    }

    const isGiuaKy = termDoc === "GKI" || termDoc === "GKII";
    const classKey = currentClass.replace(".", "_");

    const hsCollection = collection(db, "DATA", classKey, "HOCSINH");
    const snap = await getDocs(hsCollection);
    if (snap.empty) {
      setStudents([]);
      return;
    }

    const studentList = [];

    snap.forEach((docSnap) => {
      const maHS = docSnap.id;
      const data = docSnap.data();

      let termData = {};
      let dgtx_mucdat = "";
      let dgtx_nx = "";
      let nhanXet = "";
      let lyThuyet = null;
      let thucHanh = null;
      let tongCong = null;
      let mucDat = "";

      // 🔹 Lấy toàn bộ ktdk để đọc các kỳ khác
      const ktdkAll =
        selectedSubject === "Công nghệ"
          ? (data.CongNghe?.ktdk || {})
          : (data.TinHoc?.ktdk || {});

      // 🔹 Lấy mức đạt các kỳ
      const mucDat_GKI = ktdkAll?.GKI?.mucDat || "";
      const mucDat_CKI = ktdkAll?.CKI?.mucDat || "";
      const mucDat_GKII = ktdkAll?.GKII?.mucDat || "";
      const mucDat_CN = ktdkAll?.CN?.mucDat || "";

      if (selectedSubject === "Công nghệ") {
        const congNghe = data.CongNghe || data.dgtx?.CongNghe || {};
        termData = congNghe.ktdk?.[termDoc] || {};
        dgtx_mucdat = termData.dgtx_mucdat || "";
        dgtx_nx = termData.dgtx_nx || "";
        nhanXet = termData.nhanXet || "";
        lyThuyet = termData.lyThuyet ?? null;
        thucHanh = termData.thucHanh ?? null;

        tongCong =
          termData.tongCong != null && !isNaN(termData.tongCong)
            ? Number(termData.tongCong)
            : lyThuyet != null && !isNaN(lyThuyet)
            ? Number(lyThuyet)
            : null;

        mucDat = termData.mucDat || "";
      } else {
        const tinHoc = data.TinHoc || data.dgtx?.TinHoc || {};
        termData = tinHoc.ktdk?.[termDoc] || {};
        dgtx_mucdat = termData.dgtx_mucdat || "";
        dgtx_nx = termData.dgtx_nx || "";
        nhanXet = termData.nhanXet || "";
        lyThuyet = termData.lyThuyet != null ? Number(termData.lyThuyet) : null;
        thucHanh = termData.thucHanh != null ? Number(termData.thucHanh) : null;

        tongCong =
          lyThuyet != null && !isNaN(lyThuyet) &&
          thucHanh != null && !isNaN(thucHanh)
            ? Math.round(lyThuyet + thucHanh)
            : null;

        mucDat = isGiuaKy
          ? (dgtx_mucdat || "")
          : tongCong != null
          ? (tongCong >= 9 ? "T" : tongCong >= 5 ? "H" : "C")
          : "";
      }

      // 🔹 Sinh nhận xét nếu rỗng
      if (!nhanXet || nhanXet.trim() === "") {
        nhanXet = generateNhanXet(
          { lyThuyet, thucHanh, tongCong, mucDat },
          selectedSubject,
          tongCong,
          mucDat
        );
      }

      studentList.push({
        maDinhDanh: maHS,
        hoVaTen: data.hoVaTen || "",
        stt: data.stt || null,
        dgtx_mucdat,
        mucDat,
        nhanXet,
        nhanXet_goc: nhanXet || "",
        mucDat_goc: mucDat || "",
        lyThuyet,
        thucHanh,
        tongCong,

        // 🔹 THÊM MỚI (phục vụ hiển thị bảng)
        mucDat_GKI,
        mucDat_CKI,
        mucDat_GKII,
        mucDat_CN,

        dgtx: {
          TinHoc: { ktdk: data.TinHoc?.ktdk || {}, tuan: data.TinHoc?.tuan || {} },
          CongNghe: { ktdk: data.CongNghe?.ktdk || {}, tuan: data.CongNghe?.tuan || {} },
        },
      });
    });

    // 🔹 Sắp xếp theo tên
    studentList.sort((a, b) => {
      const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
      const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
      return nameA.localeCompare(nameB, "vi", { sensitivity: "base" });
    });

    const finalList = studentList.map((s, idx) => ({ ...s, stt: idx + 1 }));

    setStudents(finalList);
    setOriginalStudents(finalList); // ✅ thêm dòng này
    setStudentsForClass(termDoc, classKey, finalList);
  } catch (err) {
    console.error("❌ Lỗi khi lấy dữ liệu từ DATA:", err);
    setStudents([]);
  }
};

  useEffect(() => {
    fetchStudentsAndStatus();
  }, [selectedClass, config.mon, config.hocKy]);
  
  // Hàm xử lý thay đổi ô bảng
  const handleCellChange = (maDinhDanh, field, value) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.maDinhDanh !== maDinhDanh) return s;

        const updated = { ...s, [field]: value };

        // =========================
        // 🧠 1. VALIDATE INPUT
        // =========================
        if (selectedSubject === "Tin học") {
          if ((field === "lyThuyet" || field === "thucHanh") && value !== "") {
            const num = parseFloat(value);
            if (isNaN(num) || num < 0 || num > 5) return s;
            updated[field] = num;
          }
        }

        if (selectedSubject === "Công nghệ") {
          if (field === "lyThuyet") {
            if (value === "" || isNaN(parseFloat(value))) {
              updated.tongCong = null;
            } else {
              const num = parseFloat(value);
              if (num < 0 || num > 10) return s;
              updated.tongCong = Math.round(num);
            }
          }
          if (field === "thucHanh" && !["T", "H", "C", ""].includes(value)) return s;
        }

        // =========================
        // 💬 1b. NHẬN XÉT THỦ CÔNG
        // =========================
        if (field === "nhanXet") {
          // Cho phép nhập tự do, không sinh lại tự động
          updated.nhanXet = value;
          return updated;
        }

        // =========================
        // 🧮 2. TÍNH TỔNG
        // =========================
        if (selectedSubject === "Tin học") {
          const lt = updated.lyThuyet != null ? parseFloat(updated.lyThuyet) : null;
          const th = updated.thucHanh != null ? parseFloat(updated.thucHanh) : null;

          updated.tongCong =
            lt != null && th != null && !isNaN(lt) && !isNaN(th)
              ? Math.round(lt + th)
              : null;
        }

        // =========================
        // 🎯 3. XÉT THEO TỔNG
        // =========================
        const isNoScore =
          updated.tongCong === null ||
          updated.tongCong === undefined ||
          isNaN(updated.tongCong);

        // =========================
        // 🔄 4. RESET VỀ DB
        // =========================
        if (isNoScore && field !== "mucDat") {
          updated.mucDat =
            s.dgtx_mucdat && s.dgtx_mucdat !== ""
              ? s.dgtx_mucdat
              : s.mucDat_goc || "";

          updated.nhanXet =
            s.dgtx_nx && s.dgtx_nx.trim() !== ""
              ? s.dgtx_nx
              : s.nhanXet_goc || "";

          return updated;
        }

        // =========================
        // 🌟 5. SINH MỨC ĐẠT (nếu không chỉnh thủ công)
        // =========================
        if (field !== "mucDat") {
          updated.mucDat =
            updated.tongCong >= 9
              ? "T"
              : updated.tongCong >= 5
              ? "H"
              : "C";
        }

        // =========================
        // 💬 6. SINH NHẬN XÉT TỰ ĐỘNG
        // =========================
        updated.nhanXet = generateNhanXet(
          updated,
          selectedSubject,
          updated.tongCong,
          updated.mucDat
        );

        return updated;
      })
    );
  };

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // "success" | "error" | "info" | "warning"
  });

  // ✅ Lưu null nếu rỗng
  const parseOrNull = (val) => {
    if (val === "" || val === null || val === undefined) return null;
    return Number(val);
  };

  const handleSaveAll = async () => {
  if (!students || students.length === 0) return;

  const selectedSemester = config.hocKy || "Giữa kỳ I";

  const selectedMon = config.mon || "Công nghệ";
  const isCongNghe = selectedMon === "Công nghệ";

  // ✅ FIX: mapping đầy đủ (THÊM GKI)
  let termDoc;
  switch (selectedSemester) {
    case "Giữa kỳ I":
      termDoc = "GKI";
      break;
    case "Cuối kỳ I":
      termDoc = "CKI";
      break;
    case "Giữa kỳ II":
      termDoc = "GKII";
      break;
    default:
      termDoc = "CN";
      break;
  }

  const classKey = (selectedClass || "").replace(".", "_");
  const batch = writeBatch(db);

  students.forEach((s) => {
    const hsRef = doc(db, "DATA", classKey, "HOCSINH", s.maDinhDanh);

    const ktdkData = {
      [termDoc]: {
        dgtx_gv: s.dgtx_mucdat || "",
        dgtx_mucdat: s.dgtx_mucdat || "",
        //dgtx_nx: s.nhanXet || "",
        dgtx_nx: "",

        lyThuyet:
          s.lyThuyet !== "" &&
          s.lyThuyet !== null &&
          s.lyThuyet !== undefined
            ? Number(s.lyThuyet)
            : null,

        thucHanh: isCongNghe
          ? s.thucHanh ?? ""
          : s.thucHanh !== undefined
          ? Number(s.thucHanh)
          : null,

        tongCong:
          s.tongCong !== null && s.tongCong !== undefined
            ? Number(s.tongCong)
            : null,

        mucDat: s.mucDat || "",
        nhanXet: s.nhanXet || "",
        //nhanXet: "",
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

    setStudentData((prev) => ({ ...prev, [classKey]: students }));
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

  // Hàm lưu 1 học sinh
  const handleSaveOne = async (student) => {
    if (!student) return;

    const selectedSemester = config.hocKy || "Giữa kỳ I";

    // ❌ Giữa kỳ thì không lưu
    if (selectedSemester === "Giữa kỳ I" || selectedSemester === "Giữa kỳ II") {
      setSnackbar({
        open: true,
        message: "⚠️ Giữa kỳ không lưu vào hệ thống!",
        severity: "warning",
      });
      return;
    }

    // ✅ Chỉ lưu Cuối kỳ I / Cuối kỳ II / Cả năm
    let termDoc;
    switch (selectedSemester) {
      case "Cuối kỳ I":
        termDoc = "CKI";
        break;
      case "Cuối kỳ II":
        termDoc = "CKII";
        break;
      default: // Cả năm
        termDoc = "CN";
        break;
    }

    const selectedMon = config.mon || "Công nghệ";
    const isCongNghe = selectedMon === "Công nghệ";
    const classKey = (selectedClass || "").replace(".", "_");

    const batch = writeBatch(db);
    const hsRef = doc(db, "DATA", classKey, "HOCSINH", student.maDinhDanh);

    // Không tính lyThuyetPhanTram ở đây nữa, đã tính trong handleSave
    const ktdkData = {
      [termDoc]: {
        lyThuyet: student.lyThuyet ?? null,
        thucHanh: isCongNghe
          ? (student.thucHanh ?? "")
          : (student.thucHanh !== undefined ? Number(student.thucHanh) : null),
        tongCong: student.tongCong ?? null,
        mucDat: student.mucDat ?? "",
        nhanXet: student.nhanXet ?? "",
        lyThuyetPhanTram: student.lyThuyetPhanTram ?? null, // giữ giá trị từ handleSave
      },
    };

    batch.set(
      hsRef,
      {
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

  const handleDownload = async () => {
    try {
      await exportKTDK(students, selectedClass, config.hocKy || "Giữa kỳ I", config.mon, config.namHoc);
    } catch (error) {
      console.error("❌ Lỗi khi xuất Excel:", error);
    }
  };

  const columns = ["lyThuyet", "thucHanh", "mucDat", "nhanXet"];
  const handleKeyNavigation = (e, rowIndex, col) => {
    const navigKeys = ["Enter", "ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Tab"];
    if (!navigKeys.includes(e.key)) return; // cho phép nhập bình thường

    e.preventDefault();

    let nextRow = rowIndex;
    let nextCol = columns.indexOf(col);

    if (e.key === "Enter" || e.key === "ArrowDown") {
      nextRow = Math.min(students.length - 1, rowIndex + 1);
    } else if (e.key === "ArrowUp") {
      nextRow = Math.max(0, rowIndex - 1);
    } else if (e.key === "ArrowRight" || e.key === "Tab") {
      if (col === "lyThuyet") {
        nextCol = columns.indexOf("thucHanh");
      } else if (col === "thucHanh") {
        nextCol = columns.indexOf("lyThuyet");
        nextRow = Math.min(students.length - 1, rowIndex + 1);
      } else {
        // các cột khác: đi theo cột bình thường
        nextCol = Math.min(columns.length - 1, nextCol + 1);
      }
    } else if (e.key === "ArrowLeft") {
      if (col === "thucHanh") nextCol = columns.indexOf("lyThuyet");
      else nextCol = Math.max(0, nextCol - 1);
    }

    const nextInput = document.getElementById(`${columns[nextCol]}-${nextRow}`);
    nextInput?.focus();
  };

  const handlePrint = async () => {
    if (!selectedClass) {
      alert("Vui lòng chọn lớp trước khi in!");
      return;
    }
    try {
      await printKTDK(
        students,
        selectedClass,
        config.hocKy || "Giữa kỳ I",
        config.mon,
        config.namHoc // 👈 thêm dòng này
      );
    } catch (err) {
      console.error("❌ Lỗi khi in:", err);
      alert("Lỗi khi in danh sách. Vui lòng thử lại!");
    }
  };

  const handleOpenLTDialog = (student) => {
    setEditingStudent(student);
    setLtValue(student.lyThuyet ?? "");
    setOpenLTDialog(true);
  };

  const handleCloseLTDialog = () => {
    setOpenLTDialog(false);
  };

  const handleUpdateLyThuyet = () => {
    const num = parseFloat(ltValue);
    if (isNaN(num) || num < 0 || num > 5) return;

    setStudents(prev =>
      prev.map(s =>
        s.maDinhDanh === editingStudent.maDinhDanh
          ? { ...s, lyThuyet: num }
          : s
      )
    );

    handleCloseLTDialog();
  };

  const getExtraColumns = () => {
    switch (config.hocKy) {
      case "Cuối kỳ I":
        return ["GKI"];
      case "Giữa kỳ II":
        return ["GKI", "CKI"];
      case "Cả năm":
        return ["GKI", "CKI", "GKII"];
      default:
        return [];
    }
  };

  const extraColumns = getExtraColumns();

  const readOnlyCellSx = {
    px: 1,
    backgroundColor: "#f5f5f5",
    color: "text.secondary",
    //fontStyle: "italic",
    border: "1px dashed #e0e0e0",
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
      <Card
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          maxWidth: 1420,
          mx: "auto",
          position: "relative"
        }}
      >
        {/* 🟩 Nút Lưu, Tải Excel, In */}
        <Box sx={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 1 }}>
          <Tooltip title="Lưu dữ liệu" arrow>
            <IconButton
              onClick={handleSaveAll}
              sx={{
                color: "primary.main",
                bgcolor: "white",
                boxShadow: 2,
                "&:hover": { bgcolor: "primary.light", color: "white" }
              }}
            >
              <SaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Tải xuống Excel" arrow>
            <IconButton
              onClick={handleDownload}
              sx={{
                color: "primary.main",
                bgcolor: "white",
                boxShadow: 2,
                "&:hover": { bgcolor: "primary.light", color: "white" }
              }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="In danh sách KTĐK" arrow>
            <IconButton
              onClick={handlePrint}
              sx={{
                color: "primary.main",
                bgcolor: "white",
                boxShadow: 2,
                "&:hover": { bgcolor: "primary.light", color: "white" },
              }}
            >
              <PrintIcon fontSize="small" />
            </IconButton>

          </Tooltip>

          <Tooltip title="Làm mới nhận xét" arrow>
            <IconButton
              onClick={() => {
                setStudents((prev) =>
                  prev.map((s) => {
                    return {
                      ...s,
                      nhanXet: generateNhanXet(
                        s,
                        selectedSubject,
                        s.tongCong,
                        s.mucDat
                      ),
                    };
                  })
                );
              }}
              sx={{
                color: "primary.main",
                bgcolor: "white",
                boxShadow: 2,
                "&:hover": { bgcolor: "primary.light", color: "white" },
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 🟨 Tiêu đề & Học kỳ hiện tại */}
        <Box sx={{ textAlign: "center", mt: 3, mb: 3 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            color="primary"
            sx={{ mb: 1 }}
          >
            {`NHẬP ĐIỂM ${config.hocKy?.toUpperCase() || "KTĐK"}`}
          </Typography>
        </Box>

        {/* 🟩 Hàng chọn Lớp – Môn – Học kỳ (3 ô cùng hàng khi mobile) */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            flexWrap: isMobile ? "nowrap" : "wrap",
            overflowX: isMobile ? "auto" : "visible",
            px: isMobile ? 1 : 0,
            mb: 3,
          }}
        >
          {/* Lớp */}
          <FormControl size="small" sx={{ minWidth: 80, flexShrink: 0, mt: 1 }}>
            <InputLabel id="lop-label">Lớp</InputLabel>
            <Select
              labelId="lop-label"
              value={selectedClass}
              label="Lớp"
              onChange={async (e) => {
                const newClass = e.target.value;
                setSelectedClass(newClass);
                setConfig(prev => ({ ...prev, lop: newClass }));
                setStudents([]);
                await fetchStudentsAndStatus(newClass);
              }}
            >
              {classes.map((cls) => (
                <MenuItem key={cls} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Môn học */}
          <FormControl size="small" sx={{ minWidth: 120, flexShrink: 0, mt: 1 }}>
            <InputLabel id="monhoc-label">Môn</InputLabel>
            <Select
              labelId="monhoc-label"
              value={selectedSubject}
              label="Môn"
              onChange={async (e) => {
                const value = e.target.value;
                setSelectedSubject(value);
                setConfig(prev => ({ ...prev, mon: value }));
                await setDoc(doc(db, "CONFIG", "config"), { mon: value }, { merge: true });
              }}
            >
              <MenuItem value="Tin học">Tin học</MenuItem>
              <MenuItem value="Công nghệ">Công nghệ</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* 🧾 Bảng học sinh (giữ nguyên định dạng gốc) */}
        <TableContainer
          component={Paper}
          sx={{
            maxHeight: "none",
            overflowY: "visible",
            overflowX: "auto",
          }}
        >

          <Table
            stickyHeader
            size="small"
            sx={{
              tableLayout: "fixed",
              minWidth: 800,
              borderCollapse: "collapse",
              "& td, & th": {
                borderRight: "1px solid #e0e0e0",
                borderBottom: "1px solid #e0e0e0",
              },
              "& th:last-child, & td:last-child": {
                borderRight: "none",
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 50, px: 1, whiteSpace: "nowrap" }}>STT</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 220, px: 1, whiteSpace: "nowrap" }}>Họ và tên</TableCell>                
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 60, px: 1, whiteSpace: "nowrap" }}>ĐGTX</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 60, px: 1, whiteSpace: "nowrap" }}>Lí thuyết</TableCell>
                <TableCell
                  align="center"
                  sx={{
                    backgroundColor: "#1976d2",
                    color: "white",
                    width: 80,
                    px: 0.5,
                    whiteSpace: "nowrap"
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="center" gap={0.3}>
                    <Typography variant="body2" sx={{ color: "white" }}>
                      Thực hành
                    </Typography>

                    {/* 🔥 NÚT FILL ALL */}
                    <FormControl variant="standard" sx={{ minWidth: 16 }}>
                      <Select
                        value={fillThucHanh}
                        displayEmpty
                        disableUnderline
                        onChange={(e) => {
                          const val = e.target.value;

                          setFillThucHanh(val);

                          setStudents((prev) =>
                            prev.map((s) => {
                              // 🔥 nếu chọn "-", reset về rỗng
                              let updated = { ...s, thucHanh: val === "-" ? "" : val };

                              // ===== TIN HỌC =====
                              if (selectedSubject === "Tin học") {
                                const lt = parseFloat(updated.lyThuyet);
                                const th = parseFloat(val);

                                if (!isNaN(lt) && !isNaN(th)) {
                                  updated.tongCong = Math.round(lt + th);

                                  if (updated.tongCong >= 9) updated.mucDat = "T";
                                  else if (updated.tongCong >= 5) updated.mucDat = "H";
                                  else updated.mucDat = "C";

                                  let loaiLT = lt > 4 ? "tot" : lt > 3 ? "kha" : lt >= 2.5 ? "trungbinh" : "yeu";
                                  let loaiTH = th > 4 ? "tot" : th > 3 ? "kha" : th >= 2.5 ? "trungbinh" : "yeu";

                                  const arrLT = nhanXetTinHocCuoiKy[loaiLT]?.lyThuyet || [];
                                  const arrTH = nhanXetTinHocCuoiKy[loaiTH]?.thucHanh || [];

                                  const nxLT = arrLT[Math.floor(Math.random() * arrLT.length)] || "";
                                  const nxTH = arrTH[Math.floor(Math.random() * arrTH.length)] || "";

                                  updated.nhanXet = `${nxLT}; ${nxTH}`.trim();
                                }
                              }

                              // ===== CÔNG NGHỆ =====
                              if (selectedSubject === "Công nghệ") {
                                if (!["-", "T", "H", "C"].includes(val)) return s;

                                const lyThuyetNum = parseFloat(updated.lyThuyet);

                                let loaiLyThuyet = "yeu";
                                if (!isNaN(lyThuyetNum)) {
                                  if (lyThuyetNum >= 9) loaiLyThuyet = "tot";
                                  else if (lyThuyetNum >= 5) loaiLyThuyet = "kha";
                                  else loaiLyThuyet = "trungbinh";
                                }

                                let loaiThucHanh = "yeu";
                                if (val === "T") loaiThucHanh = "tot";
                                else if (val === "H") loaiThucHanh = "kha";
                                else if (val === "C") loaiThucHanh = "trungbinh";
                                else if (val === "-") loaiThucHanh = "yeu"; // reset thì coi như rỗng

                                const arrLT = nhanXetCongNgheCuoiKy[loaiLyThuyet]?.lyThuyet || [];
                                const arrTH = nhanXetCongNgheCuoiKy[loaiThucHanh]?.thucHanh || [];

                                const nxLT = arrLT[Math.floor(Math.random() * arrLT.length)] || "";
                                const nxTH = arrTH[Math.floor(Math.random() * arrTH.length)] || "";

                                updated.nhanXet = `${nxLT}; ${nxTH}`.trim();
                              }

                              return updated;
                            })
                          );

                          setFillThucHanh(""); // 🔥 reset để chọn lại được
                        }}
                        renderValue={() => "▾"}
                        sx={{
                          color: "white",
                          fontSize: 18,
                          "& .MuiSelect-icon": { display: "none" }
                        }}
                      >
                        {/* 👉 Tuỳ môn */}
                        {selectedSubject === "Tin học" ? (
                          [0, 1, 2, 3, 4, 5].map((v) => (
                            <MenuItem key={v} value={v}>{v}</MenuItem>
                          ))
                        ) : (
                          ["-", "T", "H", "C"].map((v) => (
                            <MenuItem key={v} value={v}>{v}</MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>
                  Tổng cộng
                </TableCell>

                {/* 🔹 Cột động theo học kỳ */}
                {config.hocKy === "Cuối kỳ I" && (
                  <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                    GKI
                  </TableCell>
                )}

                {config.hocKy === "Giữa kỳ II" && (
                  <>
                    <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                      GKI
                    </TableCell>
                    <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                      CKI
                    </TableCell>
                  </>
                )}

                {config.hocKy === "Cả năm" && (
                  <>
                    <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                      GKI
                    </TableCell>
                    <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                      CKI
                    </TableCell>
                    <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 40 }}>
                      GKII
                    </TableCell>
                  </>
                )}

                <TableCell
                  align="center"
                  sx={{
                    backgroundColor: "#1976d2",
                    color: "white",
                    width: 70,
                    px: 1,
                    whiteSpace: "nowrap"
                  }}
                >
                  {config.hocKy === "Giữa kỳ I"
                    ? "GKI"
                    : config.hocKy === "Cuối kỳ I"
                    ? "CKI"
                    : config.hocKy === "Giữa kỳ II"
                    ? "GKII"
                    : "CN"}
                </TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 500, px: 1, whiteSpace: "nowrap" }}>Nhận xét</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map((student, idx) => (
                <TableRow key={student.maDinhDanh} hover>
                  <TableCell align="center" sx={{ px: 1 }}>{student.stt}</TableCell>
                  <TableCell align="left" sx={{ px: 1 }}>{student.hoVaTen}</TableCell>

                  {/* 🟩 Cột Giáo viên – nhập theo cột, dùng teacher.dgtx */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    <Box sx={{ textAlign: "center", fontSize: "14px", py: 0.5 }}>
                      {student.dgtx_mucdat || "-"}
                    </Box>
                  </TableCell>

                  {/* 🟨 Cột Lí thuyết */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    {selectedSubject === "Tin học" ? (
                      <Box
                        sx={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          borderRadius: 1,
                          transition: "all 0.2s ease",

                          // 🔥 hover = hiện ô nhập rõ
                          "&:hover": {
                            backgroundColor: "#f1f8ff",
                            boxShadow: "inset 0 0 0 1px #1976d2",
                          },

                          // 🔥 focus = đậm hơn
                          "&:focus-within": {
                            backgroundColor: "#e3f2fd",
                            boxShadow: "inset 0 0 0 2px #1976d2",
                          },

                          "& .edit-icon": {
                            position: "absolute",
                            right: 4,
                            opacity: 0,
                            transition: "opacity 0.2s ease",
                          },

                          "&:hover .edit-icon": {
                            opacity: 1,
                          },
                        }}
                      >
                        {/* ✅ INPUT */}
                        <TextField
                          variant="standard"
                          value={student.lyThuyet ?? ""}
                          onChange={(e) =>
                            handleCellChange(
                              student.maDinhDanh,
                              "lyThuyet",
                              e.target.value
                            )
                          }
                          fullWidth
                          inputProps={{
                            style: {
                              textAlign: "center",
                              padding: "4px 24px 4px 6px", // 👈 padding đẹp hơn
                            },
                          }}
                          id={`lyThuyet-${idx}`}
                          onKeyDown={(e) =>
                            handleKeyNavigation(e, idx, "lyThuyet")
                          }
                          InputProps={{
                            disableUnderline: true,
                          }}
                        />

                        {/* ✏️ Icon hover */}
                        <IconButton
                          size="small"
                          className="edit-icon"
                          onClick={() => handleOpenLTDialog(student)}
                          sx={{ p: 0.5 }}
                        >
                          <EditIcon fontSize="inherit" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          borderRadius: 1,
                          transition: "all 0.2s ease",

                          "&:hover": {
                            backgroundColor: "#f1f8ff",
                            boxShadow: "inset 0 0 0 1px #1976d2",
                          },

                          "&:focus-within": {
                            backgroundColor: "#e3f2fd",
                            boxShadow: "inset 0 0 0 2px #1976d2",
                          },
                        }}
                      >
                        <TextField
                          variant="standard"
                          value={student.lyThuyet || ""}
                          onChange={(e) =>
                            handleCellChange(
                              student.maDinhDanh,
                              "lyThuyet",
                              e.target.value
                            )
                          }
                          fullWidth
                          inputProps={{
                            style: {
                              textAlign: "center",
                              padding: "4px 6px",
                            },
                          }}
                          id={`lyThuyet-${idx}`}
                          onKeyDown={(e) =>
                            handleKeyNavigation(e, idx, "lyThuyet")
                          }
                          InputProps={{ disableUnderline: true }}
                        />
                      </Box>
                    )}
                  </TableCell>
                  {/* 🟨 Cột Thực hành */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    {selectedSubject === "Công nghệ" ? (
                      <Box
                        sx={{
                          borderRadius: 1,
                          transition: "all 0.2s ease",

                          // 🔥 hover
                          "&:hover": {
                            backgroundColor: "#f1f8ff",
                            boxShadow: "inset 0 0 0 1px #1976d2",
                          },

                          // 🔥 focus
                          "&:focus-within": {
                            backgroundColor: "#e3f2fd",
                            boxShadow: "inset 0 0 0 2px #1976d2",
                          },

                          // icon dropdown
                          "& .MuiSelect-icon": {
                            opacity: 0,
                            transition: "opacity 0.2s ease",
                          },
                          "&:hover .MuiSelect-icon": {
                            opacity: 1,
                          },
                        }}
                      >
                        <FormControl variant="standard" fullWidth>
                          <Select
                            value={student.thucHanh || ""}
                            onChange={(e) => {
                              const val = e.target.value;

                              if (val === "") {
                                handleCellChange(student.maDinhDanh, "thucHanh", "");

                                setStudents((prev) =>
                                  prev.map((s) =>
                                    s.maDinhDanh === student.maDinhDanh
                                      ? {
                                          ...s,
                                          thucHanh: "",
                                          tongCong: null,
                                          mucDat: s.mucDat_goc || s.dgtx_mucdat || "",
                                          nhanXet: s.nhanXet_goc || "",
                                        }
                                      : s
                                  )
                                );

                                return;
                              }

                              handleCellChange(student.maDinhDanh, "thucHanh", val);
                            }}
                            disableUnderline
                            id={`thucHanh-${idx}`}
                            sx={{
                              textAlign: "center",
                              px: 1,

                              "& .MuiSelect-select": {
                                py: "4px",
                                fontSize: "14px",
                                textAlign: "center",
                              },
                            }}
                            onKeyDown={(e) =>
                              handleKeyNavigation(e, idx, "thucHanh")
                            }
                          >
                            <MenuItem value="">
                              <em>-</em>
                            </MenuItem>
                            <MenuItem value="T">T</MenuItem>
                            <MenuItem value="H">H</MenuItem>
                            <MenuItem value="C">C</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          borderRadius: 1,
                          transition: "all 0.2s ease",

                          "&:hover": {
                            backgroundColor: "#f1f8ff",
                            boxShadow: "inset 0 0 0 1px #1976d2",
                          },

                          "&:focus-within": {
                            backgroundColor: "#e3f2fd",
                            boxShadow: "inset 0 0 0 2px #1976d2",
                          },
                        }}
                      >
                        <TextField
                          variant="standard"
                          value={student.thucHanh || ""}
                          onChange={(e) =>
                            handleCellChange(
                              student.maDinhDanh,
                              "thucHanh",
                              e.target.value
                            )
                          }
                          fullWidth
                          inputProps={{
                            style: {
                              textAlign: "center",
                              padding: "4px 6px",
                            },
                          }}
                          id={`thucHanh-${idx}`}
                          onKeyDown={(e) =>
                            handleKeyNavigation(e, idx, "thucHanh")
                          }
                          InputProps={{ disableUnderline: true }}
                        />
                      </Box>
                    )}
                  </TableCell>

                  {/* 🟨 Cột Tổng cộng */}
                  <TableCell align="center" sx={{ px: 1, fontWeight: "bold" }}>
                    {student.tongCong || ""}
                  </TableCell>
                  
                  {/* 🔹 Cột GKI */}
                  {/*{config.hocKy === "Cuối kỳ I" && (
                    <TableCell align="center" sx={{ px: 1 }}>
                      {student.mucDat_GKI || "-"}
                    </TableCell>
                  )}

                  {config.hocKy === "Giữa kỳ II" && (
                    <>
                      <TableCell align="center" sx={{ px: 1 }}>
                        {student.mucDat_GKI || "-"}
                      </TableCell>
                      <TableCell align="center" sx={{ px: 1 }}>
                        {student.mucDat_CKI || "-"}
                      </TableCell>
                    </>
                  )}

                  {config.hocKy === "Cả năm" && (
                    <>
                      <TableCell align="center" sx={{ px: 1 }}>
                        {student.mucDat_GKI || "-"}
                      </TableCell>
                      <TableCell align="center" sx={{ px: 1 }}>
                        {student.mucDat_CKI || "-"}
                      </TableCell>
                      <TableCell align="center" sx={{ px: 1 }}>
                        {student.mucDat_GKII || "-"}
                      </TableCell>
                    </>
                  )}*/}

                  {config.hocKy === "Cuối kỳ I" && (
                    <TableCell align="center" sx={readOnlyCellSx}>
                      {student.mucDat_GKI || "-"}
                    </TableCell>
                  )}

                  {config.hocKy === "Giữa kỳ II" && (
                    <>
                      <TableCell align="center" sx={readOnlyCellSx}>
                        {student.mucDat_GKI || "-"}
                      </TableCell>
                      <TableCell align="center" sx={readOnlyCellSx}>
                        {student.mucDat_CKI || "-"}
                      </TableCell>
                    </>
                  )}

                  {config.hocKy === "Cả năm" && (
                    <>
                      <TableCell align="center" sx={readOnlyCellSx}>
                        {student.mucDat_GKI || "-"}
                      </TableCell>
                      <TableCell align="center" sx={readOnlyCellSx}>
                        {student.mucDat_CKI || "-"}
                      </TableCell>
                      <TableCell align="center" sx={readOnlyCellSx}>
                        {student.mucDat_GKII || "-"}
                      </TableCell>
                    </>
                  )}

                  {/* 🟨 Cột Mức đạt */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    <Box
                      sx={{
                        borderRadius: 1,
                        transition: "all 0.2s ease",

                        // 🔥 hover
                        "&:hover": {
                          backgroundColor: "#f1f8ff",
                          boxShadow: "inset 0 0 0 1px #1976d2",
                        },

                        // 🔥 focus
                        "&:focus-within": {
                          backgroundColor: "#e3f2fd",
                          boxShadow: "inset 0 0 0 2px #1976d2",
                        },

                        // icon dropdown
                        "& .MuiSelect-icon": {
                          opacity: 0,
                          transition: "opacity 0.2s ease",
                        },
                        "&:hover .MuiSelect-icon": {
                          opacity: 1,
                        },
                      }}
                    >
                      <FormControl variant="standard" fullWidth>
                        <Select
                          value={student.mucDat || ""}
                          onChange={(e) =>
                            handleCellChange(
                              student.maDinhDanh,
                              "mucDat",
                              e.target.value
                            )
                          }
                          disableUnderline
                          id={`mucDat-${idx}`}
                          sx={{
                            textAlign: "center",
                            px: 1,

                            "& .MuiSelect-select": {
                              py: "4px",
                              fontSize: "14px",
                              textAlign: "center",
                            },
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const next = document.getElementById(
                                `mucDat-${idx + 1}`
                              );
                              if (next) next.focus();
                            }
                          }}
                        >
                          <MenuItem value="">
                            <em>-</em>
                          </MenuItem>
                          <MenuItem value="T">T</MenuItem>
                          <MenuItem value="H">H</MenuItem>
                          <MenuItem value="C">C</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </TableCell>

                  {/* 🟨 Cột Nhận xét */}
                  <TableCell align="left" sx={{ px: 1 }}>
                    <TextField
                      variant="standard"
                      multiline
                      maxRows={4}
                      fullWidth
                      value={student.nhanXet}
                      onChange={(e) =>
                        handleCellChange(student.maDinhDanh, "nhanXet", e.target.value)
                      }
                      id={`nhanXet-${idx}`}
                      onKeyDown={(e) => handleKeyNavigation(e, idx, "nhanXet")}
                      InputProps={{
                        sx: {
                          paddingLeft: 1,
                          paddingRight: 1,
                          fontSize: "14px",
                          lineHeight: 1.3,
                        },
                        disableUnderline: true,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

          </Table>
        </TableContainer>
      </Card>

      {/* Snackbar thông báo */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            width: "100%",
            boxShadow: 3,
            borderRadius: 2,
            fontSize: "0.9rem",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <CapNhatLyThuyetDialog
        open={openLTDialog}
        onClose={handleCloseLTDialog}
        student={editingStudent}
        lop={selectedClass}
        value={ltValue}
        setValue={setLtValue}
        handleCellChange={handleCellChange}
        onSaveOne={handleSaveOne} 
      />
    </Box>
  );


}
