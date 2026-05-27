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

// ================= ROUTER =================
import { useNavigate } from "react-router-dom";

// ================= CONTEXT =================
import { ConfigContext } from "../context/ConfigContext";
import { StudentContext } from "../context/StudentContext";

// ================= COMPONENTS =================
import ChangePasswordDialog from "../dialog/ChangePasswordDialog";
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


  const handleChangePassword = () => {
    // Kiểm tra mật khẩu có trống hay khớp không
    if (!newPw || !confirmPw) {
      setPwError("Vui lòng nhập đầy đủ mật khẩu");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Mật khẩu không khớp");
      return;
    }

    // Hiển thị thông báo trước
    setSnackbar({
      open: true,
      message: "Đổi mật khẩu thành công ✅",
      severity: "success",
    });

    setPwError("");
    setOpenChangePw(false); // đóng dialog

    // Reset input mật khẩu
    const passwordToSave = newPw;
    setNewPw("");
    setConfirmPw("");

    // Cập nhật Firestore bất đồng bộ, không chặn UI
    (async () => {
      try {
        const updatedConfig = { ...config, pass: passwordToSave };
        await setDoc(doc(db, "CONFIG", "config"), updatedConfig, { merge: true });
        setConfig(updatedConfig);
      } catch (error) {
        console.error("Lỗi khi lưu mật khẩu vào Firestore:", error);
        // Có thể hiển thị Snackbar lỗi sau nếu muốn
        setSnackbar({
          open: true,
          message: "❌ Lỗi lưu mật khẩu, thử lại!",
          severity: "error",
        });
      }
    })();
  };

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
      <Card
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          maxWidth: 650,
          mx: "auto",
          mt: 3,
        }}
      >
        {/* Tiêu đề HỆ THỐNG bao phủ cả 2 cột */}
        <Typography
          variant="h5"
          color="primary"
          fontWeight="bold"
          align="center"
          gutterBottom
        >
          QUẢN TRỊ HỆ THỐNG
        </Typography>

        <Divider sx={{ mt: 3, mb: 3 }} />

        {/* Container 2 cột */}
        <Box sx={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Cột bên trái: Cấu hình hệ thống */}
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Cấu hình hệ thống
            </Typography>

            <Stack spacing={2} sx={{ mb: 4 }}>
              {/* Học kỳ */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select value={selectedSemester} onChange={handleSemesterChange}>
                    <MenuItem value="Giữa kỳ I">Giữa kỳ I</MenuItem>
                    <MenuItem value="Cuối kỳ I">Cuối kỳ I</MenuItem>
                    <MenuItem value="Giữa kỳ II">Giữa kỳ II</MenuItem>
                    <MenuItem value="Cuối năm">Cuối năm</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select value={selectedYear} onChange={handleYearChange}>
                    <MenuItem value="2025-2026">2025-2026</MenuItem>
                    <MenuItem value="2026-2027">2026-2027</MenuItem>
                    <MenuItem value="2027-2028">2027-2028</MenuItem>
                    <MenuItem value="2028-2029">2028-2029</MenuItem>
                    <MenuItem value="2029-2030">2029-2030</MenuItem>
                  </Select>
                </FormControl>
              </Box>


              {/* Môn / Lớp cùng 1 hàng */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select value={subject} onChange={handleSubjectChange}>
                    <MenuItem value="Tin học">Tin học</MenuItem>
                    <MenuItem value="Công nghệ">Công nghệ</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select value={selectedClass} onChange={handleClassChange}>
                    {classes.map((cls) => (
                      <MenuItem key={cls} value={cls}>
                        {cls}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Tuần / Thời gian cùng 1 hàng, chiều rộng giống Môn / Lớp */}
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select value={selectedWeek} onChange={handleWeekChange}>
                    {(
                      selectedSemester === "Giữa kỳ I" ||
                      selectedSemester === "Cuối kỳ I"
                        ? Array.from({ length: 18 }, (_, i) => i + 1) // 1 → 18
                        : Array.from({ length: 17 }, (_, i) => i + 19) // 19 → 35
                    ).map((week) => (
                      <MenuItem key={week} value={week}>
                        Tuần {week}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Thời gian (phút)"
                  type="number"
                  size="small"
                  //disabled={!config.baiTapTuan}
                  value={timeInput}
                  onChange={(e) => handleTimeLimitChange(e.target.value)}
                  sx={{ flex: 1 }} // bằng chiều rộng Lớp
                  inputProps={{ min: 1, style: { textAlign: "center" } }}
                />
              </Box>

              {/* Các checkbox */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {/* 🔒 Khóa hệ thống */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.khoaHeThong || false}
                      onChange={(e) =>
                        updateFirestoreAndContext("khoaHeThong", e.target.checked)
                      }
                      color="error"
                    />
                  }
                  label="Khóa hệ thống"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.hienThiTenGanDay || false}
                      onChange={(e) =>
                        updateFirestoreAndContext("hienThiTenGanDay", e.target.checked)
                      }
                      color="primary"
                    />
                  }
                  label="Hiển thị tên gần đây"
                />
                
                <Divider sx={{ mt: 1, mb: 1 }} />  
                              
                <FormControl>
                  {/*<FormLabel>Chọn loại đánh giá</FormLabel>*/}

                  <RadioGroup
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
                      const newState = {
                        danhGiaTuan: v === "danhGiaTuan",
                        baiTapTuan: v === "baiTapTuan",
                        kiemTraDinhKi: v === "kiemTraDinhKi",
                        onTap: v === "onTap",
                        examType: v === "onTap" ? "ontap" : config.examType,
                      };
                      setConfig(newState);
                    }}
                  >
                    <FormControlLabel
                      value="danhGiaTuan"
                      control={<Radio color="primary" />}
                      label="Đánh giá tuần"
                    />
                    <FormControlLabel
                      value="baiTapTuan"
                      control={<Radio color="primary" />}
                      label="Bài tập tuần"
                    />
                    <FormControlLabel
                      value="kiemTraDinhKi"
                      control={<Radio color="primary" />}
                      label="Kiểm tra định kì"
                    />
                    <FormControlLabel
                      value="onTap"
                      control={<Radio color="primary" />}
                      label="Ôn tập"
                    />
                  </RadioGroup>
                </FormControl>

                <Divider sx={{ mt: 1, mb: 1 }} />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.choXemDiem || false}
                      onChange={(e) =>
                        updateFirestoreAndContext("choXemDiem", e.target.checked)
                      }
                      color="primary"
                    />
                  }
                  label="Cho xem điểm"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.choXemDapAn || false}
                      onChange={(e) =>
                        updateFirestoreAndContext("choXemDapAn", e.target.checked)
                      }
                      color="primary"
                    />
                  }
                  label="Cho xem đáp án"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.xuatFileBaiLam || false}
                      onChange={(e) =>
                        updateFirestoreAndContext("xuatFileBaiLam", e.target.checked)
                      }
                      color="primary"
                    />
                  }
                  label="Xuất file bài làm"
                />
              </Box>
            </Stack>
          </Box>

          {/* Cột bên phải: Quản trị dữ liệu */}
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Quản trị dữ liệu
            </Typography>

            {/* Quản trị dữ liệu */}
            <Stack spacing={2.5} sx={{ mb: 4 }}>
              {/* 📤 DANH SÁCH HỌC SINH */}
              {/*<Button
                variant="contained"
                color="success"
                startIcon={<CloudUploadIcon />}
                onClick={() => setOpenUploadPage(true)}
              >
                Tải danh sách năm mới
              </Button>*/}

              <Button
                variant="contained"
                color="success"
                startIcon={<AutorenewIcon />}
                onClick={() => setOpenCreateDataDialog(true)}
              >
                KHỞI TẠO DỮ LIỆU NĂM MỚI
              </Button>

              {/* Thanh tiến trình
              {loading && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography
                    variant="body2"
                    sx={{ mt: 0.5, textAlign: "center", fontWeight: 500 }}
                  >
                    {message} ({progress}%)
                  </Typography>
                </Box>
              )}*/}

              <Divider sx={{ mt: 1, mb: 1 }} />  

              {/* 💾 SAO LƯU / PHỤC HỒI */}
              <Button
                variant="contained"
                color="primary"
                startIcon={<BackupIcon />}
                onClick={() => setOpenBackupDialog(true)}
              >
                Sao lưu dữ liệu
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                startIcon={<RestoreIcon />}
                onClick={() => setOpenRestoreDialog(true)}
                sx={{
                  bgcolor: "#f44336",
                  color: "#fff",
                  borderColor: "#f44336",
                  "&:hover": { bgcolor: "#d32f2f", borderColor: "#d32f2f" },
                }}
              >
                Phục hồi dữ liệu
              </Button>
              
              <Divider sx={{ mt: 1, mb: 1 }} />  

              {/* Nút Đổi mật khẩu */}
              <Button
                variant="outlined"
                color="warning"
                startIcon={<LockResetIcon />}
                onClick={() => setOpenChangePw(true)}
                sx={{
                  bgcolor: "#ff9800",
                  color: "#fff",
                  borderColor: "#ff9800",
                  "&:hover": { bgcolor: "#f57c00", borderColor: "#f57c00" },
                }}
              >
                Đổi mật khẩu
              </Button>
            </Stack>

          </Box>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert severity={snackbar.severity} variant="filled">
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Dialog Đổi mật khẩu */}
        <ChangePasswordDialog
          open={openChangePw}
          onClose={() => setOpenChangePw(false)}
          newPw={newPw}
          setNewPw={setNewPw}
          confirmPw={confirmPw}
          setConfirmPw={setConfirmPw}
          pwError={pwError}
          handleChangePassword={handleChangePassword}
        />

        <BackupPage
          open={openBackupDialog}
          onClose={() => setOpenBackupDialog(false)}
        />
        <RestorePage
          open={openRestoreDialog}
          onClose={() => setOpenRestoreDialog(false)}
        />

        {/* Trang Upload danh sách riêng */}
        {/*<UploadPage
          open={openUploadPage}
          onClose={() => setOpenUploadPage(false)}
          selectedClass={selectedClass}
        />*/}
      </Card>

      <CreateDataConfirmDialog
        open={openCreateDataDialog} // chỉ cần open
        onClose={() => setOpenCreateDataDialog(false)}
        configData={config}
      />
    </Box>
  );

}
