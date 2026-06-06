import React, { useState, useEffect, useContext, useRef } from "react";

// ================= MUI =================
import {
  Box,
  Typography,
  Card,
  Button,
  Alert,
  Stack,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  Divider,
  Checkbox,
  FormControlLabel,
  Snackbar,
  RadioGroup,
  Radio,
  TextField,
  IconButton,
  Tooltip,
  InputLabel
} from "@mui/material";

// ================= FIREBASE =================
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  onSnapshot,
  writeBatch
} from "firebase/firestore";

import { db } from "../firebase";

// ================= ICONS =================
import BackupIcon from "@mui/icons-material/Backup";
import RestoreIcon from "@mui/icons-material/Restore";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import LockResetIcon from "@mui/icons-material/LockReset";
import CloseIcon from "@mui/icons-material/Close";

// ================= ROUTER =================
import { useNavigate } from "react-router-dom";

// ================= CONTEXT =================
import { ConfigContext } from "../context/ConfigContext";
import { StudentContext } from "../context/StudentContext";

// ================= COMPONENTS =================
import CreateDataConfirmDialog from "../dialog/CreateDataConfirmDialog";
import BackupPage from "./BackupPage";
import RestorePage from "./RestorePage";


// ================= STATE =================
export default function QuanTri() {
  // ================= CONTEXT =================
  const { config, setConfig } = useContext(ConfigContext);
  const { classData, setClassData } = useContext(StudentContext);
  const { studentData, setStudentData } = useContext(StudentContext);

  // ================= ROUTER =================
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("admin"); 
// "admin" | "backup"


  // ================= DIALOG STATE =================
  const [openBackupDialog, setOpenBackupDialog] = useState(false);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [openChangePw, setOpenChangePw] = useState(false);
  const [openCreateDataDialog, setOpenCreateDataDialog] = useState(false);

  // ================= CLASS / DATA =================
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [subject, setSubject] = useState("Tin học");

  // ================= SCHOOL SETTINGS =================
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedSemester, setSelectedSemester] = useState("Giữa kỳ I");
  const [selectedYear, setSelectedYear] = useState("2025-2026");

  // ================= PASSWORD =================
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");

  // ================= UI STATE =================
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // hoặc "error"
  });

  // 🔹 Khởi tạo config + danh sách lớp
  useEffect(() => {
    const initConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : {};

        // ⚡ Khởi tạo đầy đủ các field từ defaultConfig
        setConfig({
          hocKy: data.hocKy || "Giữa kỳ I",
          namHoc: data.namHoc || "2025-2026",
          mon: data.mon || "Tin học",
          lop: data.lop || "",
          tuan: data.tuan || 1,
          baiTapTuan: data.baiTapTuan || false,
          kiemTraDinhKi: data.kiemTraDinhKi || false,
          onTap: data.onTap || false, 

          loaiKiemTra: data.loaiKiemTra || "kiemtra", // ✅ THÊM MỚI

          choXemDiem: data.choXemDiem || false,
          choXemDapAn: data.choXemDapAn || false,
          xuatFileBaiLam: data.xuatFileBaiLam || false,
          timeLimit: data.timeLimit || 1,
          pass: data.pass || "",
          hienThiTenGanDay: data.hienThiTenGanDay || false,
        });

        // Đồng bộ các select input
        setSelectedWeek(data.tuan || 1);
        setSelectedSemester(data.hocKy || "Giữa kỳ I");
        setSubject(data.mon || "Tin học");

        // Danh sách lớp
        let classList = [];
        if (classData && classData.length > 0) {
          classList = classData;
        } else {
          const snapshot = await getDocs(collection(db, "DANHSACH"));
          classList = snapshot.docs.map((doc) => doc.id);
          setClassData(classList);
        }
        setClasses(classList);

        if (data.lop && classList.includes(data.lop)) {
          setSelectedClass(data.lop);
        } else if (classList.length > 0) {
          setSelectedClass(classList[0]);
          setConfig((prev) => ({ ...prev, lop: classList[0] }));
        }
      } catch (err) {
        console.error("❌ Lỗi khi khởi tạo cấu hình:", err);
      }
    };
    initConfig();
  }, [classData, setClassData]);

  useEffect(() => {
    if (config?.namHoc) {
      setSelectedYear(config.namHoc);
    }
  }, [config?.namHoc]);

  // 🔹 Cập nhật Firestore + Context
  const updateFirestoreAndContext = async (field, value) => {
    try {
      let newConfig;

      if (field === null && typeof value === "object") {
        // value là object chứa nhiều field
        newConfig = { ...config, ...value };
      } else {
        newConfig = { ...config, [field]: value };
      }

      await setDoc(doc(db, "CONFIG", "config"), newConfig, { merge: true });
      setConfig(newConfig);
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật Firestore:", err);
    }
  };

  // 🔹 Các hàm thay đổi select
  const handleSemesterChange = (e) => {
    const newSemester = e.target.value;
    setSelectedSemester(newSemester);
    setConfig({ hocKy: newSemester }); // ✅ Gọi updateConfig, update cả Firestore và context
  };

  const handleYearChange = (e) => {
    const newYear = e.target.value;
    setSelectedYear(newYear);
    setConfig({ namHoc: newYear }); // ✅ cập nhật context + Firestore
  };

  const handleSubjectChange = (e) => {
    const newSubject = e.target.value;
    setSubject(newSubject);
    setConfig({ mon: newSubject });
  };

  const handleClassChange = (e) => {
    const newClass = e.target.value;
    setSelectedClass(newClass);
    setConfig({ lop: newClass });
  };

  const handleWeekChange = (e) => {
    const newWeek = e.target.value;
    setSelectedWeek(newWeek);
    setConfig({ tuan: newWeek });
  };

  const handleTimeLimitChange = async (newValue) => {
    const value = Math.max(1, Number(newValue)); // đảm bảo ≥ 1
    setTimeInput(value);                          // cập nhật state local
    await setConfig({ timeLimit: value });       // cập nhật context + Firestore
  };

  const handleTracNghiemChange = (e) => {
    const value = e.target.checked;
    setIsTracNghiem(value);
    setConfig({ ...config, tracNghiem: value }); // chỉ cập nhật context
  };

  const [timeInput, setTimeInput] = useState(0);
  useEffect(() => {
    if (config.timeLimit !== undefined) {
      setTimeInput(config.timeLimit);
    }
  }, [config.timeLimit]);

  useEffect(() => {
    const docRef = doc(db, "CONFIG", "config");

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      const data = docSnap.exists() ? docSnap.data() : {};

      const tuan = data.tuan || 1;
      const lop = data.lop || "";
      const mon = data.mon || "Tin học";
      const hocKy = data.hocKy || "Giữa kỳ I";
      const namHoc = data.namHoc || "2025-2026";
      const deTracNghiem = data.deTracNghiem || "";
      const khoaHeThong = data.khoaHeThong ?? false;

      // ✅ KHÔNG overwrite – MERGE config
      setConfig(prev => ({
        ...prev,
        tuan,
        lop,
        mon,
        hocKy,
        namHoc, 
        deTracNghiem,
        khoaHeThong,
      }));

      // local state
      setSelectedWeek(tuan);
      setSelectedClass(lop);

      if (data.mon !== undefined) setSubject(mon);
      if (data.hocKy !== undefined) setSelectedSemester(hocKy);
    });

    return () => unsubscribe();
  }, []);

  return (
  <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
    {activePage === "backup" ? (
      <BackupPage onClose={() => setActivePage("admin")} />
    ) : activePage === "restore" ? (
      <RestorePage onClose={() => setActivePage("admin")} />
    ) : (
      <Card
      elevation={6}
      sx={{
        borderRadius: 3,
        maxWidth: 900,
        mx: "auto",
        mt: 0,
        overflow: "hidden",
      }}
    >
      {/* ===== HEADER ===== */}
      <Box
        sx={{
          px: 3,
          py: 1.4,
          bgcolor: "#1976d2",
          color: "#fff",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography
            sx={{
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            QUẢN TRỊ HỆ THỐNG
          </Typography>

          <IconButton
            onClick={() => navigate("/")}
            sx={{
              color: "#fff",
              bgcolor: "rgba(255,255,255,.12)",
              border: "1px solid rgba(255,255,255,.25)",

              "&:hover": {
                bgcolor: "#fff",
                color: "#ef4444",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      

      {/* ===== GRID ===== */}
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>

        {/* ================= LEFT ================= */}
        <Box sx={{ flex: 1, minWidth: 300 }}>

          {/* ===== CONFIG ===== */}
          <Box
            sx={{
              p: 2,
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              mb: 2,
              bgcolor: "#fff",
            }}
          >
            <Typography fontWeight="bold" sx={{ mb: 2 }}>
              Cấu hình hiển thị
            </Typography>

            <Stack spacing={2}>

              {/* Học kỳ / Năm */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Học kỳ</InputLabel>

                  <Select
                    label="Học kỳ"
                    value={selectedSemester}
                    onChange={handleSemesterChange}
                  >
                    <MenuItem value="Giữa kỳ I">Giữa kỳ I</MenuItem>
                    <MenuItem value="Cuối kỳ I">Cuối kỳ I</MenuItem>
                    <MenuItem value="Giữa kỳ II">Giữa kỳ II</MenuItem>
                    <MenuItem value="Cuối năm">Cuối năm</MenuItem>
                  </Select>
                </FormControl>

                <FormControl
                  size="small"
                  sx={{ flex: 1 }}
                >
                  <InputLabel>
                    Năm học
                  </InputLabel>

                  <Select
                    label="Năm học"
                    value={selectedYear}
                    onChange={handleYearChange}
                  >
                    {Array.from(
                      { length: 5 },
                      (_, i) => {
                        const start = 2025 + i;
                        return `${start}-${
                          start + 1
                        }`;
                      }
                    ).map((year) => (
                      <MenuItem
                        key={year}
                        value={year}
                      >
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Môn học / Lớp */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Môn học</InputLabel>

                  <Select
                    label="Môn học"
                    value={subject}
                    onChange={handleSubjectChange}
                  >
                    <MenuItem value="Tin học">
                      Tin học
                    </MenuItem>

                    <MenuItem value="Công nghệ">
                      Công nghệ
                    </MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Lớp</InputLabel>

                  <Select
                    label="Lớp"
                    value={selectedClass}
                    onChange={handleClassChange}
                  >
                    {classes.map((cls) => (
                      <MenuItem
                        key={cls}
                        value={cls}
                      >
                        {cls}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Tuần / Thời gian */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Tuần</InputLabel>

                  <Select
                    label="Tuần"
                    value={selectedWeek}
                    onChange={handleWeekChange}
                  >
                    {(
                      selectedSemester === "Giữa kỳ I" ||
                      selectedSemester === "Cuối kỳ I"
                        ? Array.from(
                            { length: 18 },
                            (_, i) => i + 1
                          )
                        : Array.from(
                            { length: 17 },
                            (_, i) => i + 19
                          )
                    ).map((week) => (
                      <MenuItem
                        key={week}
                        value={week}
                      >
                        Tuần {week}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Thời gian (phút)"
                  type="number"
                  size="small"
                  value={timeInput}
                  onChange={(e) =>
                    handleTimeLimitChange(
                      e.target.value
                    )
                  }
                  sx={{ flex: 1 }}
                  inputProps={{
                    min: 1,
                    style: {
                      textAlign: "center",
                    },
                  }}
                />
              </Box>
            </Stack>
          </Box>

          {/* ===== SYSTEM CHECK ===== */}
          <Box
            sx={{
              p: 2,
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              mb: 2,
              bgcolor: "#fff",
            }}
          >
            <Typography fontWeight="bold" sx={{ mb: 1 }}>
              Hệ thống
            </Typography>

            <Stack spacing={0.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={config.hienThiTenGanDay || false}
                    onChange={(e) =>
                      updateFirestoreAndContext(
                        "hienThiTenGanDay",
                        e.target.checked
                      )
                    }
                  />
                }
                label="Hiển thị tên gần đây"
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={config.khoaHeThong || false}
                    onChange={(e) =>
                      updateFirestoreAndContext(
                        "khoaHeThong",
                        e.target.checked
                      )
                    }
                    color="error"
                  />
                }
                label={
                  <Typography
                    sx={{
                      color: "#d32f2f",
                      fontWeight: 600,
                    }}
                  >
                    Khóa hệ thống
                  </Typography>
                }
              />
            </Stack>
          </Box>

          {/* ===== ACTION AREA ===== */}
          <Box
            sx={{
              p: 2,
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              bgcolor: "#fff",
            }}
          >
            <Typography
              fontWeight="bold"
              sx={{ mb: 2 }}
            >
              Quản trị dữ liệu
            </Typography>

            <Stack
              direction="row"
              spacing={1.5}
            >
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<AutorenewIcon />}
                onClick={() =>
                  setOpenCreateDataDialog(true)
                }
                sx={{
                  height: 46,
                  textTransform: "none",
                  borderRadius: "12px",
                  fontWeight: 700,
                  boxShadow: "none",
                }}
              >
                Năm mới
              </Button>

              <Button
                fullWidth
                variant="contained"
                startIcon={<BackupIcon />}
                onClick={() => setActivePage("backup")}
                sx={{
                  height: 46,
                  textTransform: "none",
                  borderRadius: "12px",
                  fontWeight: 700,
                  boxShadow: "none",
                }}
              >
                Sao lưu
              </Button>

              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                startIcon={<RestoreIcon />}
                onClick={() => setActivePage("restore")}
                sx={{
                  height: 46,
                  textTransform: "none",
                  borderRadius: "12px",
                  fontWeight: 700,
                }}
              >
                Phục hồi
              </Button>
            </Stack>
          </Box>
        </Box>

        

        {/* ================= RIGHT ================= */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
          {/* ===== EXAM TYPE ===== */}
          <Box
            sx={{
              p: 2,
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              mb: 2,
              bgcolor: "#fff",
            }}
          >
            <Typography
              fontWeight="bold"
              sx={{ mb: 1 }}
            >
              Loại đánh giá
            </Typography>

            <RadioGroup
              sx={{
                ml: 1, // lề trái
              }}
              value={
                config.danhGiaTuan
                  ? "danhGiaTuan"
                  : config.baiTapTuan
                  ? "baiTapTuan"
                  : config.kiemTraDinhKi
                  ? "kiemTraDinhKi"
                  : config.examType === "ontap"
                  ? "onTap"
                  : ""
              }
              onChange={(e) => {
                const v = e.target.value;

                setConfig({
                  danhGiaTuan:
                    v === "danhGiaTuan",

                  baiTapTuan:
                    v === "baiTapTuan",

                  kiemTraDinhKi:
                    v === "kiemTraDinhKi",

                  onTap: v === "onTap",

                  examType:
                    v === "onTap"
                      ? "ontap"
                      : config.examType,
                  
                  // ===== field mới (chuẩn hoá tương lai) =====
                  loaiKiemTra:
                    v === "danhGiaTuan"
                      ? "danhgia"
                      : v === "baiTapTuan"
                      ? "baitap"
                      : v === "kiemTraDinhKi"
                      ? "kiemtra"
                      : v === "onTap"
                      ? "ontap"
                      : "",
                });
              }}
            >
              <FormControlLabel
                value="danhGiaTuan"
                control={<Radio />}
                label="Đánh giá tuần"
              />

              <FormControlLabel
                value="baiTapTuan"
                control={<Radio />}
                label="Bài tập tuần"
              />

              <FormControlLabel
                value="kiemTraDinhKi"
                control={<Radio />}
                label="Kiểm tra định kì"
              />

              <FormControlLabel
                value="onTap"
                control={<Radio />}
                label="Ôn tập"
              />
            </RadioGroup>
          </Box>

          {/* ===== RESULT SETTINGS ===== */}
          <Box
            sx={{
              p: 2,
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              bgcolor: "#fff",
            }}
          >
            <Typography fontWeight="bold" sx={{ mb: 1 }}>
              Hiển thị kết quả
            </Typography>

            <Stack spacing={0.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={config.choXemDiem || false}
                    onChange={(e) =>
                      updateFirestoreAndContext(
                        "choXemDiem",
                        e.target.checked
                      )
                    }
                  />
                }
                label="Cho xem điểm"
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={config.choXemDapAn || false}
                    onChange={(e) =>
                      updateFirestoreAndContext(
                        "choXemDapAn",
                        e.target.checked
                      )
                    }
                  />
                }
                label="Cho xem đáp án"
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={config.xuatFileBaiLam || false}
                    onChange={(e) =>
                      updateFirestoreAndContext(
                        "xuatFileBaiLam",
                        e.target.checked
                      )
                    }
                  />
                }
                label="Xuất file bài làm"
              />
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* ===== SNACKBAR ===== */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar((s) => ({
            ...s,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ===== BACKUP / RESTORE ===== */}
      

      {/* ===== CREATE DATA ===== */}
      <CreateDataConfirmDialog
        open={openCreateDataDialog}
        onClose={() =>
          setOpenCreateDataDialog(false)
        }
        configData={config}
      />
      </Card>
    )}

  </Box>
);

}
