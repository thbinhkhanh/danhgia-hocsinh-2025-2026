import React, { useState, useEffect, useContext } from "react";

// ================= MUI =================
import {
  Box,
  Card,
  Typography,
  FormControl,
  Select,
  MenuItem,
  useMediaQuery,
  InputLabel,
  Snackbar,
  Alert,
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
import { useSelectedClass } from "../context/SelectedClassContext";

// ================= ICONS =================


// ================= UTILS =================
import { exportKTDK } from "../utils/exportKTDK";
import { printKTDK } from "../utils/printKTDK";

import QuanLyNhanXet from "../dialog/QuanLyNhanXet";

import { tinhVaLuuDiemDGTX } from "../utils/tinhVaLuuDiemDGTX";
import { loadNhanXet } from "../utils/loadNhanXet";
import { fetchStudentsAndStatus as fetchStudentsUtil } from "../utils/fetchStudentsAndStatus";
import { handleCellChange as handleCellChangeUtil } from "../utils/handleCellChange";
import { generateNhanXet as generateNhanXetUtil } from "../utils/generateNhanXet";
import { 
  handleSaveAll as handleSaveAllUtil, 
  handleSaveOne as handleSaveOneUtil 
} from "../utils/saveStudentData";

import BangNhapDiemKTDK from "../components/BangNhapDiemKTDK";
import ThanhCongCuDauTrang from "../components/ThanhCongCuDauTrang";

export default function NhapdiemKTDK() {
  // ================= ROUTER =================
const navigate = useNavigate();

// ================= CONTEXT =================
const { studentData, setStudentData } =
  useContext(StudentContext);

const { config, setConfig } = useContext(ConfigContext);

const {
  getStudentsForClass,
  setStudentsForClass,
  getDgtxMucDat,
} = useContext(StudentKTDKContext);

// 🔹 Dùng chung danh sách lớp + lớp đang chọn
const {
  classes,
  selectedClass,
  setSelectedClass,
} = useSelectedClass();

// ================= CONFIG DERIVED =================
const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");

// ================= CLASS / DATA STATE =================
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
    loadNhanXet(namHocKey, selectedSubject, config.hocKy, setNhanXetData);
  }, [selectedSubject, config?.hocKy, namHocKey]);

  // ------------------------
// 🔹 HÀM SINH NHẬN XÉT TỰ ĐỘNG
// ------------------------
const generateNhanXet = (student, subject, tongCong = null, mucDat = null) => {
    return generateNhanXetUtil(student, subject, tongCong, mucDat, nhanXetData);
};

const fetchStudentsAndStatus = async (cls) => {
  await fetchStudentsUtil({
    cls,
    selectedClass,
    config,
    selectedSubject,
    namHocKey,
    getDgtxMucDat,
    generateNhanXet,
    setStudents,
    setOriginalStudents,
    setStudentsForClass,
  });
};

// Dùng trong useEffect giữ nguyên không đổi:
useEffect(() => {
  fetchStudentsAndStatus();
}, [selectedClass, config.mon, config.hocKy]);

 
  // Hàm xử lý thay đổi ô bảng
const handleCellChange = (maDinhDanh, field, value) => {
  handleCellChangeUtil({
    maDinhDanh,
    field,
    value,
    selectedSubject,
    setStudents,
    generateNhanXet,
  });
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
    await handleSaveAllUtil({
      students,
      config,
      selectedClass,
      namHocKey,
      setStudentData,
      setStudentsForClass,
      setSnackbar,
    });
  };

  const handleSaveOne = async (student) => {
    await handleSaveOneUtil({
      student,
      config,
      selectedClass,
      namHocKey,
      setSnackbar,
    });
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

  const handleTongHopDGTX = async () => {
    try {
      // Lấy đúng học kỳ đang chọn trong ConfigContext
      const selectedSemester = config?.hocKy || "Giữa kỳ I";

      if (!selectedClass || !selectedSubject || !namHocKey) {
        alert("Vui lòng chọn đầy đủ lớp, môn học và năm học.");
        return;
      }

      const hocKyMap = {
        "Giữa kỳ I": { from: 1, to: 9 },
        "Cuối kỳ I": { from: 10, to: 18 },
        "Giữa kỳ II": { from: 19, to: 27 },
        "Cuối năm": { from: 28, to: 35 },
      };

      const { from, to } = hocKyMap[selectedSemester] || {};

      if (from == null || to == null) {
        alert("Không xác định được khoảng tuần của học kỳ.");
        return;
      }

      // Gọi hàm tính điểm và lưu Firestore
      const result = await tinhVaLuuDiemDGTX({
        namHocKey,
        selectedClass,
        selectedSubject,
        selectedSemester,
        weekFrom: from,
        weekTo: to,
      });

      setSnackbar({
        open: true,
        message: "Đã tính xong điểm ĐGTX!",
        severity: "success",
      });

      if (result.errors?.length > 0) {
        console.table(result.errors);
      }

      // Đọc lại dữ liệu học sinh từ Firestore
      await fetchStudentsAndStatus(selectedClass);

    } catch (error) {
      console.error("LỖI TỔNG HỢP ĐGTX:", error);
      alert(`Không thể tổng hợp ĐGTX: ${error.message}`);
    }
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
        <ThanhCongCuDauTrang
          {...{
            handleSaveAll,
            handleDownload,
            handlePrint,
            handleTongHopDGTX,
            setStudents,
            generateNhanXet,
            selectedSubject,
            setOpenNhanXet,
          }}
        />

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
        <BangNhapDiemKTDK
          {...{
            students,
            selectedSubject,
            config,
            fillLyThuyet,
            setFillLyThuyet,
            fillThucHanh,
            setFillThucHanh,
            handleCellChange,
            handleKeyNavigation,
            generateNhanXet,
            nhanXetData,
            setStudents,
          }}
        />
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
