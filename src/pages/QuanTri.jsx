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
} from "@mui/material";
import TextField from "@mui/material/TextField";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import BackupIcon from "@mui/icons-material/Backup";
import RestoreIcon from "@mui/icons-material/Restore";
import * as XLSX from "xlsx";
import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ConfigContext } from "../context/ConfigContext";
import { StudentContext } from "../context/StudentContext";
import { fetchAllBackup, exportBackupToJson } from "../utils/backupFirestore";
import { restoreAllFromJson } from "../utils/restoreFirestore";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

export default function QuanTri() {
  // 🔹 File, thông báo, progress chung
const [selectedFile, setSelectedFile] = useState(null);
const [message, setMessage] = useState("");
const [success, setSuccess] = useState(false);
const [loading, setLoading] = useState(false);
const [progress, setProgress] = useState(0);

// 🔹 Thông báo riêng cho backup
const [backupMessage, setBackupMessage] = useState("");
const [backupSuccess, setBackupSuccess] = useState(false);

// 🔹 Riêng cho sao lưu
const [backupLoading, setBackupLoading] = useState(false);
const [backupProgress, setBackupProgress] = useState(0);

// 🔹 Riêng cho phục hồi
const [restoreMessage, setRestoreMessage] = useState("");
const [restoreLoading, setRestoreLoading] = useState(false);
const [restoreProgress, setRestoreProgress] = useState(0);
const [isRestoring, setIsRestoring] = useState(false);

// 🔹 Ref cho input file phục hồi
const fileInputRef = useRef(null);

// 🔹 Context & navigation
const navigate = useNavigate();
const { config, setConfig } = useContext(ConfigContext);
const { classData, setClassData } = useContext(StudentContext);
const { studentData, setStudentData } = useContext(StudentContext);

// 🔹 Chọn tuần, học kỳ, lớp, môn
const [selectedWeek, setSelectedWeek] = useState(1);
const [selectedSemester, setSelectedSemester] = useState("Giữa kỳ I");
const [classes, setClasses] = useState([]);
const [selectedClass, setSelectedClass] = useState("");
const [subject, setSubject] = useState("Tin học");

//const [isTracNghiem, setIsTracNghiem] = useState(false);


  // 🔹 Khởi tạo config + danh sách lớp
  useEffect(() => {
    const initConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : {};

        setConfig({
          tuan: data.tuan || 1,
          hocKy: data.hocKy || "Giữa kỳ I",
          mon: data.mon || "Tin học",
          lop: data.lop || "",
        });

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

  // 🔹 Cập nhật Firestore + Context
  const updateFirestoreAndContext = async (field, value) => {
    try {
      const newConfig = { ...config, [field]: value };
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, newConfig, { merge: true });
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

  // 🔹 File Excel
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

  // 🔹 SAO LƯU
  const handleBackup = async () => {
    try {
      // Reset trạng thái trước khi bắt đầu
      setBackupProgress(0);
      setBackupLoading(true);
      setIsRestoring(false); // đảm bảo UI hiển thị đúng
      setMessage("");
      setSuccess(false);

      // 🔹 Lấy dữ liệu backup toàn bộ và cập nhật tiến trình
      const allData = await fetchAllBackup((progress) => {
        setBackupProgress(progress);
      });

      // 🔹 Xuất ra file JSON
      exportBackupToJson(allData);

      setMessage("✅ Sao lưu dữ liệu thành công!");
      setSuccess(true);

      // Tự ẩn thông báo sau 3 giây
      setTimeout(() => setMessage(""), 3000);

    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi sao lưu dữ liệu.");
      setSuccess(false);
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setBackupLoading(false);
      setBackupProgress(0); // reset progress để lần sau có thể chạy lại
    }
  };

  // 🔹 PHỤC HỒI
  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Reset trạng thái trước khi bắt đầu phục hồi
      setBackupProgress(0);
      //setBackupLoading(true);
      setIsRestoring(true);
      setMessage("");
      setSuccess(false);

      const success = await restoreAllFromJson(file, (progress) => {
        setBackupProgress(progress);
      });

      if (success) {
        setMessage("✅ Phục hồi dữ liệu thành công!");
        setSuccess(true);
      } else {
        setMessage("❌ Lỗi khi phục hồi dữ liệu.");
        setSuccess(false);
      }

      // Tự ẩn thông báo sau 3 giây
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

      // Reset input để chọn lại cùng file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /*const increment = () => {
    if (!config.tracNghiem) return;
    const newValue = (timeInput || 1) + 1;
    setTimeInput(newValue);
    setConfig(prev => ({ ...prev, timeLimit: newValue }));
  };

  const decrement = () => {
    if (!config.tracNghiem) return;
    const newValue = Math.max(1, (timeInput || 1) - 1);
    setTimeInput(newValue);
    setConfig(prev => ({ ...prev, timeLimit: newValue }));
  };*/

  const [timeInput, setTimeInput] = useState(0);
  useEffect(() => {
    if (config.timeLimit !== undefined) {
      setTimeInput(config.timeLimit);
    }
  }, [config.timeLimit]);


  // 🔹 UI
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
      <Card
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          maxWidth: 320,
          mx: "auto",
          mt: 3,
          position: "relative",
        }}
      >
        <Typography
          variant="h5"
          color="primary"
          fontWeight="bold"
          align="center"
          gutterBottom
        >
          ⚙️ QUẢN TRỊ HỆ THỐNG
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {/* 📤 DANH SÁCH HỌC SINH */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          📤 Danh sách học sinh
        </Typography>

        <Stack spacing={2} sx={{ mb: 4 }}>
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
            Chọn file Excel
            <input type="file" hidden accept=".xlsx" onChange={handleFileChange} />
          </Button>

          {selectedFile && (
            <Typography variant="body2">📄 {selectedFile.name}</Typography>
          )}

          <Button
            variant="contained"
            color="success"
            startIcon={<CloudUploadIcon />}
            onClick={handleUpload}
            disabled={loading}
          >
            {loading ? `🔄 Đang tải... (${progress}%)` : "Tải danh sách"}
          </Button>
        </Stack>

        {/* ⚙️ CÀI ĐẶT HỆ THỐNG */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          ⚙️ Cài đặt hệ thống
        </Typography>

        <Stack spacing={2} sx={{ mb: 4 }}>
          <FormControl size="small">
            <Select value={selectedSemester} onChange={handleSemesterChange}>
              <MenuItem value="Giữa kỳ I">Giữa kỳ I</MenuItem>
              <MenuItem value="Cuối kỳ I">Cuối kỳ I</MenuItem>
              <MenuItem value="Giữa kỳ II">Giữa kỳ II</MenuItem>
              <MenuItem value="Cả năm">Cả năm</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <Select value={subject} onChange={handleSubjectChange}>
              <MenuItem value="Tin học">Tin học</MenuItem>
              <MenuItem value="Công nghệ">Công nghệ</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <Select value={selectedClass} onChange={handleClassChange}>
                {classes.map((cls) => (
                  <MenuItem key={cls} value={cls}>
                    {cls}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ flex: 1 }}>
              <Select value={selectedWeek} onChange={handleWeekChange}>
                {[...Array(35)].map((_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    Tuần {i + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>            
          </Box>
          
          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.tracNghiem || false}
                  onChange={(e) =>
                    setConfig(prev => ({ ...prev, tracNghiem: e.target.checked }))
                  }
                  color="primary"
                />
              }
              label="Làm trắc nghiệm"
            />

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TextField
                label="Thời gian (phút)"
                type="number"
                size="small"
                disabled={!config.tracNghiem}
                value={timeInput}
                onChange={(e) => handleTimeLimitChange(e.target.value)}
                inputProps={{ min: 1, style: { textAlign: "center", width: 100 } }}
              />
            </Box>

          </Box>
        </Stack>

        {/* 💾 SAO LƯU / PHỤC HỒI */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          💾 Sao lưu & phục hồi
        </Typography>

        <Stack spacing={2}>
          {/* Nút sao lưu: hiển thị khi không phục hồi */}
          {!isRestoring && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<BackupIcon />}
              onClick={handleBackup}
              disabled={backupLoading} // disable khi đang backup
            >
              Sao lưu dữ liệu
            </Button>
          )}

          {/* Nút phục hồi: hiển thị khi không sao lưu */}
          {!backupLoading && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<RestoreIcon />}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={isRestoring} // disable khi đang restore
            >
              Phục hồi dữ liệu
            </Button>
          )}

          {/* Thanh tiến trình */}
          {(backupLoading || isRestoring) && (
            <>
              <LinearProgress variant="determinate" value={backupProgress} />
              <Typography variant="body2" color="text.secondary" align="center">
                {isRestoring
                  ? `Đang phục hồi... ${backupProgress}%`
                  : `Đang sao lưu... ${backupProgress}%`}
              </Typography>
            </>
          )}

          {/* Input file cho phục hồi (ẩn) */}
          <input
            type="file"
            hidden
            accept=".json"
            ref={fileInputRef}
            onChange={(e) => {
              handleRestore(e);
              e.target.value = ""; // reset để có thể chọn lại cùng file
            }}
          />
        </Stack>

        {message && (
          <Alert sx={{ mt: 3 }} severity={success ? "success" : "error"}>
            {message}
          </Alert>
        )}
      </Card>
    </Box>
  );
}
