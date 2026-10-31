import React, { useState, useEffect, useContext } from "react";

// ================= MUI =================
import {
  Box,
  Card,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
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
} from "firebase/firestore";

// ================= CONTEXT =================
import { StudentDataContext } from "../context/StudentDataContext";
import { ConfigContext } from "../context/ConfigContext";
import { StudentKTDKContext } from "../context/StudentKTDKContext";
import { useSelectedClass } from "../context/SelectedClassContext";

// ================= ICONS =================
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";

// ================= UTILS =================
import { exportEvaluationToExcelFromTable } from "../utils/exportExcelFromTable";
import { handleSaveAll as handleSaveAllUtil } from "../utils/saveEvaluationData";

import BangTongHopDGTX from "../components/BangTongHopDGTX";

export default function TongHopDanhGia() {
  // ================= CONTEXT =================
  const { studentData, setStudentData } = useContext(StudentDataContext);
  const { config, setConfig } = useContext(ConfigContext);

  // 🔹 Context lưu Mức đạt ĐGTX để tái sử dụng ở NhapdiemKTDK
  const { setDgtxMucDatForClass } = useContext(StudentKTDKContext);

  // 🔹 Dùng chung danh sách lớp + lớp đang chọn
  const {
    classes,
    selectedClass,
    setSelectedClass,
  } = useSelectedClass();

  const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");
  const selectedSemester = config.hocKy || "Giữa kỳ I";

  // ================= CLASS / DATA =================
  const [students, setStudents] = useState([]);

  // ================= SUBJECT =================
  const [selectedSubject, setSelectedSubject] = useState("");

  // ================= FLAGS =================
  const [showWeeks, setShowWeeks] = useState(true);

  // ================= LOADING & SNACKBAR =================
  const [, setLoadingMessage] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // success | error | warning | info
  });

  const [selectedWeek, setSelectedWeek] = useState(null); // ban đầu null

  // Tính điểm trung bình từ tuần đến tuần, bỏ qua ô trống
  function tinhDiemTrungBinhTheoKhoang(statusByWeek, from, to) {
    const diemMap = { T: 3, H: 2, C: 1 };

    let tong = 0;
    let dem = 0;

    const toShort = (statusStr) =>
      statusStr === "Hoàn thành tốt" ? "T" :
      statusStr === "Hoàn thành" ? "H" :
      statusStr === "Chưa hoàn thành" ? "C" :
      ["T", "H", "C"].includes(statusStr) ? statusStr :
      "";

    for (let i = from; i <= to; i++) {
      const weekId = `tuan_${i}`;
      const raw = statusByWeek?.[weekId];

      if (!raw || typeof raw !== "object") continue;

      const hsShort = toShort(raw.hs || "");
      const btShort = toShort(raw.gv || "");

      const diemNX = hsShort ? diemMap[hsShort] : null;
      const diemBT = btShort ? diemMap[btShort] : null;

      if (diemNX !== null && diemBT !== null) {
        tong += (diemNX + diemBT) / 2;
        dem++;
      } else if (diemNX !== null) {
        tong += diemNX;
        dem++;
      } else if (diemBT !== null) {
        tong += diemBT;
        dem++;
      }
    }

    const diemTB = dem > 0 ? tong / dem : null;
    return { diemTB };
  }

  // Đánh giá học sinh
  function danhGiaHocSinh(student, from, to) {
    const { diemTB } = tinhDiemTrungBinhTheoKhoang(
      student.statusByWeek,
      from,
      to
    );

    if (diemTB === null) {
      return { xepLoai: "" };
    }

    let xepLoai;
    if (diemTB >= 2.5) {
      xepLoai = "T";
    } else if (diemTB >= 1.5) {
      xepLoai = "H";
    } else {
      xepLoai = "C";
    }

    return { xepLoai };
  }

  const handleSaveAll = async () => {
    await handleSaveAllUtil({
      students,
      config,
      selectedClass,
      selectedSubject,
      namHocKey,
      setStudentData,
      setSnackbar,
    });
  };

  // --- Khi load config ---
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setConfig(data);
          setSelectedWeek(data.tuan || 1);
          setSelectedSubject(prev => prev || data.mon || "Tin học");
        } else {
          setSelectedWeek(1);
          setSelectedClass("");
          setSelectedSubject("Tin học");
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải cấu hình:", err);
        setSelectedWeek(1);
        setSelectedClass("");
        setSelectedSubject("Tin học");
      }
    };

    fetchConfig();
  }, [setConfig, setSelectedClass]);

  const hocKyMap = {
    "Giữa kỳ I": { from: 1, to: 9 },
    "Cuối kỳ I": { from: 10, to: 18 },
    "Giữa kỳ II": { from: 19, to: 27 },
    "Cuối năm": { from: 28, to: 35 },
  };

  const fetchStudents = async ({ forceReload = false } = {}) => {
    if (!selectedClass || !selectedSubject) return;

    try {
      setLoadingMessage(forceReload ? "Đang làm mới dữ liệu..." : "Đang tải dữ liệu học sinh...");

      const mapTerm = {
        "Giữa kỳ I": "GKI",
        "Cuối kỳ I": "CKI",
        "Giữa kỳ II": "GKII",
        "Cuối năm": "CN",
      };

      const semester = selectedSemester || config.hocKy;
      if (!semester || !mapTerm[semester]) return;

      const termDoc = mapTerm[semester];
      const classKey = selectedClass.replace(".", "_");
      const subjectKey = selectedSubject === "Công nghệ" ? "CongNghe" : "TinHoc";
      const cacheKey = `${classKey}_${selectedSubject}_${termDoc}`;

      if (!forceReload && studentData[cacheKey]?.length) {
        const cachedStudents = studentData[cacheKey];
        setStudents(cachedStudents);

        const dgtxMucDatData = {};
        cachedStudents.forEach((s) => {
          if (!s.maDinhDanh) return;
          dgtxMucDatData[s.maDinhDanh] = s.dgtx || "";
        });

        setDgtxMucDatForClass(
          namHocKey,
          classKey,
          subjectKey,
          termDoc,
          dgtxMucDatData
        );

        setLoadingMessage("✅ Đã tải dữ liệu từ cache");
        setTimeout(() => setLoadingMessage(""), 1000);
        return;
      }

      const hsSnap = await getDocs(collection(db, `DATA_${namHocKey}`, classKey, "HOCSINH"));
      if (hsSnap.empty) {
        setStudents([]);
        return;
      }

      const { from: weekFrom, to: weekTo } =
        hocKyMap[semester] || { from: 1, to: 35 };

      const studentList = [];

      hsSnap.forEach(docSnap => {
        const data = docSnap.data();
        const monData = data?.[subjectKey] || {};
        const hoVaTen = monData.hoVaTen || data.hoVaTen || "";

        const statusByWeek = {};
        const dgtxWeek = monData.dgtx || {};

        Object.entries(dgtxWeek).forEach(([key, value]) => {
          if (!key.startsWith("tuan_")) return;

          const weekNum = Number(key.replace(/\D/g, ""));
          if (weekNum >= weekFrom && weekNum <= weekTo) {
            statusByWeek[key] = {
              hs: value?.status || "",
              gv: value?.TN_status || "",
              TN_diem: value?.TN_diem ?? null,
            };
          }
        });

        const termData = monData?.ktdk?.[termDoc] || {};

        studentList.push({
          maDinhDanh: docSnap.id,
          hoVaTen,
          ghiChu: data.ghiChu || "",
          statusByWeek,
          dgtx_gv: termData.dgtx_gv || "",
          dgtx_mucdat: termData.dgtx_mucdat || "",
        });
      });

      const sortedWeekIds = Array.from(
        new Set(studentList.flatMap(s => Object.keys(s.statusByWeek)))
      ).sort((a, b) =>
        Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, ""))
      );

      const evaluatedList = studentList.map(s => {
        const { xepLoai } = danhGiaHocSinh(s, weekFrom, weekTo);

        const weekCols = sortedWeekIds.reduce((acc, weekId) => {
          const weekNum = Number(weekId.replace(/\D/g, ""));
          const raw = s.statusByWeek[weekId] || {};
          acc[`Tuan_${weekNum}_HS`] = raw.hs || "-";
          acc[`Tuan_${weekNum}_GV`] = raw.gv || "-";
          acc[`Tuan_${weekNum}_TN`] = raw.TN_diem ?? "-";
          return acc;
        }, {});

        const mucDat = s.dgtx_gv?.trim()
          ? s.dgtx_gv.trim()
          : xepLoai || "";

        return {
          ...s,
          ...weekCols,
          dgtx: mucDat,
          xepLoai,
        };
      });

      evaluatedList.sort((a, b) => {
        const lastA = a.hoVaTen.trim().split(" ").slice(-1)[0];
        const lastB = b.hoVaTen.trim().split(" ").slice(-1)[0];

        return lastA.localeCompare(lastB, "vi", {
          sensitivity: "base",
        });
      });

      const finalList = evaluatedList.map((s, i) => ({
        ...s,
        stt: i + 1,
      }));

      const dgtxMucDatData = {};
      finalList.forEach((s) => {
        if (!s.maDinhDanh) return;
        dgtxMucDatData[s.maDinhDanh] = s.dgtx || "";
      });

      setDgtxMucDatForClass(
        namHocKey,
        classKey,
        subjectKey,
        termDoc,
        dgtxMucDatData
      );

      setStudentData(prev => ({ ...prev, [cacheKey]: finalList }));
      setStudents(finalList);
      setTimeout(() => setLoadingMessage(""), 1200);

    } catch (err) {
      console.error("❌ Lỗi khi tải dữ liệu:", err);
      setStudents([]);
      setLoadingMessage("❌ Không thể tải dữ liệu");
    }
  };

  const recalcMucDat = () => {
    setStudents(prev =>
      prev.map(s => {
        const gv = s.dgtx_gv?.trim();
        const hs = s.xepLoai?.trim();
        const mucDat = gv ? gv : hs;

        return {
          ...s,
          dgtx: mucDat || "",
        };
      })
    );
  };

  useEffect(() => {
    if (!selectedClass || !selectedSubject) return;
    fetchStudents();
  }, [selectedClass, selectedSubject, selectedSemester]);

  const handleDownload = async () => {
    try {
      const { from: weekFrom, to: weekTo } = hocKyMap[selectedSemester] || { from: 1, to: 9 };
      exportEvaluationToExcelFromTable(students, selectedClass, weekFrom, weekTo);
    } catch (error) {
      console.error("❌ Lỗi khi xuất Excel:", error);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
      <Card
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          width: showWeeks ? "100%" : 600,
          maxWidth: 1500,
          mx: "auto",
          position: "relative",
          transition: "all 0.3s ease",
        }}
      >
        {/* 🔹 Nút chức năng */}
        <Box sx={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 1 }}>
          <Tooltip title="Lưu Xếp loại" arrow>
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

          <Tooltip title="Làm mới dữ liệu" arrow>
            <IconButton
              onClick={() => {
                fetchStudents({ forceReload: true });
                recalcMucDat();
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

        {/* ===== Header ===== */}
        <Typography
          variant="h5"
          fontWeight="bold"
          color="primary"
          gutterBottom
          sx={{ textAlign: "center", width: "100%", display: "block", mt: 3, mb: 2, textTransform: "uppercase" }}
        >
          ĐÁNH GIÁ {selectedSemester ? `${selectedSemester}` : ""}
        </Typography>

        {/* 🔹 Hàng chọn lớp và bộ lọc */}
        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" mb={3}>
          {/* Lớp */}
          <FormControl size="small" sx={{ minWidth: 60 }}>
            <InputLabel id="lop-label">Lớp</InputLabel>
            <Select
              labelId="lop-label"
              value={selectedClass}
              label="Lớp"
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setLoadingMessage("Đang tải dữ liệu lớp mới...");
              }}
            >
              {classes.map((cls) => (
                <MenuItem key={cls} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Dropdown chọn môn học */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="monhoc-label">Môn</InputLabel>
            <Select
              labelId="monhoc-label"
              label="Môn"
              value={selectedSubject}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedSubject(value);
                fetchStudents(); // ✅ Đã sửa gọi đúng tên hàm tải dữ liệu
              }}
            >
              <MenuItem value="Tin học">Tin học</MenuItem>
              <MenuItem value="Công nghệ">Công nghệ</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={<Checkbox checked={showWeeks} onChange={(e) => setShowWeeks(e.target.checked)} />}
            label={showWeeks ? "Ẩn tuần" : "Hiện tuần"}
          />
        </Stack>

        {/* --- Bảng dữ liệu --- */}
        <BangTongHopDGTX
          showWeeks={showWeeks}
          selectedSemester={selectedSemester}
          hocKyMap={hocKyMap}
          students={students}
          setStudents={setStudents}
          namHocKey={namHocKey}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          setDgtxMucDatForClass={setDgtxMucDatForClass}
        />
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%", boxShadow: 3, borderRadius: 2, fontSize: "0.9rem" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}