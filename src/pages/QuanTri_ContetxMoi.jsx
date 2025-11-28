import React, { useState, useEffect, useContext, useRef } from "react";
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
  Dialog,
  DialogContent,
  Snackbar,
  IconButton,
} from "@mui/material";
import TextField from "@mui/material/TextField";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import BackupIcon from "@mui/icons-material/Backup";
import RestoreIcon from "@mui/icons-material/Restore";
import CloseIcon from "@mui/icons-material/Close";
import VpnKeyIcon from "@mui/icons-material/VpnKey";

import * as XLSX from "xlsx";
import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";
import { db } from "../firebase";

import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";

import { fetchAllBackup, exportBackupToJson } from "../utils/backupFirestore";
import { restoreAllFromJson } from "../utils/restoreFirestore";

export default function QuanTri() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [backupLoading, setBackupLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);

  const fileInputRef = useRef(null);

  const { classData, setClassData } = useContext(StudentContext);
  const { studentData, setStudentData } = useContext(StudentContext);

  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedSemester, setSelectedSemester] = useState("Giữa kỳ I");
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [subject, setSubject] = useState("Tin học");
  //const [timeInput, setTimeInput] = useState(0);

  const [studentScores, setStudentScores] = useState({}); 
  const [studentAnswers, setStudentAnswers] = useState({}); 

  // Password change states
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");

  const { config, setConfig } = useContext(ConfigContext);
  const [firestorePassword, setFirestorePassword] = useState(config?.pass || "");

  // Khởi tạo state với giá trị mặc định tạm thời
  const [timeInput, setTimeInput] = useState(1);
  const adminPermissions = {
    tracNghiem: config?.tracNghiem || false,
    kiemTraDinhKi: config?.kiemTraDinhKi || false,
    xemDiem: config?.xemDiem || false,
    xemDapAn: config?.xemDapAn || false,
    xuatBaiLam: config?.xuatBaiLam || false,
  };

  useEffect(() => {
    if (config?.pass) {
      setFirestorePassword(config.pass);
    }
  }, [config?.pass]);


  useEffect(() => {
    if (!config) return;
    setTimeInput(config.timeLimit || 1);
  }, [config]);

  const handlePermissionChange = (field) => async (e) => {
    const checked = e.target.checked;
    try {
      const newConfig = { ...config, [field]: checked };
      await setDoc(doc(db, "CONFIG", "config"), { [field]: checked }, { merge: true });
      setConfig(newConfig);
    } catch (err) {
      console.error("❌ Lỗi cập nhật Firestore:", err);
    }
  };


  const updateFirestoreAndContext = async (field, value) => {
    try {
      const newConfig = { ...config, [field]: value };
      await setDoc(doc(db, "CONFIG", "config"), newConfig, { merge: true });
      if (updateConfig) updateConfig(prev => ({ ...prev, [field]: value }));
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật Firestore:", err);
    }
  };


  useEffect(() => {
    const initConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : {};

        setSelectedWeek(data.tuan || 1);
        setSelectedSemester(data.hocKy || "Giữa kỳ I");
        setSubject(data.mon || "Tin học");

        let classList = [];
        if (classData && classData.length > 0) {
          classList = classData;
        } else {
          const snapshot = await getDocs(collection(db, "DANHSACH"));
          classList = snapshot.docs.map((doc) => doc.id);
          setClassData(classList);
        }
        setClasses(classList);

        setSelectedClass(data.lop && classList.includes(data.lop) ? data.lop : classList[0] || "");
      } catch (err) {
        console.error("❌ Lỗi khi khởi tạo cấu hình:", err);
      }
    };
    initConfig();
  }, [classData, setClassData]);

  const handleSemesterChange = (e) => {
    const newSemester = e.target.value;
    setSelectedSemester(newSemester);
    updateFirestoreAndContext("hocKy", newSemester);
  };

  const handleSubjectChange = (e) => {
    const newSubject = e.target.value;
    setSubject(newSubject);
    updateFirestoreAndContext("mon", newSubject);
  };

  const handleClassChange = (e) => {
    const newClass = e.target.value;
    setSelectedClass(newClass);
    updateFirestoreAndContext("lop", newClass);
  };

  const handleWeekChange = (e) => {
    const newWeek = e.target.value;
    setSelectedWeek(newWeek);
    updateFirestoreAndContext("tuan", newWeek);
  };

  const handleTimeLimitChange = (newValue) => {
    const value = Math.max(1, Number(newValue));
    setTimeInput(value);
    updateFirestoreAndContext("timeLimit", value);
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage("");
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setProgress(0);
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      await processStudentData(jsonData);
      setMessage("📥 Tải dữ liệu thành công!");
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi tải file.");
      setSuccess(false);
    }
    setLoading(false);
  };

  const processStudentData = async (jsonData) => {
    if (!selectedClass) return;
    const docRef = doc(db, "DANHSACH", selectedClass);
    const dataToSave = {};
    jsonData.forEach((item) => {
      if (item.maDinhDanh && item.hoVaTen) {
        dataToSave[item.maDinhDanh] = { hoVaTen: item.hoVaTen };
      }
    });
    await setDoc(docRef, dataToSave, { merge: true });
  };

  const handleBackup = async () => {
    try {
      setBackupProgress(0);
      setBackupLoading(true);
      setIsRestoring(false);
      setMessage("");
      setSuccess(false);

      const allData = await fetchAllBackup((progress) => setBackupProgress(progress));
      exportBackupToJson(allData);

      setMessage("✅ Sao lưu dữ liệu thành công!");
      setSuccess(true);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi sao lưu dữ liệu.");
      setSuccess(false);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setBackupLoading(false);
      setBackupProgress(0);
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setBackupProgress(0);
      setIsRestoring(true);
      setMessage("");
      setSuccess(false);

      const success = await restoreAllFromJson(file, (progress) => setBackupProgress(progress));

      setMessage(success ? "✅ Phục hồi dữ liệu thành công!" : "❌ Lỗi khi phục hồi dữ liệu.");
      setSuccess(success);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi phục hồi dữ liệu.");
      setSuccess(false);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsRestoring(false);
      setBackupLoading(false);
      setBackupProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [openChangePw, setOpenChangePw] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleChangePassword = async () => {
    if (!newPw.trim()) {
      setPwError("❌ Mật khẩu mới không được để trống!");
      return;
    }

    if (newPw !== confirmPw) {
      setPwError("❌ Mật khẩu nhập lại không khớp!");
      return;
    }

    try {
      await setDoc(doc(db, "CONFIG", "config"), { pass: newPw }, { merge: true });
      setFirestorePassword(newPw);
      if (updateConfig) updateConfig(prev => ({ ...prev, pass: newPw }));
      setPwError("");
      setOpenChangePw(false);
      setSnackbar({ open: true, message: "✅ Đổi mật khẩu thành công!", severity: "success" });
      setNewPw("");
      setConfirmPw("");
      setOldPw("");
    } catch (err) {
      console.error("❌ Lỗi lưu mật khẩu Firestore:", err);
      setPwError("❌ Lỗi khi lưu mật khẩu!");
      setSnackbar({ open: true, message: "❌ Lỗi khi lưu mật khẩu!", severity: "error" });
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
      <Card elevation={6} sx={{ p: 4, borderRadius: 3, maxWidth: 700, mx: "auto", mt: 3 }}>
        <Typography variant="h5" color="primary" fontWeight="bold" align="center" gutterBottom>
          ⚙️ QUẢN TRỊ HỆ THỐNG
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {/* Cột trái: cài đặt + checkbox */}
          <Box sx={{ flex: 1, minWidth: 280 }}>
            {/* Cài đặt hệ thống */}
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>⚙️ Cài đặt hệ thống</Typography>
            <Stack spacing={2} sx={{ mb: 4 }}>
              <FormControl size="small">
                <Select value={selectedSemester} onChange={handleSemesterChange}>
                  <MenuItem value="Giữa kỳ I">Giữa kỳ I</MenuItem>
                  <MenuItem value="Cuối kỳ I">Cuối kỳ I</MenuItem>
                  <MenuItem value="Giữa kỳ II">Giữa kỳ II</MenuItem>
                  <MenuItem value="Cả năm">Cả năm</MenuItem>
                </Select>
              </FormControl>

              {/* Hàng 1: Môn học + Lớp */}
              <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select value={subject} onChange={handleSubjectChange}>
                    <MenuItem value="Tin học">Tin học</MenuItem>
                    <MenuItem value="Công nghệ">Công nghệ</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select value={selectedClass} onChange={handleClassChange}>
                    {classes.map((cls) => <MenuItem key={cls} value={cls}>{cls}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              {/* Hàng 2: Tuần + Thời gian */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select value={selectedWeek} onChange={handleWeekChange}>
                    {[...Array(35)].map((_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>Tuần {i + 1}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Thời gian (phút)"
                  type="number"
                  size="small"
                  value={timeInput}
                  onChange={(e) => handleTimeLimitChange(e.target.value)}
                  InputLabelProps={{ style: { fontSize: 14 } }}
                  inputProps={{ min: 1, style: { textAlign: "center", fontSize: 15 } }}
                  sx={{ flex: 1 }}
                />
              </Box>

              <Stack spacing={0.5} sx={{ mb: 0 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config?.tracNghiem || false}
                      onChange={handlePermissionChange("tracNghiem")}
                      color="primary"
                    />
                  }
                  label="Bài tập tuần"
                  sx={{ mr: 0, '.MuiFormControlLabel-label': { fontSize: 15 } }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config?.kiemTraDinhKi || false}
                      onChange={handlePermissionChange("kiemTraDinhKi")}
                      color="primary"
                    />
                  }
                  label="Kiểm tra định kì"
                  sx={{ mr: 0, '.MuiFormControlLabel-label': { fontSize: 15 } }}
                />

                <Divider sx={{ mb: 3 }} />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config?.xemDiem || false}
                      onChange={handlePermissionChange("xemDiem")}
                    />
                  }
                  label="Cho phép xem điểm"
                  sx={{ mr: 0, '.MuiFormControlLabel-label': { fontSize: 16 } }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config?.xemDapAn || false}
                      onChange={handlePermissionChange("xemDapAn")}
                    />
                  }
                  label="Cho phép xem đáp án"
                  sx={{ mr: 0, '.MuiFormControlLabel-label': { fontSize: 16 } }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config?.xuatBaiLam || false}
                      onChange={handlePermissionChange("xuatBaiLam")}
                    />
                  }
                  label="Cho phép xuất bài làm"
                  sx={{ mr: 0, '.MuiFormControlLabel-label': { fontSize: 16 } }}
                />
              </Stack>
            </Stack>
          </Box>

          {/* Cột phải: danh sách học sinh + sao lưu/phục hồi */}
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>📤 Danh sách học sinh</Typography>
            <Stack spacing={2} sx={{ mb: 4 }}>
              <Button variant="outlined" component="label">
                Chọn file Excel
                <input type="file" hidden accept=".xlsx" onChange={handleFileChange} />
              </Button>
              {selectedFile && <Typography variant="body2">{selectedFile.name}</Typography>}
              <Button variant="contained" color="success" onClick={handleUpload} disabled={loading}>
                {loading ? `Đang tải... (${progress}%)` : "Tải danh sách"}
              </Button>

            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>💾 Sao lưu & phục hồi</Typography>
            <Stack spacing={2}>
              {!isRestoring && <Button variant="contained" color="primary" onClick={handleBackup} disabled={backupLoading}>Sao lưu dữ liệu</Button>}
              {!backupLoading && <Button variant="outlined" color="secondary" onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={isRestoring}>Phục hồi dữ liệu</Button>}
              {(backupLoading || isRestoring) && (
                <>
                  <LinearProgress variant="determinate" value={backupProgress} />
                  <Typography variant="body2" color="text.secondary" align="center">
                    {isRestoring ? `Đang phục hồi... ${backupProgress}%` : `Đang sao lưu... ${backupProgress}%`}
                  </Typography>
                </>
              )}
              <input type="file" hidden accept=".json" ref={fileInputRef} onChange={(e) => { handleRestore(e); e.target.value = ""; }} />
            </Stack>

            {/* Nút đổi mật khẩu */}
              <Button
                variant="outlined"
                startIcon={<VpnKeyIcon />}
                onClick={() => setOpenChangePw(true)}
              >
                Đổi mật khẩu
              </Button>
            </Stack>
          </Box>

        </Box>

        {message && <Alert sx={{ mt: 3 }} severity={success ? "success" : "error"}>{message}</Alert>}
      </Card>

      {/* Snackbar */}
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
      
          <Dialog
        open={openChangePw}
        onClose={(event, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
          setOpenChangePw(false);
        }}
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#fff",
            boxShadow: 6,
          },
        }}
      >
        {/* Thanh tiêu đề */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "#1976d2",
            color: "#fff",
            px: 2,
            py: 1.2,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: "bold", fontSize: "1.1rem", letterSpacing: 0.5 }}
          >
            ĐỔI MẬT KHẨU
          </Typography>
          <IconButton
            onClick={() => setOpenChangePw(false)}
            sx={{ color: "#fff", p: 0.6 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Nội dung */}
        <DialogContent sx={{ mt: 1, bgcolor: "#fff" }}>
          <Stack spacing={2} sx={{ pl: 2.5, pr: 2.5 }}>
            {/* Chỉ còn hai ô nhập mật khẩu */}
            <TextField
              label="Mật khẩu mới"
              type="password"
              fullWidth
              size="small"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <TextField
              label="Nhập lại mật khẩu"
              type="password"
              fullWidth
              size="small"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />

            {pwError && (
              <Typography color="error" sx={{ fontWeight: 600 }}>
                {pwError}
              </Typography>
            )}

            <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
              <Button onClick={() => setOpenChangePw(false)}>Hủy</Button>
              <Button variant="contained" onClick={handleChangePassword}>
                Lưu
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

    </Box>
  );
}
