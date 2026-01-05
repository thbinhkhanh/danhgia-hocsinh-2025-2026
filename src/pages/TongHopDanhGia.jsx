import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Card,
  Typography,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress,
  useMediaQuery,
  TextField,
  Snackbar, 
  Alert,
} from "@mui/material";

import { db } from "../firebase";
import { StudentDataContext } from "../context/StudentDataContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, setDoc, collection, writeBatch } from "firebase/firestore";

import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssessmentIcon from "@mui/icons-material/Assessment";

import { exportEvaluationToExcelFromTable } from "../utils/exportExcelFromTable";
import { nhanXetTinHocGiuaKy, nhanXetCongNgheGiuaKy } from '../utils/nhanXet.js';


export default function TongHopDanhGia() {
  // --- Context ---
  //const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentDataContext);

  const { config, setConfig } = useContext(ConfigContext);
  const selectedSemester = config.hocKy || "Giữa kỳ I";

  // --- State ---
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  
  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(9);

  //const [selectedWeek, setSelectedWeek] = useState(1);
  const [isTeacherChecked, setIsTeacherChecked] = useState(false);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [showWeeks, setShowWeeks] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(""); // không mặc định

  // Chọn ngẫu nhiên một phần tử trong mảng
  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Tính điểm trung bình từ tuần đến tuần, bỏ qua ô trống
  // -> Trả thêm tỉ lệ số T (để xét ưu tiên xếp loại tốt)
  function tinhDiemTrungBinhTheoKhoang(statusByWeek, from, to) {
    const diemMap = { T: 3, H: 2, C: 1 };
    let tong = 0, dem = 0;

    for (let i = from; i <= to; i++) {
      const weekId = `tuan_${i}`;
      const raw = statusByWeek?.[weekId];

      // Lấy cả HS và GV
      let hs = "";
      let gv = "";

      if (raw) {
        if (typeof raw === "object") {
          hs = raw.hs || "";
          gv = raw.gv || "";
        } else {
          hs = raw;
        }
      }

      const toShort = (statusStr) =>
        statusStr === "Hoàn thành tốt" ? "T" :
        statusStr === "Hoàn thành" ? "H" :
        statusStr === "Chưa hoàn thành" ? "C" : "";

      const hsShort = toShort(hs);
      const gvShort = toShort(gv);

      // Nếu cả HS và GV đều rỗng → bỏ qua
      if (!hsShort && !gvShort) continue;

      // Nếu chỉ 1 trong 2 có → dùng giá trị đó
      if (hsShort && !gvShort) {
        tong += diemMap[hsShort];
        dem++;
      } else if (!hsShort && gvShort) {
        tong += diemMap[gvShort];
        dem++;
      } else {
        // Cả HS + GV đều có → lấy trung bình
        tong += (diemMap[hsShort] + diemMap[gvShort]) / 2;
        dem++;
      }
    }

    const diemTB = dem > 0 ? tong / dem : null;

    return { diemTB };
  }

  // Đánh giá học sinh & sinh nhận xét
  function danhGiaHocSinh(student, from, to) {
    const { diemTB } = tinhDiemTrungBinhTheoKhoang(student.statusByWeek, from, to);

    if (diemTB === null)
      return { xepLoai: "", nhanXet: "" }; // Không hiển thị nếu chưa có dữ liệu

    const nhanXetMuc = getNhanXetMuc(selectedSubject);
    let xepLoaiDayDu, nhanXet;

    // Xếp loại dựa vào điểm trung bình
    if (diemTB >= 2.8) {
      xepLoaiDayDu = "Tốt";
      nhanXet = randomItem(nhanXetMuc.tot);
    } else if (diemTB >= 2.0) {
      xepLoaiDayDu = "Khá";
      nhanXet = randomItem(nhanXetMuc.kha);
    } else if (diemTB >= 1.5) {
      xepLoaiDayDu = "Trung bình";
      nhanXet = randomItem(nhanXetMuc.trungbinh);
    } else {
      xepLoaiDayDu = "Yếu";
      nhanXet = randomItem(nhanXetMuc.yeu);
    }

    // Rút gọn loại hiển thị: Tốt → T | Khá/Trung bình → H | Yếu → C
    let xepLoaiRutGon =
      xepLoaiDayDu === "Tốt"
        ? "T"
        : ["Khá", "Trung bình"].includes(xepLoaiDayDu)
        ? "H"
        : "C";

    return { xepLoai: xepLoaiRutGon, nhanXet };
  }

  function getNhanXetMuc(subject) {
    // 🔒 KHÓA CỨNG: luôn lấy nhận xét GIỮA KỲ
    if (subject === "Công nghệ") return nhanXetCongNgheGiuaKy;
    return nhanXetTinHocGiuaKy; // mặc định Tin học
  }


  // 🔹 Sinh nhận xét tự động dựa vào xếp loại rút gọn
  function getNhanXetTuDong(xepLoai) {
    if (!xepLoai) return "";

    const nhanXetMuc = getNhanXetMuc(selectedSubject);
    if (!nhanXetMuc) return "";

    if (xepLoai === "T") return randomItem(nhanXetMuc.tot);
    if (xepLoai === "H") return randomItem(nhanXetMuc.kha);
    if (xepLoai === "C") return randomItem(nhanXetMuc.yeu);

    return "";
  }

const [snackbar, setSnackbar] = useState({
  open: false,
  message: "",
  severity: "success", // success | error | warning | info
});

const handleSaveAll = async () => {
  if (!students || students.length === 0) return;

  const selectedSemester = config.hocKy || "Giữa kỳ I";
  const selectedMon = config.mon || "Công nghệ";
  const isCongNghe = selectedMon === "Công nghệ";

  // 🔹 MAP HỌC KỲ
  const mapTerm = {
    "Giữa kỳ I": "GKI",
    "Cuối kỳ I": "CKI",
    "Giữa kỳ II": "GKII",
    "Cả năm": "CN",
  };

  const termDoc = mapTerm[selectedSemester] || "CN";

  // 🔹 KEY LỚP (chuẩn DATA)
  const classKey = (selectedClass || "").replace(".", "_");

  const batch = writeBatch(db);

  students.forEach((s) => {
    const hsRef = doc(db, "DATA", classKey, "HOCSINH", s.maDinhDanh);

    const termUpdate = {};

    // ✅ Giáo viên
    if (s.dgtx_gv !== undefined) {
      termUpdate.dgtx_gv = s.dgtx_gv;
    }

    // ✅ Mức đạt (lấy từ dgtx hoặc dgtx_mucdat)
    if (s.dgtx !== undefined) {
      termUpdate.dgtx_mucdat = s.dgtx;
    }

    // ✅ Nhận xét (ĐÚNG FIELD)
    if (s.nhanXet !== undefined) {
      termUpdate.dgtx_nx = s.nhanXet;
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

  try {
    await batch.commit();

    setSnackbar({
      open: true,
      message: "✅ Lưu thành công!",
      severity: "success",
    });
  } catch (err) {
    console.error("❌ Lỗi lưu DATA:", err);
    setSnackbar({
      open: true,
      message: "❌ Lỗi khi lưu dữ liệu!",
      severity: "error",
    });
  }
};

 // Khi context có lớp (VD từ trang khác), cập nhật selectedClass và fetch lại
  useEffect(() => {
    if (config?.lop) {
      setSelectedClass(config.lop);
    }
  }, [config?.lop]);

  const [selectedWeek, setSelectedWeek] = useState(null); // ban đầu null

  // --- Khi load config ---
useEffect(() => {
  const fetchConfig = async () => {
    try {
      const docRef = doc(db, "CONFIG", "config");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Cập nhật context
        setConfig(data);

        // Cập nhật state tuần
        setWeekFrom(Number(data.th_tuan_from) || 1);
        setWeekTo(Number(data.th_tuan_to) || 9);
        setSelectedWeek(data.tuan || 1);

        // Cập nhật lớp/môn
        setSelectedClass(prev => prev || data.lop || "");
        setSelectedSubject(prev => prev || data.mon || "Tin học"); // 🔹 đồng bộ môn
      } else {
        setWeekFrom(1);
        setWeekTo(9);
        setSelectedWeek(1);
        setSelectedClass("");
        setSelectedSubject("Tin học");
      }
    } catch (err) {
      console.error("❌ Lỗi khi tải cấu hình:", err);
      setWeekFrom(1);
      setWeekTo(9);
      setSelectedWeek(1);
      setSelectedClass("");
      setSelectedSubject("Tin học");
    } finally {
      setIsConfigLoaded(true);
    }
  };

  fetchConfig();
}, [setConfig]);


  // Lấy danh sách lớp
  useEffect(() => {
  // Nếu context đã có dữ liệu lớp thì dùng luôn
    if (classData && classData.length > 0) {
        setClasses(classData);
        setSelectedClass(prev => prev || classData[0]);
        return;
    }

    // Nếu chưa có dữ liệu lớp => fetch từ Firestore
    const fetchClasses = async () => {
        try {
        const snapshot = await getDocs(collection(db, "DANHSACH")); // sửa cú pháp
        const classList = snapshot.docs.map(doc => doc.id);

        setClassData(classList);
        setClasses(classList);

        if (classList.length > 0) setSelectedClass(classList[0]);
        } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách lớp:", err);
        setClasses([]);
        setClassData([]);
        }
    };

    fetchClasses();
  }, [setClassData]); // chỉ dependency là setClassData

const hocKyMap = {
  "Giữa kỳ I": { from: 1, to: 9 },
  "Cuối kỳ I": { from: 10, to: 18 },
  "Giữa kỳ II": { from: 19, to: 27 },
  "Cả năm": { from: 28, to: 35 },
};

const fetchStudents = async ({ forceReload = false } = {}) => {
  if (!selectedClass || !selectedSubject) return;

  try {
    setLoadingProgress(0);
    setLoadingMessage(forceReload ? "Đang làm mới dữ liệu..." : "Đang tải dữ liệu học sinh...");

    // 🔹 MAP HỌC KỲ (ĐÚNG DẤU)
    const mapTerm = {
      "Giữa kỳ I": "GKI",
      "Cuối kỳ I": "CKI",
      "Giữa kỳ II": "GKII",
      "Cả năm": "CN",
    };

    const semester = selectedSemester || config.hocKy;
    if (!semester || !mapTerm[semester]) return;

    const termDoc = mapTerm[semester];
    const classKey = selectedClass.replace(".", "_");
    const subjectKey = selectedSubject === "Công nghệ" ? "CongNghe" : "TinHoc";
    const cacheKey = `${classKey}_${selectedSubject}_${termDoc}`;

    // 🔹 CACHE
    if (!forceReload && studentData[cacheKey]?.length) {
      setStudents(studentData[cacheKey]);
      setLoadingMessage("✅ Đã tải dữ liệu từ cache");
      setTimeout(() => setLoadingMessage(""), 1000);
      return;
    }

    // 🔹 LẤY DANH SÁCH HS
    const hsSnap = await getDocs(collection(db, "DATA", classKey, "HOCSINH"));
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

      // ❗ TÊN HS LẤY TỪ MON DATA
      const hoVaTen = monData.hoVaTen || data.hoVaTen || "";

      // 🔹 TUẦN (dgtx)
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

      // 🔹 KTDK THEO HỌC KỲ
      const termData = monData?.ktdk?.[termDoc] || {};

      studentList.push({
        maDinhDanh: docSnap.id,
        hoVaTen,
        statusByWeek,

        // ✅ CỘT CHUẨN
        dgtx_gv: termData.dgtx_gv || "",
        dgtx_mucdat: termData.dgtx_mucdat || "",
        nhanXet: termData.dgtx_nx?.trim() || "",
      });
    });

    // 🔹 SẮP XẾP TUẦN
    const sortedWeekIds = Array.from(
      new Set(studentList.flatMap(s => Object.keys(s.statusByWeek)))
    ).sort((a, b) =>
      Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, ""))
    );

    // 🔹 ĐÁNH GIÁ + MAP CỘT TUẦN
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

      // ✅ MỨC ĐẠT CUỐI
      const mucDat = s.dgtx_gv?.trim()
        ? s.dgtx_gv.trim()
        : xepLoai || "";

      // ✅ CHỈ SINH NHẬN XÉT NẾU CHƯA CÓ (GKI chưa có dữ liệu)
      const nhanXetAuto =
        !s.nhanXet && mucDat
          ? getNhanXetTuDong(mucDat)
          : s.nhanXet;

      return {
        ...s,
        ...weekCols,
        dgtx: mucDat,
        xepLoai: mucDat,
        nhanXet: nhanXetAuto,
      };
    });


    // 🔹 SẮP XẾP THEO TÊN
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

    // 🔹 LƯU STATE + CACHE
    setStudentData(prev => ({ ...prev, [cacheKey]: finalList }));
    setStudents(finalList);

    setLoadingProgress(100);
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

// --- Hàm thống kê tổng hợp ---
const getStatistics = () => {
  let totalT = 0;
  let totalH = 0;
  let totalC = 0;

  const weekId = `tuan_${selectedWeek}`;

  students.forEach((student) => {
    const raw = student.statusByWeek?.[weekId];
    const status = raw && typeof raw === "object" ? (raw.hs || "") : (raw || "");
    const short =
      status === "Hoàn thành tốt"
        ? "T"
        : status === "Hoàn thành"
        ? "H"
        : status === "Chưa hoàn thành"
        ? "C"
        : "";

    if (short === "T") totalT++;
    else if (short === "H") totalH++;
    else if (short === "C") totalC++;
  });

  const totalCells = students.length; // mỗi học sinh có 1 ô cho tuần này
  const totalBlank = Math.max(0, totalCells - (totalT + totalH + totalC));

  return { totalT, totalH, totalC, totalBlank };
};

const { totalT, totalH, totalC, totalBlank } = getStatistics();

const borderStyle = "1px solid #e0e0e0"; // màu nhạt như đường mặc định

const handleCellChange = (maDinhDanh, field, value) => {
  setStudents((prev) =>
    prev.map((s) =>
      s.maDinhDanh === maDinhDanh ? { ...s, [field]: value } : s
    )
  );
};

// Lấy tuần bắt đầu và kết thúc dựa trên học kỳ đã chọn
const { from: startWeek, to: endWeek } = hocKyMap[selectedSemester] || { from: 1, to: 9 };

return (
  <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
    <Card
      elevation={6}
      sx={{
        p: 4,
        borderRadius: 3,
        maxWidth: 1500,
        mx: "auto",
        position: "relative",
      }}
    >
      {/* 🔹 Nút tải Excel */}
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
        NHẬN XÉT {selectedSemester ? `${selectedSemester}` : ""}
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
              const newClass = e.target.value;
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
              fetchStudentsAndStatus();
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
            "& td, & th": { borderRight: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0" },
            "& th:last-child, & td:last-child": { borderRight: "none" },
          }}
        >
          <TableHead>
            {/* HÀNG HEADER 1 — merge tuần */}
            <TableRow>
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30 }}>STT</TableCell>
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 200 }}>Họ và tên</TableCell>

              {showWeeks &&
                (() => {
                  const { from: startWeek, to: endWeek } = hocKyMap[selectedSemester] || { from: 1, to: 9 };
                  return Array.from({ length: endWeek - startWeek + 1 }, (_, i) => {
                    const weekNum = startWeek + i;
                    return (
                      <TableCell
                        key={weekNum}
                        align="center"
                        colSpan={2}
                        sx={{ backgroundColor: "#1976d2", color: "white", width: 60 }}
                      >
                        Tuần {weekNum}
                      </TableCell>
                    );
                  });
                })()}

              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30 }}>Học sinh</TableCell>
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30 }}>Giáo viên</TableCell>
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30 }}>Mức đạt</TableCell>
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 300 }}>Nhận xét</TableCell>
            </TableRow>

            {/* HÀNG HEADER 2 — HS, GV */}
            <TableRow>
              {showWeeks &&
                (() => {
                  const { from: startWeek, to: endWeek } = hocKyMap[selectedSemester] || { from: 1, to: 9 };
                  return Array.from({ length: endWeek - startWeek + 1 }, (_, i) => (
                    <React.Fragment key={`sub-${i}`}>
                      <TableCell align="center" sx={{ backgroundColor: "#42a5f5", color: "white", width: 30 }}>HS</TableCell>
                      <TableCell align="center" sx={{ backgroundColor: "#42a5f5", color: "white", width: 30 }}>GV</TableCell>
                    </React.Fragment>
                  ));
                })()}
            </TableRow>
          </TableHead>

          <TableBody>
            {students.map((student, idx) => {
              const { from: startWeek, to: endWeek } = hocKyMap[selectedSemester] || { from: 1, to: 9 };
              const allWeeksEmpty = Array.from({ length: endWeek - startWeek + 1 }, (_, i) => {
                const weekNum = startWeek + i;
                const weekId = `tuan_${weekNum}`;
                return student.statusByWeek?.[weekId];
              }).every(status => !status);

              return (
                <TableRow key={student.maDinhDanh} hover>
                  <TableCell align="center">{student.stt}</TableCell>
                  <TableCell align="left">{student.hoVaTen}</TableCell>

                  {showWeeks &&
                    Array.from({ length: endWeek - startWeek + 1 }, (_, i) => {
                      const weekNum = startWeek + i;
                      const weekId = `tuan_${weekNum}`;
                      const raw = student.statusByWeek?.[weekId];
                      const hs = raw && typeof raw === "object" ? (raw.hs || "") : (raw || "");
                      const gv = raw && typeof raw === "object" ? (raw.gv || "") : "";

                      const toShort = (statusStr) =>
                        statusStr === "Hoàn thành tốt" ? "T" :
                        statusStr === "Hoàn thành" ? "H" :
                        statusStr === "Chưa hoàn thành" ? "C" : "";

                      const hsShort = toShort(hs);
                      const gvShort = toShort(gv);

                      return (
                        <React.Fragment key={weekNum}>
                          <TableCell align="center" sx={{ width: 30 }}>{hsShort}</TableCell>
                          <TableCell
                            align="center"
                            sx={{ width: 30, color: gvShort === "C" ? "#dc2626" : "#1976d2" }}
                          >
                            {gvShort}
                          </TableCell>
                        </React.Fragment>
                      );
                    })}

                  <TableCell align="center" sx={{ color: student.xepLoai === "C" ? "#dc2626" : (theme) => theme.palette.primary.main }}>{allWeeksEmpty ? "" : student.xepLoai || ""}</TableCell>

                  <TableCell align="center" sx={{ px: 1, color: student.dgtx_gv === "C" ? "#dc2626" : (theme) => theme.palette.primary.main }}>
                    {allWeeksEmpty ? null : (
                      <FormControl variant="standard" fullWidth sx={{
                        "& .MuiSelect-icon": { opacity: 0, transition: "opacity 0.2s ease" },
                        "&:hover .MuiSelect-icon": { opacity: 1 },
                      }}>
                        <Select
                          value={student.dgtx_gv || ""}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            setStudents((prev) =>
                              prev.map((s) => {
                                if (s.maDinhDanh !== student.maDinhDanh) return s;
                                const updated = { ...s, dgtx_gv: newVal };
                                const hs = updated.xepLoai;
                                const gv = newVal;
                                let chung = "";
                                if (!gv) chung = hs;
                                else {
                                  if (hs === "T" && gv === "T") chung = "T";
                                  else if (hs === "H" && gv === "T") chung = "T";
                                  else if (hs === "C" && gv === "T") chung = "H";
                                  else if (hs === "T" && gv === "H") chung = "H";
                                  else if (hs === "H" && gv === "H") chung = "H";
                                  else if (hs === "C" && gv === "H") chung = "H";
                                  else if (hs === "T" && gv === "C") chung = "H";
                                  else if (hs === "H" && gv === "C") chung = "C";
                                  else if (hs === "C" && gv === "C") chung = "C";
                                  else chung = hs;
                                }
                                updated.dgtx = !gv ? hs : chung;
                                updated.nhanXet = updated.dgtx ? getNhanXetTuDong(updated.dgtx) : "";
                                return updated;
                              })
                            );
                          }}
                          disableUnderline
                          id={`teacher-dgtx-${idx}`}
                          sx={{
                            textAlign: "center",
                            px: 1,
                            "& .MuiSelect-select": {
                              py: 0.5,
                              fontSize: "14px",
                              color: student.dgtx_gv === "C" ? "#dc2626" : (theme) => theme.palette.primary.main,
                            },
                          }}
                        >
                          <MenuItem value=""><em>-</em></MenuItem>
                          <MenuItem value="T">T</MenuItem>
                          <MenuItem value="H">H</MenuItem>
                          <MenuItem value="C">C</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </TableCell>

                  <TableCell align="center" sx={{ color: student.dgtx === "C" ? "#dc2626" : (theme) => theme.palette.primary.main }}>{allWeeksEmpty ? "" : student.dgtx || ""}</TableCell>

                  <TableCell align="left" sx={{ px: 1 }}>
                    {allWeeksEmpty ? null : (
                      <TextField
                        variant="standard"
                        multiline
                        maxRows={4}
                        fullWidth
                        value={student.nhanXet || ""}
                        onChange={(e) => handleCellChange(student.maDinhDanh, "nhanXet", e.target.value)}
                        id={`nhanXet-${idx}`}
                        onKeyDown={(e) => handleKeyNavigation(e, idx, "nhanXet")}
                        InputProps={{
                          sx: { paddingLeft: 1, paddingRight: 1, fontSize: "14px", lineHeight: 1.3 },
                          disableUnderline: true,
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- Bảng thống kê xuống cuối Card --- */}
      <Box
        sx={{
          mt: 3,
          backgroundColor: "#f1f8e9",
          borderRadius: 2,
          border: "1px solid #e0e0e0",
          p: 2,
          width: 300,
          maxWidth: "90%",
          mx: "auto",
          boxShadow: 2,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary">
            Thống kê:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Tuần</InputLabel>
            <Select
              value={selectedWeek}
              label="Tuần"
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
            >
              {Array.from(
                { length: endWeek - startWeek + 1 },
                (_, i) => startWeek + i
              ).map((weekNum) => (
                <MenuItem key={weekNum} value={weekNum}>
                  Tuần {weekNum}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Hoàn thành tốt (T):</Typography>
          <Typography variant="body2" fontWeight="bold">{totalT}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Hoàn thành (H):</Typography>
          <Typography variant="body2" fontWeight="bold">{totalH}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Chưa hoàn thành (C):</Typography>
          <Typography variant="body2" fontWeight="bold">{totalC}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">Chưa đánh giá:</Typography>
          <Typography variant="body2" fontWeight="bold">{totalBlank}</Typography>
        </Stack>
      </Box>
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
