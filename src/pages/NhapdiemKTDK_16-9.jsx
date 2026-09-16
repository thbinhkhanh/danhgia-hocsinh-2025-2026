import React, { useState, useEffect, useContext } from "react";

// ================= MUI =================
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
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";

// ================= FIREBASE =================
import { db } from "../firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  writeBatch
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

// ================= CONTEXT =================
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { StudentKTDKContext } from "../context/StudentKTDKContext";

// ================= ICONS =================
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import RateReviewIcon from "@mui/icons-material/RateReview";

// ================= UTILS =================
import { exportKTDK } from "../utils/exportKTDK";
import { printKTDK } from "../utils/printKTDK";

import QuanLyNhanXet from "../dialog/QuanLyNhanXet";

export default function NhapdiemKTDK() {
  // ================= ROUTER =================
const navigate = useNavigate();

// ================= CONTEXT =================
const { classData, setClassData, studentData, setStudentData } =
  useContext(StudentContext);

const { config, setConfig } = useContext(ConfigContext);

const { getStudentsForClass, setStudentsForClass } =
  useContext(StudentKTDKContext);

// ================= CONFIG DERIVED =================
const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");

// ================= CLASS / DATA STATE =================
const [classes, setClasses] = useState([]);
const [selectedClass, setSelectedClass] = useState("");
const [students, setStudents] = useState([]);
const [originalStudents, setOriginalStudents] = useState([]);

// ================= SUBJECT =================
const [selectedSubject, setSelectedSubject] = useState(
  () => config?.mon || "Tin học"
);

// ================= UI / RESPONSIVE =================
const isMobile = useMediaQuery("(max-width: 768px)");

// ================= DIALOG STATE =================
const [openLTDialog, setOpenLTDialog] = useState(false);
const [openNhanXet, setOpenNhanXet] = useState(false);

// ================= EDITING STATE =================
const [editingStudent, setEditingStudent] = useState(null);
const [ltValue, setLtValue] = useState("");
const [fillThucHanh, setFillThucHanh] = useState("");
const [fillLyThuyet, setFillLyThuyet] = useState("");

// ================= DATA STATE =================
const [nhanXetData, setNhanXetData] = useState(null);

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
        // 🔹 ưu tiên cache từ context
        if (classData && classData.length > 0) {
          setClasses(classData);
          setSelectedClass((prev) => prev || classData[0]);
          return;
        }

        // 🔹 lấy từ Firestore chuẩn mới
        const snap = await getDoc(
          doc(db, "DANHSACH_LOP", namHocKey)
        );

        let classList = [];

        if (snap.exists()) {
          classList = (snap.data().list || []).sort((a, b) =>
            a.localeCompare(b, undefined, {
              numeric: true,
              sensitivity: "base",
            })
          );
        }

        setClassData(classList);
        setClasses(classList);

        if (classList.length > 0) {
          setSelectedClass((prev) => prev || classList[0]);
        }
      } catch (err) {
        console.error("❌ Lỗi lấy danh sách lớp:", err);
        setClasses([]);
        setClassData([]);
      }
    };

    fetchClasses();
  }, [namHocKey, classData]);

  const loadNhanXet = async () => {
  try {
    const col = `NHAN_XET_${namHocKey}`;
    const hocKy = config.hocKy;

    const docId =
      selectedSubject === "Công nghệ"
        ? (hocKy.includes("Cuối") ? "CongNghe_CuoiKy" : "CongNghe_GiuaKy")
        : (hocKy.includes("Cuối") ? "TinHoc_CuoiKy" : "TinHoc_GiuaKy");

    const snap = await getDoc(doc(db, col, docId));

    // =========================
    // 🔥 SAFE NORMALIZER (FIX [object Object])
    // =========================
    const safe = (v) => {
      if (!v) return [];

      // array case
      if (Array.isArray(v)) {
        return v.map(i =>
          typeof i === "string"
            ? i
            : (i?.text || i?.value || "")
        ).filter(Boolean);
      }

      // object case (Firestore map)
      if (typeof v === "object") {
        return Object.values(v).map(i =>
          typeof i === "string"
            ? i
            : (i?.text || i?.value || "")
        ).filter(Boolean);
      }

      return [];
    };

    // =========================
    // 🔥 DEFAULT DATA
    // =========================
    if (!snap.exists()) {
      setNhanXetData({
        TỐT: { lyThuyet: [], thucHanh: [] },
        KHÁ: { lyThuyet: [], thucHanh: [] },
        ĐẠT: { lyThuyet: [], thucHanh: [] },
        "CHƯA ĐẠT": { lyThuyet: [], thucHanh: [] },
      });
      return;
    }

    const raw = snap.data();

    // =========================
    // 🔥 NORMALIZE FIRESTORE → UI FORMAT
    // =========================
    const normalized = {
      TỐT: {
        lyThuyet: safe(raw?.tot?.lyThuyet),
        thucHanh: safe(raw?.tot?.thucHanh),
      },
      KHÁ: {
        lyThuyet: safe(raw?.kha?.lyThuyet),
        thucHanh: safe(raw?.kha?.thucHanh),
      },
      ĐẠT: {
        lyThuyet: safe(raw?.trungbinh?.lyThuyet),
        thucHanh: safe(raw?.trungbinh?.thucHanh),
      },
      "CHƯA ĐẠT": {
        lyThuyet: safe(raw?.yeu?.lyThuyet),
        thucHanh: safe(raw?.yeu?.thucHanh),
      },
    };

    setNhanXetData(normalized);

  } catch (err) {
    console.error("loadNhanXet error:", err);
  }
};

useEffect(() => {
  loadNhanXet();
}, [selectedSubject, config.hocKy]);

  // ------------------------
// 🔹 HÀM SINH NHẬN XÉT TỰ ĐỘNG
// ------------------------
const generateNhanXet = (student, subject, tongCong = null, mucDat = null) => {
  if (!nhanXetData) return student.nhanXet || "";

  // ===== 1. xác định mức đạt =====
  let computedMucDat = mucDat;

  if (!computedMucDat && subject === "Tin học" && tongCong != null) {
    computedMucDat = tongCong >= 9 ? "T" : tongCong >= 5 ? "H" : "C";
  } 
  else if (!computedMucDat && subject === "Công nghệ" && student.thucHanh) {
    const lt = parseFloat(student.lyThuyet);
    computedMucDat = !isNaN(lt) ? (lt >= 9 ? "T" : lt >= 5 ? "H" : "C") : "C";
  }

  if (!computedMucDat) return student.nhanXet || "";

  // ===== 2. map mức đạt =====
  const map = {
    T: "TỐT",
    H: "KHÁ",
    C: "ĐẠT",
  };

  const loai = map[computedMucDat] || "ĐẠT";

  const pickRandom = (arr) =>
    Array.isArray(arr) && arr.length
      ? arr[Math.floor(Math.random() * arr.length)]
      : "";

  const isCuoiKy = tongCong > 0;

  // ===== 3. CÔNG NGHỆ =====
  if (subject === "Công nghệ") {
    const source = nhanXetData;

    if (isCuoiKy) {
      const lt = parseFloat(student.lyThuyet);
      const th = student.thucHanh;

      const loaiLT =
        !isNaN(lt)
          ? (lt >= 9 ? "TỐT" : lt >= 7 ? "KHÁ" : lt >= 5 ? "ĐẠT" : "CHƯA ĐẠT")
          : loai;

      const loaiTH =
        th === "T" ? "TỐT"
        : th === "H" ? "KHÁ"
        : th === "C" ? "CHƯA ĐẠT"
        : loai;

      const arrLT = source?.[loaiLT]?.lyThuyet || [];
      const arrTH = source?.[loaiTH]?.thucHanh || [];

      const nxLT = pickRandom(arrLT);
      const nxTH = pickRandom(arrTH);

      return nxLT && nxTH ? `${nxLT}; ${nxTH}` : nxLT || nxTH || "";
    }

    return pickRandom(source?.[loai]?.lyThuyet || []);
  }

  // ===== 4. TIN HỌC =====
  const source = nhanXetData;

  const xepLoaiLT = (diem) => {
    const s = Number(diem);
    if (s >= 4.5) return "TỐT";
    if (s >= 3.5) return "KHÁ";
    if (s >= 2.5) return "ĐẠT";
    return "CHƯA ĐẠT";
  };

  const xepLoaiTH = (diem) => {
    const s = Number(diem);
    if (s >= 4.5) return "TỐT";
    if (s >= 3.5) return "KHÁ";
    if (s >= 2.5) return "ĐẠT";
    return "CHƯA ĐẠT";
  };

  if (isCuoiKy) {
    const lt = student.lyThuyet;
    const th = student.thucHanh;

    // ❗ nếu thiếu điểm → fallback
    if (
      lt === "" || lt == null ||
      th === "" || th == null
    ) {
      return student.nhanXet || "";
    }

    const loaiLT = xepLoaiLT(lt);
    const loaiTH = xepLoaiTH(th);

    const nxLT = pickRandom(source?.[loaiLT]?.lyThuyet || []);
    const nxTH = pickRandom(source?.[loaiTH]?.thucHanh || []);

    return nxLT && nxTH
      ? `${nxLT}; ${nxTH}`
      : nxLT || nxTH || "";
  }

  // ===== học kỳ / giữa kỳ: chỉ lấy lý thuyết =====
  const lt = student.lyThuyet;

  if (lt === "" || lt == null) {
    return student.nhanXet || "";
  }

  const loaiLT = xepLoaiLT(lt);
  return pickRandom(source?.[loaiLT]?.lyThuyet || []);
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

    const hsCollection = collection(db, `DATA_${namHocKey}`, classKey, "HOCSINH");
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

        let updated = { ...s, [field]: value };

        // =========================
        // 💬 NHẬN XÉT THỦ CÔNG (ưu tiên cao nhất)
        // =========================
        if (field === "nhanXet") {
          updated.nhanXet = value;
          return updated;
        }

        // =========================
        // 🧠 TIN HỌC
        // =========================
        if (selectedSubject === "Tin học") {
          if (field === "lyThuyet" || field === "thucHanh") {
            if (value === "" || value === "." || value === "-") {
              updated[field] = value;
            } else {
              let num;

              if (/^\d{2}$/.test(value)) {
                const first = parseInt(value[0]);
                const second = parseInt(value[1]);
                num = second === 5 ? first + 0.5 : first;
              } else {
                const raw = parseFloat(value);
                if (isNaN(raw)) return s;

                const integer = Math.floor(raw);
                const decimal = raw - integer;

                num = decimal === 0.5 ? integer + 0.5 : integer;
              }

              if (num < 0 || num > 5) return s;
              updated[field] = num;
            }
          }

          // =========================
          // 🚨 CHECK SỚM (QUAN TRỌNG NHẤT)
          // =========================
          const lt = updated.lyThuyet === "" || updated.lyThuyet == null
            ? null
            : parseFloat(updated.lyThuyet);

          const th = updated.thucHanh === "" || updated.thucHanh == null
            ? null
            : parseFloat(updated.thucHanh);

          if (lt == null || th == null || isNaN(lt) || isNaN(th)) {
            updated.tongCong = null;
            updated.mucDat = "";
            updated.nhanXet = "";
            return updated;
          }

          updated.tongCong = Math.round(lt + th);
        }

        // =========================
        // 🧠 CÔNG NGHỆ
        // =========================
        if (selectedSubject === "Công nghệ") {
          if (field === "lyThuyet") {
            if (value === "" || value === "." || value === "-") {
              updated.lyThuyet = value;
              updated.tongCong = null;
              updated.mucDat = "";
              updated.nhanXet = "";
              return updated;
            }

            let num;

            if (value === "10") {
              num = 10;
            } else if (/^\d{2}$/.test(value)) {
              const first = parseInt(value[0]);
              const second = parseInt(value[1]);
              num = second === 5 ? first + 0.5 : first;
            } else {
              const raw = parseFloat(value);
              if (isNaN(raw)) return s;

              const integer = Math.floor(raw);
              const decimal = raw - integer;

              num = decimal >= 0.5 ? integer + 0.5 : integer;
            }

            if (num < 0 || num > 10) return s;

            updated.lyThuyet = num;
            updated.tongCong = Math.round(num);
          }
        }

        // =========================
        // 🧮 TÍNH MỨC ĐẠT
        // =========================
        if (updated.tongCong != null && !isNaN(updated.tongCong)) {
          if (field !== "mucDat") {
            updated.mucDat =
              updated.tongCong >= 9
                ? "T"
                : updated.tongCong >= 5
                ? "H"
                : "C";
          }

          // =========================
          // 💬 NHẬN XÉT AUTO
          // =========================
          updated.nhanXet = generateNhanXet(
            updated,
            selectedSubject,
            updated.tongCong,
            updated.mucDat
          );
        } else {
          // nếu không có điểm → KHÔNG sinh lại
          updated.mucDat = "";
          updated.nhanXet = "";
        }

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
      const hsRef = doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", s.maDinhDanh);

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

          // Chỉ sửa thucHanh cho Tin học
          thucHanh: isCongNghe
            ? s.thucHanh ?? "" // Công nghệ giữ nguyên
            : s.thucHanh === "" || s.thucHanh === null || s.thucHanh === undefined
            ? null             // Tin học: UI rỗng → null
            : Number(s.thucHanh), // Tin học: còn lại → số (0 vẫn là 0)

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
  const selectedMon = config.mon || "Công nghệ";
  const isCongNghe = selectedMon === "Công nghệ";

  // ✅ Mapping đầy đủ giống handleSaveAll
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
  const hsRef = doc(db, `DATA_${namHocKey}`, classKey, "HOCSINH", student.maDinhDanh);

  // ✅ Helper xử lý rỗng → null
  const toNumberOrNull = (val) =>
    val === "" || val === null || val === undefined
      ? null
      : Number(val);

  // ✅ Data chuẩn hóa giống handleSaveAll
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
      case "Cuối năm":
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
        <IconButton
          onClick={() => navigate("/dashboard")}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "#64748b",
            backgroundColor: "#f1f5f9",
            "&:hover": {
              backgroundColor: "#e2e8f0",
              color: "#ef4444",
            },
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            zIndex: 10,
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* 🟩 Nút Lưu, Tải Excel, In */}
        <Box
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            gap: 1,
            alignItems: "center",
          }}
        >
          <Tooltip title="Lưu dữ liệu" arrow>
            <IconButton
              onClick={handleSaveAll}
              sx={{
                color: "primary.main",
                bgcolor: "white",
                boxShadow: 2,
                "&:hover": { bgcolor: "primary.light", color: "white" },
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
                "&:hover": { bgcolor: "primary.light", color: "white" },
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
                  prev.map((s) => ({
                    ...s,
                    nhanXet: generateNhanXet(
                      s,
                      selectedSubject,
                      s.tongCong,
                      s.mucDat
                    ),
                  }))
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

          {/* ✅ NÚT NHẬN XÉT → ĐẶT SAU REFRESH */}
          <Tooltip title="Quản lý nhận xét" arrow>
            <IconButton
              onClick={() => setOpenNhanXet(true)}
              sx={{
                color: "#1976d2",
                bgcolor: "white",
                boxShadow: 2,
                "&:hover": {
                  bgcolor: "#e3f2fd",
                },
              }}
            >
              <RateReviewIcon fontSize="small" />
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
                <TableCell
                  align="center"
                  sx={{
                    backgroundColor: "#1976d2",
                    color: "white",
                    width: 70,
                    px: 0.5,
                    whiteSpace: "nowrap"
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="center" gap={0.3}>
                    <Typography variant="body2" sx={{ color: "white" }}>
                      Lí thuyết
                    </Typography>

                    {/* 🔥 FILL ALL LT */}
                    <FormControl variant="standard" sx={{ minWidth: 16 }}>
                      <Select
                        value={fillLyThuyet}
                        displayEmpty
                        disableUnderline
                        onChange={(e) => {
                          const val = e.target.value;
                          setFillLyThuyet(val);

                          setStudents((prev) =>
                            prev.map((s) => {
                              let updated = { ...s };

                              // reset
                              if (val === "-") {
                                return {
                                  ...s,
                                  lyThuyet: "",
                                  tongCong: null,
                                  mucDat: s.mucDat_goc || s.dgtx_mucdat || "",
                                  nhanXet: s.nhanXet_goc || "",
                                };
                              }

                              updated.lyThuyet = val;

                              // ===== TIN HỌC =====
                              if (selectedSubject === "Tin học") {
                                const lt = parseFloat(val);
                                const th = parseFloat(s.thucHanh);

                                if (!isNaN(lt) && !isNaN(th)) {
                                  updated.tongCong = Math.round(lt + th);
                                  updated.mucDat =
                                    updated.tongCong >= 9 ? "T" :
                                    updated.tongCong >= 5 ? "H" : "C";

                                  updated.nhanXet = generateNhanXet(
                                    updated,
                                    selectedSubject,
                                    updated.tongCong,
                                    updated.mucDat
                                  );
                                }
                              }

                              // ===== CÔNG NGHỆ =====
                              if (selectedSubject === "Công nghệ") {
                                const lt = parseFloat(val);

                                if (!isNaN(lt)) {
                                  updated.tongCong = Math.round(lt);

                                  updated.mucDat =
                                    lt >= 9 ? "T" :
                                    lt >= 5 ? "H" : "C";

                                  updated.nhanXet = generateNhanXet(
                                    updated,
                                    selectedSubject,
                                    updated.tongCong,
                                    updated.mucDat
                                  );
                                }
                              }

                              return updated;
                            })
                          );

                          setFillLyThuyet(""); // reset dropdown
                        }}
                        renderValue={() => "▾"}
                        sx={{
                          color: "white",
                          fontSize: 18,
                          "& .MuiSelect-icon": { display: "none" }
                        }}
                      >
                        {selectedSubject === "Tin học"
                          ? ["-", 0, 1, 2, 3, 4, 5].map((v) => (
                              <MenuItem key={v} value={v}>{v}</MenuItem>
                            ))
                          : ["-", 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                              <MenuItem key={v} value={v}>{v}</MenuItem>
                            ))
                        }
                      </Select>
                    </FormControl>
                  </Box>
                </TableCell>
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
                          ["-", 0, 1, 2, 3, 4, 5].map((v) => (
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

                {config.hocKy === "Cuối năm" && (
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
                            //backgroundColor: "#f1f8ff",
                            backgroundColor: "#ffffff", // ✅ luôn trắng
                            boxShadow: "inset 0 0 0 1px #1976d2",
                          },

                          // 🔥 focus = đậm hơn
                          "&:focus-within": {
                            //backgroundColor: "#e3f2fd",
                            backgroundColor: "#ffffff", // ✅ luôn trắng
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
                              padding: "4px 8px"
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
                        {/*<IconButton
                          size="small"
                          className="edit-icon"
                          onClick={() => handleOpenLTDialog(student)}
                          sx={{ p: 0.5 }}
                        >
                          <EditIcon fontSize="inherit" />
                        </IconButton>*/}
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          borderRadius: 1,
                          transition: "all 0.2s ease",

                          "&:hover": {
                            //backgroundColor: "#f1f8ff",
                            backgroundColor: "#ffffff", // ✅ luôn trắng
                            boxShadow: "inset 0 0 0 1px #1976d2",
                          },

                          "&:focus-within": {
                            //backgroundColor: "#e3f2fd",
                            backgroundColor: "#ffffff", // ✅ luôn trắng
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
                            //backgroundColor: "#f1f8ff",
                            backgroundColor: "#ffffff", // ✅ luôn trắng
                            boxShadow: "inset 0 0 0 1px #1976d2",
                          },

                          // 🔥 focus
                          "&:focus-within": {
                            //backgroundColor: "#e3f2fd",
                            backgroundColor: "#ffffff", // ✅ luôn trắng
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
                            value={student.thucHanh ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;

                              setStudents((prev) =>
                                prev.map((s) => {
                                  // ✅ CHỈ update đúng học sinh đang chọn
                                  if (s.maDinhDanh !== student.maDinhDanh) return s;

                                  let updated = { ...s };

                                  // 🔥 RESET
                                  if (val === "") {
                                    return {
                                      ...s,
                                      thucHanh: "",
                                      tongCong: null,
                                      mucDat: s.mucDat_goc || s.dgtx_mucdat || "",
                                      nhanXet: s.nhanXet_goc || "",
                                    };
                                  }

                                  updated.thucHanh = val;

                                  // ===== CÔNG NGHỆ =====
                                  if (selectedSubject === "Công nghệ") {
                                    const lt = parseFloat(s.lyThuyet);

                                    if (!isNaN(lt)) {
                                      updated.tongCong = Math.round(lt);

                                      updated.mucDat =
                                        lt >= 9 ? "T" :
                                        lt >= 5 ? "H" : "C";

                                      updated.nhanXet = generateNhanXet(
                                        updated,
                                        selectedSubject,
                                        updated.tongCong,
                                        updated.mucDat
                                      );
                                    }
                                  }

                                  return updated;
                                })
                              );
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
                            //backgroundColor: "#f1f8ff",
                            backgroundColor: "#ffffff", // ✅ luôn trắng
                            boxShadow: "inset 0 0 0 1px #1976d2",
                          },

                          "&:focus-within": {
                            //backgroundColor: "#e3f2fd",
                            backgroundColor: "#ffffff", // ✅ luôn trắng
                            boxShadow: "inset 0 0 0 2px #1976d2",
                          },
                        }}
                      >
                        <TextField
                          variant="standard"
                          value={student.thucHanh ?? ""}
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

                  {config.hocKy === "Cuối năm" && (
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

                  {config.hocKy === "Cuối năm" && (
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
                          //backgroundColor: "#f1f8ff",
                          backgroundColor: "#ffffff", // ✅ luôn trắng
                          boxShadow: "inset 0 0 0 1px #1976d2",
                        },

                        // 🔥 focus
                        "&:focus-within": {
                          //backgroundColor: "#e3f2fd",
                          backgroundColor: "#ffffff", // ✅ luôn trắng
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

      <QuanLyNhanXet
        open={openNhanXet}
        onClose={() => setOpenNhanXet(false)}
      />

    </Box>
  );


}
