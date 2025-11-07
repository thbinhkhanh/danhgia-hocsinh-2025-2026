// src/pages/QuanTri.jsx
import React, { useState, useEffect, useContext } from 'react';
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
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import * as XLSX from 'xlsx';
import { doc, setDoc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ConfigContext } from "../context/ConfigContext";
import { StudentContext } from "../context/StudentContext";

export default function QuanTri() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const navigate = useNavigate();
  const { config, setConfig } = useContext(ConfigContext);
  const { classData, setClassData } = useContext(StudentContext);

  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedSemester, setSelectedSemester] = useState("Giữa kỳ I");
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [subject, setSubject] = useState("Tin học");

  // 🔹 Khởi tạo config + danh sách lớp
  useEffect(() => {
    const initConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : {};

        // Cập nhật context trực tiếp
        setConfig(prev => ({
          ...prev,
          tuan: data.tuan || 1,
          hocKy: data.hocKy || "Giữa kỳ I",
          mon: data.mon || "Tin học",
          lop: data.lop || "",
        }));

        // Cập nhật state local
        setSelectedWeek(data.tuan || 1);
        setSelectedSemester(data.hocKy || "Giữa kỳ I");
        setSubject(data.mon || "Tin học");

        // Lấy danh sách lớp
        let classList = [];
        if (classData && classData.length > 0) {
          classList = classData;
        } else {
          const snapshot = await getDocs(collection(db, "DANHSACH"));
          classList = snapshot.docs.map(doc => doc.id);
          setClassData(classList);
        }
        setClasses(classList);

        // Chọn lớp hiện tại
        if (data.lop && classList.includes(data.lop)) {
          setSelectedClass(data.lop);
        } else if (classList.length > 0) {
          setSelectedClass(classList[0]);
          setConfig(prev => ({ ...prev, lop: classList[0] }));
        }
      } catch (err) {
        console.error("❌ Lỗi khi khởi tạo cấu hình:", err);
      }
    };
    initConfig();
  }, [classData, setClassData]); // Bỏ setConfig khỏi dependency


  // 🔹 Helper cập nhật Firestore + context
  const updateConfig = async (field, value) => {
    try {
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, { [field]: value }, { merge: true }); // object đúng
      setConfig(prev => ({ ...prev, [field]: value })); // cập nhật context
    } catch (err) {
      console.error(`❌ Lỗi khi cập nhật Firestore:`, err);
    }
  };


  // 🔹 Handle thay đổi
  const handleSemesterChange = (e) => {
    const newSemester = e.target.value;
    setSelectedSemester(newSemester);
    updateConfig("hocKy", newSemester);
  };

  const handleSubjectChange = (e) => {
    const newSubject = e.target.value;
    console.log("Chọn môn mới:", newSubject);
    setSubject(newSubject);
    updateConfig("mon", newSubject);
  };

  const handleClassChange = (e) => {
    const newClass = e.target.value;
    setSelectedClass(newClass);
    updateConfig("lop", newClass);
  };

  const handleWeekChange = (e) => {
    const newWeek = e.target.value;
    setSelectedWeek(newWeek);
    updateConfig("tuan", newWeek);
  };

  // 🔹 File Excel
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage('');
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
      setMessage('📥 Tải dữ liệu thành công!');
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setMessage('❌ Lỗi khi tải file.');
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

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#e3f2fd', pt: 3 }}>
      <Card
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          maxWidth: 300,
          mx: 'auto',
          mt: 3,
          position: 'relative',
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

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ width: "100%", maxWidth: 400, mx: "auto" }}>
          {/* 📤 Danh sách học sinh */}
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
            📤 Danh sách học sinh
          </Typography>

          <Stack spacing={2} sx={{ mb: 5 }}>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              Chọn file Excel
              <input type="file" hidden accept=".xlsx" onChange={handleFileChange} />
            </Button>

            {selectedFile && (
              <Typography variant="body2">📄 File đã chọn: {selectedFile.name}</Typography>
            )}

            <Button
              variant="contained"
              color="success"
              startIcon={<CloudUploadIcon />}
              onClick={handleUpload}
              disabled={loading}
            >
              {loading ? `🔄 Đang tải... (${progress}%)` : 'Tải danh sách'}
            </Button>

            {loading && <LinearProgress variant="determinate" value={progress} />}

            {message && (
              <Alert severity={success ? 'success' : loading ? 'info' : 'error'}>
                {message}
              </Alert>
            )}
          </Stack>

          {/* ⚙️ Cài đặt hệ thống */}
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
            ⚙️ Cài đặt hệ thống
          </Typography>

          <Stack spacing={2}>
            {/* 🆕 Học kỳ */}
            <FormControl size="small" sx={{ flex: 1 }}>
              <Select value={selectedSemester} onChange={handleSemesterChange}>
                <MenuItem value="Giữa kỳ I">Giữa kỳ I</MenuItem>
                <MenuItem value="Cuối kỳ I">Cuối kỳ I</MenuItem>
                <MenuItem value="Giữa kỳ II">Giữa kỳ II</MenuItem>
                <MenuItem value="Cả năm">Cả năm</MenuItem>
              </Select>
            </FormControl>

            {/* 🔼 Môn học */}
            <FormControl fullWidth size="small">
              <Select value={subject} onChange={handleSubjectChange}>
                <MenuItem value="Tin học">Tin học</MenuItem>
                <MenuItem value="Công nghệ">Công nghệ</MenuItem>
              </Select>
            </FormControl>

            {/* 🔽 Lớp + Tuần */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <Select value={selectedClass} onChange={handleClassChange}>
                  {classes.map(cls => (
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
          </Stack>
        </Box>
      </Card>
    </Box>
  );
}
