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

import { exportKTDK } from "../utils/exportKTDK";
import { printKTDK } from "../utils/printKTDK";
import { nhanXetTinHocCuoiKy, nhanXetCongNgheCuoiKy } from '../utils/nhanXet.js';

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

        // ===== CHỌN MÔN =====
        if (selectedSubject === "Công nghệ") {
          const congNghe = data.CongNghe || data.dgtx?.CongNghe || {};
          termData = congNghe.ktdk?.[termDoc] || {};
          dgtx_mucdat = termData.dgtx_mucdat || "";
          dgtx_nx = termData.dgtx_nx || "";
          nhanXet = termData.nhanXet || "";
          lyThuyet = termData.lyThuyet ?? null;
          thucHanh = termData.thucHanh ?? null;
          tongCong = termData.tongCong ?? null;
          mucDat = termData.mucDat || "";
        } else {
          const tinHoc = data.TinHoc || data.dgtx?.TinHoc || {};
          termData = tinHoc.ktdk?.[termDoc] || {};
          dgtx_mucdat = termData.dgtx_mucdat || "";
          dgtx_nx = termData.dgtx_nx || "";
          nhanXet = termData.nhanXet || "";
          lyThuyet = termData.lyThuyet ?? null;
          thucHanh = termData.thucHanh ?? null;
          tongCong = termData.tongCong ?? null;
          mucDat = termData.mucDat || "";
        }

        // ===== GIỮ NGUYÊN CẤU TRÚC DGTX =====
        const tinHocData = data.TinHoc || {};
        const congNgheData = data.CongNghe || {};

        // ===== ÁP DỤNG LOGIC GIỮA KỲ =====
        const mucDatFinal = isGiuaKy ? (dgtx_mucdat || "") : (mucDat || "");
        const nhanXetFinal = isGiuaKy ? (dgtx_nx || "") : (nhanXet || "");

        studentList.push({
          maDinhDanh: maHS,
          hoVaTen: data.hoVaTen || "",
          stt: data.stt || null,

          dgtx_mucdat,
          mucDat: mucDatFinal,
          nhanXet: nhanXetFinal,

          lyThuyet,
          thucHanh,
          tongCong,

          dgtx: {
            TinHoc: {
              ktdk: tinHocData.ktdk || {},
              tuan: tinHocData.tuan || {},
            },
            CongNghe: {
              ktdk: congNgheData.ktdk || {},
              tuan: congNgheData.tuan || {},
            },
          },
        });
      });

      // ===== SẮP XẾP THEO TÊN =====
      studentList.sort((a, b) => {
        const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        return nameA.localeCompare(nameB, "vi", { sensitivity: "base" });
      });

      const finalList = studentList.map((s, idx) => ({
        ...s,
        stt: idx + 1,
      }));

      setStudents(finalList);
      setStudentsForClass(termDoc, classKey, finalList);

    } catch (err) {
      console.error("❌ Lỗi khi lấy dữ liệu từ DATA:", err);
      setStudents([]);
    }
  };


  const fetchNhanXet = (cls, mon) => {
  const subject = mon || selectedSubject;
  if (!students || students.length === 0) return;

  // 🔑 Xác định GIỮA KỲ
  const isGiuaKy =
    config.hocKy === "Giữa kỳ I" || config.hocKy === "Giữa kỳ II";

  /* =====================================================
     ========== GIỮA KỲ: KHÔNG SINH NHẬN XÉT ==========
     ===================================================== */
  if (isGiuaKy) {
    const updatedStudents = students.map((s) => ({
      ...s,
      // giữ nguyên nhận xét đã lấy từ dgtx_nx
      nhanXet: s.nhanXet || "",
      // mức đạt đã được set = dgtx_mucdat khi fetch
      mucDat: s.mucDat || s.dgtx_mucdat || "",
    }));

    setStudents(updatedStudents);
    return;
  }

  /* =====================================================
     ========== CUỐI KỲ / CẢ NĂM (GIỮ NGUYÊN) ==========
     ===================================================== */

  const updatedStudents = students.map((s) => {
    /* ===================== CÔNG NGHỆ ===================== */
    if (subject === "Công nghệ") {
      const lyThuyetNum = parseFloat(s.lyThuyet);
      let loaiLyThuyet = "yeu";
      if (!isNaN(lyThuyetNum)) {
        if (lyThuyetNum >= 9) loaiLyThuyet = "tot";
        else if (lyThuyetNum >= 5) loaiLyThuyet = "kha";
        else loaiLyThuyet = "trungbinh";
      }

      const thucHanhVal = s.thucHanh;
      let loaiThucHanh = "yeu";
      if (thucHanhVal === "T") loaiThucHanh = "tot";
      else if (thucHanhVal === "H") loaiThucHanh = "kha";
      else if (thucHanhVal === "C") loaiThucHanh = "trungbinh";

      const arrLT = nhanXetCongNgheCuoiKy[loaiLyThuyet]?.lyThuyet || [];
      const arrTH = nhanXetCongNgheCuoiKy[loaiThucHanh]?.thucHanh || [];

      const nxLT = arrLT[Math.floor(Math.random() * arrLT.length)] || "";
      const nxTH = arrTH[Math.floor(Math.random() * arrTH.length)] || "";

      return { ...s, nhanXet: `${nxLT} và ${nxTH}`.trim() };
    }

    /* ===================== TIN HỌC ===================== */

    // ⭐ LÝ THUYẾT
    const ltNum = parseFloat(s.lyThuyet);
    let loaiLT = "yeu";
    if (!isNaN(ltNum)) {
      if (ltNum > 4) loaiLT = "tot";
      else if (ltNum > 3) loaiLT = "kha";
      else if (ltNum >= 2.5) loaiLT = "trungbinh";
    }

    // ⭐ THỰC HÀNH
    const thNum = parseFloat(s.thucHanh);
    let loaiTH = "yeu";
    if (!isNaN(thNum)) {
      if (thNum > 4) loaiTH = "tot";
      else if (thNum > 3) loaiTH = "kha";
      else if (thNum >= 2.5) loaiTH = "trungbinh";
    }

    const arrLT = nhanXetTinHocCuoiKy[loaiLT]?.lyThuyet || [];
    const arrTH = nhanXetTinHocCuoiKy[loaiTH]?.thucHanh || [];

    const nxLT = arrLT[Math.floor(Math.random() * arrLT.length)] || "";
    const nxTH = arrTH[Math.floor(Math.random() * arrTH.length)] || "";

    return { ...s, nhanXet: `${nxLT}; ${nxTH}.`.trim() };
  });

  setStudents(updatedStudents);
};


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
    const arrNhanXet =
      selectedSubject === "Công nghệ"
        ? nhanXetCongNgheCuoiKy[loaiNhanXet].lyThuyet.concat(nhanXetCongNgheCuoiKy[loaiNhanXet].thucHanh)
        : nhanXetTinHocCuoiKy[loaiNhanXet];

    return arrNhanXet[Math.floor(Math.random() * arrNhanXet.length)];
  };

  // Hàm xử lý thay đổi ô bảng
  const handleCellChange = (maDinhDanh, field, value) => {
    // ✅ Kiểm tra dữ liệu nhập vào Tin học
    if (selectedSubject === "Tin học" && (field === "lyThuyet" || field === "thucHanh") && value !== "") {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 5) return; // Chỉ nhận 0–5
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (s.maDinhDanh !== maDinhDanh) return s;

        const updated = { ...s, [field]: value };

        if (selectedSubject === "Tin học") {
          // ✅ Nếu chỉnh cột Lí thuyết / Thực hành / GV đánh giá → tính lại
          if (["lyThuyet", "thucHanh", "dgtx_gv"].includes(field)) {
            const lt = parseFloat(updated.lyThuyet);
            const th = parseFloat(updated.thucHanh);

            // Nếu cả hai đều có giá trị hợp lệ
            if (!isNaN(lt) && !isNaN(th)) {
              updated.tongCong = Math.round(lt + th);

              const gv = updated.dgtx_gv;
              // ⚙️ Quy tắc đánh giá Mức đạt
              if (!gv) {
                if (updated.tongCong >= 9) updated.mucDat = "T";
                else if (updated.tongCong >= 5) updated.mucDat = "H";
                else updated.mucDat = "C";
              } else {
                updated.mucDat = gv;
              }

              // ✅ Cập nhật nhận xét tự động dựa trên LT/TH
              let loaiLT = "yeu";
              if (lt > 4) loaiLT = "tot";
              else if (lt > 3) loaiLT = "kha";
              else if (lt >= 2.5) loaiLT = "trungbinh";

              let loaiTH = "yeu";
              if (th > 4) loaiTH = "tot";
              else if (th > 3) loaiTH = "kha";
              else if (th >= 2.5) loaiTH = "trungbinh";

              const arrLT = nhanXetTinHocCuoiKy[loaiLT]?.lyThuyet || [];
              const arrTH = nhanXetTinHocCuoiKy[loaiTH]?.thucHanh || [];

              const nxLT = arrLT.length ? arrLT[Math.floor(Math.random() * arrLT.length)] : "";
              const nxTH = arrTH.length ? arrTH[Math.floor(Math.random() * arrTH.length)] : "";

              updated.nhanXet = `${nxLT}; ${nxTH}`.trim();
            } else {
              // Nếu thiếu một trong hai → xóa tổng, mức đạt, nhận xét
              updated.tongCong = null;
              updated.mucDat = "";
              updated.nhanXet = "";
            }
          }

          // ✅ Nếu chỉnh trực tiếp Mức đạt → tự động cập nhật nhận xét
          if (field === "mucDat") {
            if (!updated.mucDat) {
              updated.nhanXet = "";
            } else {
              updated.nhanXet = getNhanXetTuDong(updated.mucDat);
            }
          }
        } else if (selectedSubject === "Công nghệ") {
            // LY THUYET
            if (field === "lyThuyet") {
              if (value === "" || isNaN(parseFloat(value))) {
                updated.tongCong = null;
                updated.mucDat = "";
              } else {
                const num = parseFloat(value);
                if (num < 0 || num > 10) return s;
                updated.tongCong = num;

                const mucDatTuDong = num >= 9 ? "T" : num >= 5 ? "H" : "C";
                if (!s.mucDat || s.mucDat === (s.tongCong != null ? (s.tongCong >= 9 ? "T" : s.tongCong >= 5 ? "H" : "C") : "")) {
                  updated.mucDat = mucDatTuDong;
                }
              }
            }

            // THUC HANH
            if (field === "thucHanh") {
              if (!["T", "H", "C", ""].includes(value)) return s;
            }

            // GV nhập thủ công Mức đạt (không thay đổi gì)

            // ⭐ Cập nhật nhận xét: tách riêng lý thuyết và thực hành
            if (!updated.mucDat) {
              // Nếu chưa có mức đạt → nhận xét rỗng
              updated.nhanXet = "";
            } else {
              const lyThuyetNum = parseFloat(updated.lyThuyet);
              let loaiLyThuyet = "yeu";
              if (!isNaN(lyThuyetNum)) {
                if (lyThuyetNum >= 9) loaiLyThuyet = "tot";
                else if (lyThuyetNum >= 5) loaiLyThuyet = "kha";
                else loaiLyThuyet = "trungbinh";
              }

              const thucHanhVal = updated.thucHanh;
              let loaiThucHanh = "yeu";
              if (thucHanhVal === "T") loaiThucHanh = "tot";
              else if (thucHanhVal === "H") loaiThucHanh = "kha";
              else if (thucHanhVal === "C") loaiThucHanh = "trungbinh";

              const arrLyThuyet = nhanXetCongNgheCuoiKy[loaiLyThuyet]?.lyThuyet || [];
              const arrThucHanh = nhanXetCongNgheCuoiKy[loaiThucHanh]?.thucHanh || [];

              const nhanXetLyThuyet = arrLyThuyet.length ? arrLyThuyet[Math.floor(Math.random() * arrLyThuyet.length)] : "";
              const nhanXetThucHanh = arrThucHanh.length ? arrThucHanh[Math.floor(Math.random() * arrThucHanh.length)] : "";

              updated.nhanXet = `${nhanXetLyThuyet}; ${nhanXetThucHanh}`.trim();
            }
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

    // 🔑 GIỮA KỲ → KHÔNG LƯU
    const isGiuaKy =
      selectedSemester === "Giữa kỳ I" ||
      selectedSemester === "Giữa kỳ II";

    if (isGiuaKy) {
      setSnackbar({
        open: true,
        message: "✅ Lưu thành công!",
        severity: "success",
      });
      return;
    }

    /* =====================================================
      ========== CUỐI KỲ / CẢ NĂM (GIỮ NGUYÊN) ==========
      ===================================================== */

    const selectedMon = config.mon || "Công nghệ";
    const isCongNghe = selectedMon === "Công nghệ";

    let termDoc;
    switch (selectedSemester) {
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
          dgtx_nx: s.nhanXet || "",
          lyThuyet: s.lyThuyet || null,
          thucHanh: isCongNghe
            ? (s.thucHanh ?? "")
            : (s.thucHanh !== undefined ? Number(s.thucHanh) : null),
          tongCong: s.tongCong || null,
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
      await exportKTDK(students, selectedClass, config.hocKy || "Giữa kỳ I", config.mon);
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
      await printKTDK(students, selectedClass, config.hocKy || "Giữa kỳ I", config.mon);
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
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>ĐGTX</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Lí thuyết</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Thực hành</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Tổng cộng</TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 70, px: 1, whiteSpace: "nowrap" }}>Mức đạt</TableCell>
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
                    {selectedSubject === "Công nghệ" ? (
                      <FormControl
                        variant="standard"
                        fullWidth
                        sx={{
                          "& .MuiSelect-icon": { opacity: 0, transition: "opacity 0.2s ease" },
                          "&:hover .MuiSelect-icon": { opacity: 1 },
                        }}
                      >
                        <Select
                          value={student.thucHanh || ""}
                          onChange={(e) =>
                            handleCellChange(student.maDinhDanh, "thucHanh", e.target.value)
                          }
                          disableUnderline
                          id={`thucHanh-${idx}`}
                          sx={{
                            textAlign: "center",
                            px: 1,
                            "& .MuiSelect-select": { py: 0.5, fontSize: "14px" },
                          }}
                          onKeyDown={(e) => handleKeyNavigation(e, idx, "thucHanh")}
                        >
                          <MenuItem value="">
                            <em>-</em>
                          </MenuItem>
                          <MenuItem value="T">T</MenuItem>
                          <MenuItem value="H">H</MenuItem>
                          <MenuItem value="C">C</MenuItem>
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        variant="standard"
                        value={student.thucHanh || ""}
                        onChange={(e) =>
                          handleCellChange(student.maDinhDanh, "thucHanh", e.target.value)
                        }
                        inputProps={{ style: { textAlign: "center", paddingLeft: 2, paddingRight: 2 } }}
                        id={`thucHanh-${idx}`}
                        onKeyDown={(e) => handleKeyNavigation(e, idx, "thucHanh")}
                        InputProps={{ disableUnderline: true }}
                      />
                    )}
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
