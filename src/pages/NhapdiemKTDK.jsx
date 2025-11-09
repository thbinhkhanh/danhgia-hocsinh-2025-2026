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
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { StudentKTDKContext } from "../context/StudentKTDKContext";

import { exportKTDK } from "../utils/exportKTDK";
import { printKTDK } from "../utils/printKTDK";
import { nhanXetTinHoc, nhanXetCongNghe } from '../utils/nhanXet.js';

import { doc, getDoc, getDocs, collection, setDoc, writeBatch } from "firebase/firestore";

import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";

export default function NhapdiemKTDK() {
  const { classData, setClassData, studentData, setStudentData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);
  const { getStudentsForClass, setStudentsForClass } = useContext(StudentKTDKContext);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [selectedSubject, setSelectedSubject] = useState(() => config?.mon || "Tin học");

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

  const fetchStudentsAndStatus = async (cls) => {
    const currentClass = cls || selectedClass;
    if (!currentClass) return;

    try {
      // 🔹 Lấy học kỳ từ config (đồng bộ với handleSaveAll)
      const selectedSemester = config.hocKy || "Giữa kỳ I";

      // 🔹 Xác định tài liệu học kỳ trong Firestore
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


      // 🔹 Tên lớp: chỉ giữ dạng "4.1" hoặc "4.1_CN"
      const classKey = config?.mon === "Công nghệ" ? `${currentClass}_CN` : currentClass;

      // 🔹 Kiểm tra cache trước
      const cached = getStudentsForClass(termDoc, classKey);
      if (cached) {
        setStudents(cached);
        return;
      }

      // 🔹 Lấy dữ liệu từ Firestore
      const docRef = doc(db, "KTDK", termDoc);
      const snap = await getDoc(docRef);
      //const termData = snap.exists() ? snap.data() : {};
      //const classData = termData[classKey] || {};

      const termData = snap.exists() ? snap.data() : {};
      let classData = termData[classKey] || {};

      // 🟡 Nếu chưa có dữ liệu trong KTDK, lấy danh sách học sinh từ DANHSACH
      if (Object.keys(classData).length === 0) {
        const docRefList = doc(db, "DANHSACH", currentClass);
        const snapList = await getDoc(docRefList);
        if (snapList.exists()) {
          const listData = snapList.data();
          classData = {};
          Object.entries(listData).forEach(([maDinhDanh, info]) => {
            classData[maDinhDanh] = {
              hoVaTen: info.hoVaTen || "",
              dgtx: info.dgtx || "",
              dgtx_gv: "",
              lyThuyet: null,
              thucHanh: null,
              tongCong: null,
              mucDat: "",
              nhanXet: "",
            };
          });
        }
      }

      // 1️⃣ Tạo danh sách học sinh (chưa gán STT)
      let studentList = Object.entries(classData).map(([maDinhDanh, info]) => ({
        maDinhDanh,
        hoVaTen: info.hoVaTen || "",
        dgtx: info.dgtx || "",
        dgtx_gv: info.dgtx_gv || "",
        lyThuyet: info.lyThuyet ?? null,
        thucHanh: info.thucHanh ?? null,
        tongCong: info.tongCong ?? null,
        mucDat: info.mucDat || "",
        nhanXet: info.nhanXet || "",
      }));

      // 2️⃣ Sắp xếp theo tên
      studentList.sort((a, b) => {
        const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        return nameA.localeCompare(nameB);
      });

      // 3️⃣ Gán lại số thứ tự sau khi sắp xếp
      studentList = studentList.map((s, idx) => ({
        ...s,
        stt: idx + 1,
      }));

      // 4️⃣ Lưu và cache
      setStudents(studentList);
      setStudentsForClass(termDoc, classKey, studentList);
    } catch (err) {
      console.error("❌ Lỗi khi lấy dữ liệu:", err);
      setStudents([]);
    }
  };

  const fetchNhanXet = (cls, mon) => {
  const subject = mon || selectedSubject; // ưu tiên tham số
  if (!students || students.length === 0) return;

  // Hàm sinh nhận xét dựa trên mức đạt hoặc HS đánh giá
  const getNhanXet = (xepLoai) => {
    if (!xepLoai) return "";
    const loaiNhanXet =
      xepLoai === "T"
        ? "tot"
        : xepLoai === "H"
        ? "kha"
        : xepLoai === "C"
        ? "trungbinh"
        : "yeu";
    const arrNhanXet =
      subject === "Công nghệ"
        ? nhanXetCongNghe[loaiNhanXet]
        : nhanXetTinHoc[loaiNhanXet];
    if (!arrNhanXet || arrNhanXet.length === 0) return "";
    return arrNhanXet[Math.floor(Math.random() * arrNhanXet.length)];
  };

  // Cập nhật nhận xét cho từng học sinh
  const updatedStudents = students.map((s) => {
    const nhanXet = s.mucDat ? getNhanXet(s.mucDat) : getNhanXet(s.dgtx || "");
    return { ...s, nhanXet };
  });

  setStudents(updatedStudents);
};


  /*const fetchStudentsAndStatus_Fetch_NX_moi = async (cls, mon) => {
    const currentClass = cls || selectedClass;
    const subject = mon || selectedSubject; // dùng tham số ưu tiên
    if (!currentClass) return;

    try {
      const selectedSemester = config.hocKy || "Giữa kỳ I";

      let termDoc;
      switch (selectedSemester) {
        case "Giữa kỳ I": termDoc = "GKI"; break;
        case "Cuối kỳ I": termDoc = "CKI"; break;
        case "Giữa kỳ II": termDoc = "GKII"; break;
        default: termDoc = "CN"; break;
      }

      const classKey = subject === "Công nghệ" ? `${currentClass}_CN` : currentClass;

      const cached = getStudentsForClass(termDoc, classKey);
      if (cached) {
        setStudents(cached);
        return;
      }

      const docRef = doc(db, "KTDK", termDoc);
      const snap = await getDoc(docRef);
      const termData = snap.exists() ? snap.data() : {};
      const classData = termData[classKey] || {};

      let studentList = Object.entries(classData).map(([maDinhDanh, info]) => {

        const getNhanXet = (xepLoai) => {
          if (!xepLoai) return "";
          const loaiNhanXet =
            xepLoai === "T"
              ? "tot"
              : xepLoai === "H"
              ? "kha"
              : xepLoai === "C"
              ? "trungbinh"
              : "yeu";
          const arrNhanXet =
            subject === "Công nghệ"
              ? nhanXetCongNghe[loaiNhanXet]
              : nhanXetTinHoc[loaiNhanXet];
          if (!arrNhanXet || arrNhanXet.length === 0) return "";
          return arrNhanXet[Math.floor(Math.random() * arrNhanXet.length)];
        };

        // Nếu mucDat rỗng → dùng HS đánh giá dgtx để sinh nhận xét
        const nhanXet = info.mucDat
          ? getNhanXet(info.mucDat)
          : getNhanXet(info.dgtx || "");

        return {
          maDinhDanh,
          hoVaTen: info.hoVaTen || "",
          dgtx: info.dgtx || "",
          dgtx_gv: info.dgtx_gv || "",
          lyThuyet: info.lyThuyet ?? null,
          thucHanh: info.thucHanh ?? null,
          tongCong: info.tongCong ?? null,
          mucDat: info.mucDat || "",
          nhanXet,
        };
      });

      // Sắp xếp theo tên
      studentList.sort((a, b) => {
        const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        return nameA.localeCompare(nameB);
      });

      // Gán số thứ tự
      studentList = studentList.map((s, idx) => ({ ...s, stt: idx + 1 }));

      setStudents(studentList);
      setStudentsForClass(termDoc, classKey, studentList);

    } catch (err) {
      console.error("❌ Lỗi khi lấy dữ liệu:", err);
      setStudents([]);
    }
  };*/

  useEffect(() => {
    fetchStudentsAndStatus();
  }, [selectedClass, config.mon, config.hocKy]);

  // Hàm lấy nhận xét tự động theo xếp loại
  const getNhanXetTuDong = (xepLoai) => {
    if (!xepLoai) return "";

    let loaiNhanXet;
    if (xepLoai === "T") loaiNhanXet = "tot";
    else if (xepLoai === "H") loaiNhanXet = "kha";
    else if (xepLoai === "C") loaiNhanXet = "trungbinh";
    else loaiNhanXet = "yeu";

    // Chọn bộ nhận xét theo môn
    const arrNhanXet = selectedSubject === "Công nghệ" ? nhanXetCongNghe[loaiNhanXet] : nhanXetTinHoc[loaiNhanXet];

    return arrNhanXet[Math.floor(Math.random() * arrNhanXet.length)];
  };


  // Hàm xử lý thay đổi ô bảng
  const handleCellChange = (maDinhDanh, field, value) => {
    // ✅ Kiểm tra dữ liệu nhập vào Lí thuyết / Thực hành
    if ((field === "lyThuyet" || field === "thucHanh") && value !== "") {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 5) return; // Chỉ nhận 0–5
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (s.maDinhDanh === maDinhDanh) {
          const updated = { ...s, [field]: value };

          // ✅ Nếu chỉnh cột Lí thuyết / Thực hành / GV đánh giá → tính lại
          if (["lyThuyet", "thucHanh", "dgtx_gv"].includes(field)) {
            const lt = parseFloat(updated.lyThuyet) || 0;
            const th = parseFloat(updated.thucHanh) || 0;

            if (updated.lyThuyet !== "" && updated.thucHanh !== "") {
              updated.tongCong = Math.round(lt + th);

              const gv = updated.dgtx_gv;

              // ⚙️ Quy tắc đánh giá Mức đạt
              if (!gv) {
                // GV chưa đánh giá → logic mặc định
                if (updated.tongCong >= 9) updated.mucDat = "T";
                else if (updated.tongCong >= 5) updated.mucDat = "H";
                else updated.mucDat = "C";
              } else {
                // GV đánh giá → ưu tiên theo gv
                updated.mucDat = gv;
              }

              // ✅ Cập nhật nhận xét tự động
              updated.nhanXet = getNhanXetTuDong(updated.mucDat);
            } else {
              // Chưa nhập đủ điểm
              updated.tongCong = null;
              updated.mucDat = "";
              updated.nhanXet = "";
            }
          }

          // ✅ Nếu chỉnh trực tiếp Mức đạt → tự động cập nhật nhận xét
          if (field === "mucDat") {
            updated.nhanXet = getNhanXetTuDong(updated.mucDat);
          }

          return updated;
        }
        return s;
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

    // 🔹 Lấy học kỳ từ config (đồng bộ với CONFIG)
    const selectedSemester = config.hocKy || "Giữa kỳ I";

    // 🔹 Xác định tài liệu Firestore cần lưu
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


    // 🔹 Tên lớp rút gọn (4.1 hoặc 4.1_CN)
    const classKey = config.mon === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;

    const docRef = doc(db, "KTDK", termDoc);
    const batch = writeBatch(db);

    // 🔹 Chuẩn hóa dữ liệu học sinh
    const studentsMap = {};
    students.forEach((s) => {
      studentsMap[s.maDinhDanh] = {
        hoVaTen: s.hoVaTen || "",
        lyThuyet: parseOrNull(s.lyThuyet),
        thucHanh: parseOrNull(s.thucHanh),
        tongCong: parseOrNull(s.tongCong),
        mucDat: s.mucDat || "",
        nhanXet: s.nhanXet || "",
        dgtx: s.dgtx || "",
        dgtx_gv: s.dgtx_gv || "",
      };
    });

    // 🔹 Gộp dữ liệu vào batch (merge để không ghi đè lớp khác)
    batch.set(docRef, { [classKey]: studentsMap }, { merge: true });

    try {
      await batch.commit();

      // ✅ Cập nhật context cache
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


  const handleDownload = async () => {
    try {
      await exportKTDK(students, selectedClass, config.hocKy || "Giữa kỳ I");
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
      await printKTDK(students, selectedClass, config.hocKy || "Giữa kỳ I");
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
              onClick={() => printKTDK(students, selectedClass, config.hocKy || "Giữa kỳ I")}
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
              onClick={fetchNhanXet}
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
        <Box sx={{ textAlign: "center", mb: 3 }}>
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
        <TableContainer component={Paper} sx={{ maxHeight: "70vh", overflow: "auto" }}>
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
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>HS đánh giá</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>GV đánh giá</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Lí thuyết</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Thực hành</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Tổng cộng</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Mức đạt</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 350, px: 1, whiteSpace: "nowrap" }}>Nhận xét</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map((student, idx) => (
                <TableRow key={student.maDinhDanh} hover>
                  <TableCell align="center" sx={{ px: 1 }}>{student.stt}</TableCell>
                  <TableCell align="left" sx={{ px: 1 }}>{student.hoVaTen}</TableCell>

                  {/* 🟦 Cột Học sinh (trước là ĐGTX) */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    <Typography variant="body2" sx={{ textAlign: "center" }}>
                      {student.dgtx || ""}
                    </Typography>
                  </TableCell>

                  {/* 🟩 Cột Giáo viên – nhập theo cột, dùng teacher.dgtx */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    <FormControl
                      variant="standard"
                      fullWidth
                      sx={{
                        "& .MuiSelect-icon": { opacity: 0, transition: "opacity 0.2s ease" },
                        "&:hover .MuiSelect-icon": { opacity: 1 },
                      }}
                    >
                      <Select
                        value={student.dgtx_gv || ""}
                        onChange={(e) =>
                          handleCellChange(student.maDinhDanh, "dgtx_gv", e.target.value)
                        }
                        disableUnderline
                        id={`teacher-dgtx-${idx}`}
                        sx={{
                          textAlign: "center",
                          px: 1,
                          "& .MuiSelect-select": {
                            py: 0.5,
                            fontSize: "14px",
                          },
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const next = document.getElementById(`teacher-dgtx-${idx + 1}`);
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




                  </TableCell>

                  {/* 🟨 Cột Lí thuyết */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    <TextField
                      variant="standard"
                      value={student.lyThuyet || ""} // ✅ dùng lyThuyet
                      onChange={(e) =>
                        handleCellChange(student.maDinhDanh, "lyThuyet", e.target.value) // ✅ field lyThuyet
                      }
                      inputProps={{ style: { textAlign: "center", paddingLeft: 2, paddingRight: 2 } }}
                      id={`lyThuyet-${idx}`}
                      onKeyDown={(e) => handleKeyNavigation(e, idx, "lyThuyet")}
                      InputProps={{ disableUnderline: true }}
                    />
                  </TableCell>

                  {/* 🟨 Cột Thực hành */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    <TextField
                      variant="standard"
                      value={student.thucHanh}
                      onChange={(e) =>
                        handleCellChange(student.maDinhDanh, "thucHanh", e.target.value)
                      }
                      inputProps={{ style: { textAlign: "center", paddingLeft: 2, paddingRight: 2 } }}
                      id={`thucHanh-${idx}`}
                      onKeyDown={(e) => handleKeyNavigation(e, idx, "thucHanh")}
                      InputProps={{ disableUnderline: true }}
                    />
                  </TableCell>

                  {/* 🟨 Cột Tổng cộng */}
                  <TableCell align="center" sx={{ px: 1, fontWeight: "bold" }}>
                    {student.tongCong || ""}
                  </TableCell>

                  {/* 🟨 Cột Mức đạt */}
                  <TableCell align="center" sx={{ px: 1 }}>
                    <FormControl
                      variant="standard"
                      fullWidth
                      sx={{
                        "& .MuiSelect-icon": { opacity: 0, transition: "opacity 0.2s ease" },
                        "&:hover .MuiSelect-icon": { opacity: 1 },
                      }}
                    >
                      <Select
                        value={student.mucDat || ""}
                        onChange={(e) =>
                          handleCellChange(student.maDinhDanh, "mucDat", e.target.value)
                        }
                        disableUnderline
                        id={`mucDat-${idx}`}
                        sx={{
                          textAlign: "center",
                          px: 1,
                          "& .MuiSelect-select": {
                            py: 0.5,
                            fontSize: "14px",
                          },
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const next = document.getElementById(`mucDat-${idx + 1}`);
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
    </Box>
  );


}
