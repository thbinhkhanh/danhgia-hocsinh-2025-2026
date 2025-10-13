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
  InputLabel,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
  Tooltip,
  Checkbox,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LogoutIcon from '@mui/icons-material/Logout';
import * as XLSX from 'xlsx';
import { doc, writeBatch, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ConfigContext } from "../context/ConfigContext";
import { StudentContext } from "../context/StudentContext";
import { exportEvaluationToExcel } from "../utils/exportExcel"; 

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

  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(1);

  const [isGiaoVien, setIsGiaoVien] = useState(false);
  const [isCongNghe, setIsCongNghe] = useState(false);

  // ✅ Khi load component, ưu tiên dùng context; nếu trống thì fetch từ Firestore
useEffect(() => {
  const initConfig = async () => {
    if (
      config &&
      (config.tuan !== undefined || config.giaovien !== undefined || config.congnghe !== undefined)
    ) {
      // 🔹 Load từ context (ưu tiên)
      setSelectedWeek(config.tuan || 1);
      setSystemLocked(config.hethong === false);
      setIsGiaoVien(config.giaovien === true);
      setIsCongNghe(config.congnghe === true);
    } else {
      // 🔹 Nếu chưa có context thì fetch từ Firestore
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();

          // Cập nhật state local
          setSelectedWeek(data.tuan || 1);
          setSystemLocked(data.hethong === false);
          setIsGiaoVien(data.giaovien === true);
          setIsCongNghe(data.congnghe === true);

          // Lưu lại vào context để tái sử dụng lần sau
          setConfig({
            tuan: data.tuan || 1,
            hethong: data.hethong ?? false,
            giaovien: data.giaovien === true,
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


  // 🔹 Lấy danh sách lớp: ưu tiên context, fallback Firestore
  useEffect(() => {
    const init = async () => {
      try {
        // 1️⃣ Lấy danh sách lớp
        let classList = [];
        if (classData && classData.length > 0) {
          classList = classData;
        } else {
          const snapshot = await getDocs(collection(db, "DANHSACH"));
          classList = snapshot.docs.map(doc => doc.id);
          setClassData(classList);
        }
        setClasses(classList);

        // 2️⃣ Lấy config
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);
        let configData = { tuan: 1, hethong: false, lop: "" };
        if (docSnap.exists()) {
          configData = docSnap.data();
        }
        setConfig(configData);
        setSelectedWeek(configData.tuan || 1);
        setSystemLocked(configData.hethong === false);

        // 3️⃣ Chọn lớp mặc định
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

  // --- Xử lý file Excel ---
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

  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("account");
    navigate("/home");
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
      await setDoc(docRef, { lop: newClass }, { merge: true }); // lưu vào field 'lop'
      setConfig(prev => ({ ...prev, lop: newClass })); // cập nhật context
    } catch (err) {
      console.error("Lỗi cập nhật lớp:", err);
    }
  };

  const handleGiaoVienChange = async (e) => {
    const newGiaoVien = e.target.checked;
    setIsGiaoVien(newGiaoVien);

    try {
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, { giaovien: newGiaoVien }, { merge: true });

      // ✅ Cập nhật context (sau khi Firestore lưu thành công)
      setConfig(prev => ({
        ...prev,
        giaovien: newGiaoVien
      }));

      //console.log("✅ Đã cập nhật trạng thái Giáo viên:", newGiaoVien);
    } catch (err) {
      console.error("❌ Lỗi cập nhật Giáo viên:", err);
    }
  };

  const handleCongNgheChange = async (e) => {
    const newCongNghe = e.target.checked;
    setIsCongNghe(newCongNghe);

    try {
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, { congnghe: newCongNghe }, { merge: true });

      // ✅ Cập nhật context (sau khi Firestore lưu thành công)
      setConfig(prev => ({
        ...prev,
        congnghe: newCongNghe
      }));

      //console.log("✅ Đã cập nhật trạng thái Công nghệ:", newCongNghe);
    } catch (err) {
      console.error("❌ Lỗi cập nhật Công nghệ:", err);
    }
  };


  const toggleSystemLock = async () => {
    const newState = !systemLocked;
    setSystemLocked(newState);

    try {
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, { hethong: !newState }, { merge: true });
      setConfig(prev => ({ ...prev, hethong: !newState }));
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái hệ thống:", err);
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
      {/* Nút Close */}
      <Tooltip title="Đăng xuất" arrow>
        <Button
          onClick={handleLogout}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            minWidth: 'auto',
            padding: 0.5,
            color: 'red',
          }}
        >
          <LogoutIcon />
        </Button>
      </Tooltip>

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
        {/* Cột trái */}
        <Grid item>
          <Box sx={{ width: 300 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
              📤 Danh sách học sinh
            </Typography>

            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Tuần từ</InputLabel>
                  <Select
                    value={weekFrom}
                    label="Tuần từ"
                    onChange={(e) => setWeekFrom(Number(e.target.value))}
                  >
                    {[...Array(35)].map((_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        Tuần {i + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Đến tuần</InputLabel>
                  <Select
                    value={weekTo}
                    label="Đến tuần"
                    onChange={(e) => setWeekTo(Number(e.target.value))}
                  >
                    {[...Array(35)].map((_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        Tuần {i + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {/* Checkbox Giáo viên */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isGiaoVien}
                    onChange={handleGiaoVienChange} // dùng handler mới
                  />
                }
                label="Giáo viên"
              />

              {/* Nút xuất đánh giá */}
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadFileIcon />}
                onClick={() => exportEvaluationToExcel(weekFrom, weekTo)}
                fullWidth
              >
                Xuất đánh giá
              </Button>

              <Divider sx={{ mt: 2.5, mb: 2 }} />

              {/* Chọn file Excel */}
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

        {/* Cột phải */}
        <Grid item>
          <Box sx={{ width: 300 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
              ⚙️ Cài đặt hệ thống
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Tuần</InputLabel>
                  <Select value={selectedWeek} onChange={handleWeekChange} label="Tuần">
                    {[...Array(35)].map((_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        Tuần {i + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Lớp</InputLabel>
                  <Select value={selectedClass} onChange={handleClassChange} label="Lớp">
                    {classes.map((cls) => (
                      <MenuItem key={cls} value={cls}>
                        {cls}
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

              {/* Nút Đánh giá HS */}
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => navigate("/giaovien")}
              >
                📝 Đánh giá HS
              </Button>

              <Divider sx={{ mt: 2.5, mb: 2 }} />

              {/* Nút Tổng hợp đánh giá */}
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={() => navigate("/tonghopdanhgia")}
              >
                🗂️ Tổng hợp đánh giá
              </Button>

            </Stack>
          </Box>
        </Grid>

      </Grid>
    </Card>
  </Box>
);

}
