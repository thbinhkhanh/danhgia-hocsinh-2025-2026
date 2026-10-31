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
  setDoc,
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

// ================= CONTEXT =================
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { StudentKTDKContext } from "../context/StudentKTDKContext";
import { useSelectedClass } from "../context/SelectedClassContext";

// ================= UTILS =================
import { exportKTDK } from "../utils/exportKTDK";
import { printKTDK } from "../utils/printKTDK";

import QuanLyNhanXet from "../dialog/QuanLyNhanXet";

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
  const { studentData, setStudentData } = useContext(StudentContext);
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

  // 1️⃣ Hàm fetchStudentsAndStatus hỗ trợ nhận cả chuỗi lớp lẫn object cấu hình (có forceReload)
  const fetchStudentsAndStatus = async (arg) => {
    let clsToFetch = selectedClass;
    let reloadFlag = false;

    if (typeof arg === "object" && arg !== null) {
      clsToFetch = arg.cls || selectedClass;
      reloadFlag = arg.forceReload || false;
    } else if (typeof arg === "string" && arg.trim() !== "") {
      clsToFetch = arg;
    }

    await fetchStudentsUtil({
      cls: clsToFetch,
      selectedClass,
      config,
      selectedSubject,
      namHocKey,
      getDgtxMucDat,
      generateNhanXet,
      setStudents,
      setOriginalStudents,
      setStudentsForClass,
      studentData,
      setStudentData,
      forceReload: reloadFlag, // 👈 Đảm bảo truyền cờ làm mới xuống utility
    });
  };

  useEffect(() => {
    fetchStudentsAndStatus();
  }, [selectedClass, config.mon, config.hocKy]);


  // 2️⃣ Hàm handleRefresh gọi thẳng và bật cờ forceReload: true
  const handleRefresh = async () => {
    try {
      await fetchStudentsAndStatus({
        cls: selectedClass,
        forceReload: true, // 👈 Ép tải mới từ Firestore, bỏ qua cache
      });

      setSnackbar({
        open: true,
        message: "✅ Đã làm mới dữ liệu!",
        severity: "success",
      });
    } catch (error) {
      console.error("❌ Lỗi khi làm mới:", error);
      setSnackbar({
        open: true,
        message: `❌ Lỗi khi làm mới: ${error.message}`,
        severity: "error",
      });
    }
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
        config.namHoc
      );
    } catch (err) {
      console.error("❌ Lỗi khi in:", err);
      alert("Lỗi khi in danh sách. Vui lòng thử lại!");
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
            setStudents,
            generateNhanXet,
            selectedSubject,
            setOpenNhanXet,
            config,
            selectedClass,
            namHocKey,
            fetchStudentsAndStatus,
            setSnackbar,
            onRefresh: handleRefresh,
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

        {/* 🟩 Hàng chọn Lớp – Môn */}
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

        {/* 🧾 Bảng học sinh */}
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