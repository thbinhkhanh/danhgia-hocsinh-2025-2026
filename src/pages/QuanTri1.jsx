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
  Grid,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import * as XLSX from 'xlsx';
import { doc, writeBatch, setDoc, getDoc, getDocs, collection } from "firebase/firestore";
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
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [systemLocked, setSystemLocked] = useState(false);

  const { classData, setClassData } = useContext(StudentContext);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [isCongNghe, setIsCongNghe] = useState(false);

  // Load config từ context hoặc Firestore
  useEffect(() => {
    const initConfig = async () => {
      if (config && (config.tuan !== undefined || config.congnghe !== undefined)) {
        setSelectedWeek(config.tuan || 1);
        setSystemLocked(config.hethong === false);
        setIsCongNghe(config.congnghe === true);
      } else {
        try {
          const docRef = doc(db, "CONFIG", "config");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSelectedWeek(data.tuan || 1);
            setSystemLocked(data.hethong === false);
            setIsCongNghe(data.congnghe === true);
            setConfig({
              tuan: data.tuan || 1,
              hethong: data.hethong ?? false,
              congnghe: data.congnghe === true,
            });
          }
        } catch (err) {
          console.error("Lỗi lấy config từ Firestore:", err);
        }
      }
    };
    initConfig();
  }, [config, setConfig]);

  // Lấy danh sách lớp
  useEffect(() => {
    const init = async () => {
      try {
        let classList = [];
        if (classData && classData.length > 0) {
          classList = classData;
        } else {
          const snapshot = await getDocs(collection(db, "DANHSACH"));
          classList = snapshot.docs.map(doc => doc.id);
          setClassData(classList);
        }
        setClasses(classList);

        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);
        let configData = { tuan: 1, hethong: false, lop: "" };
        if (docSnap.exists()) configData = docSnap.data();

        setConfig(configData);
        setSelectedWeek(configData.tuan || 1);
        setSystemLocked(configData.hethong === false);

        if (configData.lop && classList.includes(configData.lop)) {
          setSelectedClass(configData.lop);
        } else if (classList.length > 0) {
          setSelectedClass(classList[0]);
        }
      } catch (err) {
        console.error("❌ Lỗi load config hoặc lớp:", err);
        setClasses([]);
        setSelectedClass("");
      }
    };
    init();
  }, [setClassData, setConfig]);

  // Xử lý file Excel
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      setSelectedFile(file);
      setMessage('');
      setSuccess(false);
    } else {
      setSelectedFile(null);
      setMessage('❌ Vui lòng chọn đúng định dạng file Excel (.xlsx)');
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('❗ Chưa chọn file!');
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('🔄 Đang xử lý file...');
    setProgress(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(sheet['!ref']);

        const headerRow = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: 2, c: C });
          const cell = sheet[cellAddress];
          headerRow.push((cell?.v || '').toString().trim().toUpperCase());
        }

        const expectedHeaders = ['STT', 'MÃ ĐỊNH DANH', 'HỌ VÀ TÊN', 'LỚP'];
        const isValidHeader = headerRow.length === expectedHeaders.length &&
          expectedHeaders.every((title, index) => headerRow[index] === title);

        if (!isValidHeader) {
          setLoading(false);
          setSuccess(false);
          setMessage('❌ Tiêu đề file không hợp lệ. Hàng 3 phải là: STT, MÃ ĐỊNH DANH, HỌ VÀ TÊN, LỚP.');
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1, range: 3 });
        const formattedData = jsonData.map(row => {
          const obj = {};
          expectedHeaders.forEach((key, i) => { obj[key] = row[i] ?? ''; });
          return obj;
        });

        await processStudentData(formattedData);
      } catch (err) {
        console.error(err);
        setSuccess(false);
        setMessage('❌ Lỗi khi xử lý file Excel.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const processStudentData = async (jsonData) => {
    const studentCollection = "DANHSACH";
    const groupedByClass = {};
    jsonData.forEach(row => {
      const lop = row['LỚP']?.toString().trim().toUpperCase();
      const maDinhDanh = row['MÃ ĐỊNH DANH']?.toString().trim();
      if (!lop || !maDinhDanh) return;
      const student = { stt: row['STT'], maDinhDanh, hoVaTen: row['HỌ VÀ TÊN'], lop };
      if (!groupedByClass[lop]) groupedByClass[lop] = [];
      groupedByClass[lop].push(student);
    });

    let totalStudents = 0;
    let errorCount = 0;
    const allLopKeys = Object.keys(groupedByClass);
    const BATCH_LIMIT = 500;

    for (let i = 0; i < allLopKeys.length; i++) {
      const lop = allLopKeys[i];
      const students = groupedByClass[lop];
      totalStudents += students.length;
      setProgress(Math.round(((i + 1) / allLopKeys.length) * 100));

      for (let j = 0; j < students.length; j += BATCH_LIMIT) {
        const batch = writeBatch(db);
        const chunk = students.slice(j, j + BATCH_LIMIT);
        const classDocRef = doc(db, studentCollection, lop);
        const dataToMerge = {};
        chunk.forEach(student => {
          dataToMerge[student.maDinhDanh] = { hoVaTen: student.hoVaTen, stt: student.stt, lop: student.lop };
        });
        batch.set(classDocRef, dataToMerge, { merge: true });
        try { await batch.commit(); } catch { errorCount += chunk.length; }
      }
    }

    if (errorCount === 0) {
      setSuccess(true);
      setMessage(`✅ Đã thêm thành công ${totalStudents} học sinh.`);
      setSelectedFile(null);
    } else {
      setSuccess(false);
      setMessage(`⚠️ Có ${errorCount} học sinh lỗi.`);
    }
  };

  const handleWeekChange = async (e) => {
    const newWeek = e.target.value;
    setSelectedWeek(newWeek);

    try {
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, { tuan: newWeek }, { merge: true });
      setConfig(prev => ({ ...prev, tuan: newWeek }));
    } catch (err) {
      console.error("Lỗi cập nhật tuần:", err);
    }
  };

  const handleClassChange = async (e) => {
    const newClass = e.target.value;
    setSelectedClass(newClass);

    try {
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, { lop: newClass }, { merge: true });
      setConfig(prev => ({ ...prev, lop: newClass }));
    } catch (err) {
      console.error("Lỗi cập nhật lớp:", err);
    }
  };

  const handleCongNgheChange = async (e) => {
    const newCongNghe = e.target.checked;
    setIsCongNghe(newCongNghe);

    try {
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, { congnghe: newCongNghe }, { merge: true });
      setConfig(prev => ({ ...prev, congnghe: newCongNghe }));
    } catch (err) {
      console.error("❌ Lỗi cập nhật Công nghệ:", err);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#e3f2fd', pt: 3 }}>
      <Card
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 3,
          maxWidth: 660,
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

        <Grid container spacing={3} justifyContent="center">
          {/* Cột trái: upload file */}
          <Grid item>
            <Box sx={{ width: 300 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                📤 Danh sách học sinh
              </Typography>

              <Stack spacing={2}>
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
            </Box>
          </Grid>

          {/* Cột phải: cài đặt hệ thống */}
          <Grid item>
            <Box sx={{ width: 300 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                ⚙️ Cài đặt hệ thống
              </Typography>

              <Stack spacing={2}>
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

                {/* Checkbox Công nghệ */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isCongNghe}
                      onChange={handleCongNgheChange}
                    />
                  }
                  label="Công nghệ"
                />
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
}
