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
  const [subject, setSubject] = useState("Tin học");

  // Load config từ context hoặc Firestore
  useEffect(() => {
    const initConfig = async () => {
      try {
        const docRef = doc(db, "CONFIG", "config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();

          // luôn set tuần và môn
          setSelectedWeek(data.tuan || 1);
          setSystemLocked(data.hethong === false);
          setSubject(data.mon || (data.congnghe ? "Công nghệ" : "Tin học"));

          setConfig(prev => ({
            ...prev,
            tuan: data.tuan || 1,
            hethong: data.hethong ?? false,
            congnghe: data.congnghe ?? false,
            mon: data.mon || (data.congnghe ? "Công nghệ" : "Tin học"),
          }));
        }
      } catch (err) {
        console.error("Lỗi lấy config từ Firestore:", err);
      }
    };
    initConfig();
  }, [setConfig]);


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

  const handleSubjectChange = async (e) => {
    const newSubject = e.target.value;
    const isCongNghe = newSubject === "Công nghệ";

    setSubject(newSubject);

    try {
      const docRef = doc(db, "CONFIG", "config");

      // 🔄 Ghi cả mon và congnghe lên Firestore
      await setDoc(docRef, {
        mon: newSubject,
        congnghe: isCongNghe,
      }, { merge: true });

      // 🔄 Cập nhật context đầy đủ
      setConfig(prev => ({
        ...prev,
        mon: newSubject,
        congnghe: isCongNghe,
      }));
    } catch (err) {
      console.error("❌ Lỗi cập nhật môn học:", err);
    }
  };

  // 🧩 Đồng bộ dữ liệu từ BANGDIEM → DGTX (ngay trong web)
{/*const handleSyncBangDiem1 = async () => {
  setLoading(true);
  setMessage("🔄 Đang đồng bộ dữ liệu từ DANHGIA...");
  setSuccess(false);
  setProgress(0);

  try {
    const danhGiaRef = collection(db, "DANHGIA");
    const weeksSnap = await getDocs(danhGiaRef);

    if (weeksSnap.empty) {
      setMessage("⚠️ Không có tuần nào trong DANHGIA để đồng bộ.");
      setLoading(false);
      return;
    }

    let processedWeeks = 0;

    for (const tuanDoc of weeksSnap.docs) {
      const tuanId = tuanDoc.id; // ví dụ: tuan_1
      const data = tuanDoc.data();

      const lopMap = {};

      // 🧩 Gom học sinh theo lớp
      for (const [key, value] of Object.entries(data)) {
        const parts = key.split(".");
        if (parts.length < 3) continue;
        const lop = `${parts[0]}.${parts[1]}`; // ví dụ: 4.1 hoặc 5.1_CN
        const hocSinhId = parts[2];

        if (!lopMap[lop]) lopMap[lop] = {};

        // 🧠 Map dữ liệu học sinh sang cấu trúc mới
        lopMap[lop][hocSinhId] = {
          hoVaTen: value.hoVaTen || "",
          dgtx: value.status || "",        // 🔄 chuyển status → dgtx
          dgtx_gv: value.dgtx_gv || "",
          nhanXet: value.nhanXet || "",
          thucHanh: value.thucHanh ?? null,
          tongCong: value.tongCong ?? null,
          tracNghiem: value.tracNghiem ?? null,
          xepLoai: value.xepLoai || ""
        };
      }

      // 🔥 Ghi từng lớp vào DGTX/[lop]/tuan/[tuan_x]
      for (const [lopId, hocSinhMap] of Object.entries(lopMap)) {
        const tuanRef = doc(db, `DGTX/${lopId}/tuan/${tuanId}`);
        await setDoc(tuanRef, hocSinhMap, { merge: true });
      }

      processedWeeks++;
      setProgress(Math.round((processedWeeks / weeksSnap.size) * 100));
    }

    setSuccess(true);
    setMessage(`✅ Đã đồng bộ thành công ${weeksSnap.size} tuần từ DANHGIA → DGTX.`);
  } catch (err) {
    console.error("❌ Lỗi khi đồng bộ dữ liệu:", err);
    setSuccess(false);
    setMessage("❌ Lỗi khi đồng bộ dữ liệu. Kiểm tra console để biết chi tiết.");
  } finally {
    setLoading(false);
  }
};*/}

const handleSyncBangDiem = async () => {
  setLoading(true);
  setMessage("🔄 Đang đồng bộ dữ liệu từ DANHGIA...");
  setSuccess(false);
  setProgress(0);

  try {
    const danhGiaRef = collection(db, "DANHGIA");
    const weeksSnap = await getDocs(danhGiaRef);

    if (weeksSnap.empty) {
      setMessage("⚠️ Không có tuần nào trong DANHGIA để đồng bộ.");
      setLoading(false);
      return;
    }

    let processedWeeks = 0;

    for (const tuanDoc of weeksSnap.docs) {
      const tuanId = tuanDoc.id; // ví dụ: tuan_1
      const data = tuanDoc.data();

      const lopMap = {};

      // 🧩 Gom học sinh theo lớp
      for (const [key, value] of Object.entries(data)) {
        const parts = key.split(".");
        if (parts.length < 3) continue;
        const lop = `${parts[0]}.${parts[1]}`; // ví dụ: 4.1 hoặc 5.2_CN

        // 🔹 Bỏ qua lớp 5.2_CN
        if (lop === "5.2_CN") continue;

        const hocSinhId = parts[2];

        if (!lopMap[lop]) lopMap[lop] = {};

        // 🧠 Map dữ liệu học sinh sang cấu trúc DGTX mới
        lopMap[lop][hocSinhId] = {
          hoVaTen: value.hoVaTen || "",
          status: value.status || "", // HS đánh giá
        };
      }

      // 🔥 Ghi từng lớp vào DGTX/[lop]/tuan/[tuan_x]
      for (const [lopId, hocSinhMap] of Object.entries(lopMap)) {
        const tuanRef = doc(db, `DGTX/${lopId}/tuan/${tuanId}`);
        await setDoc(tuanRef, hocSinhMap, { merge: true });
      }

      processedWeeks++;
      setProgress(Math.round((processedWeeks / weeksSnap.size) * 100));
    }

    setSuccess(true);
    setMessage(`✅ Đã đồng bộ thành công ${weeksSnap.size} tuần từ DANHGIA → DGTX.`);
  } catch (err) {
    console.error("❌ Lỗi khi đồng bộ dữ liệu:", err);
    setSuccess(false);
    setMessage("❌ Lỗi khi đồng bộ dữ liệu. Kiểm tra console để biết chi tiết.");
  } finally {
    setLoading(false);
  }
};


const handleSyncBangDiem1 = async () => {
  setLoading(true);
  setMessage("🔄 Đang đồng bộ dữ liệu từ DANHGIA...");
  setSuccess(false);
  setProgress(0);

  try {
    const danhGiaRef = collection(db, "DANHGIA");
    const weeksSnap = await getDocs(danhGiaRef);

    if (weeksSnap.empty) {
      setMessage("⚠️ Không có tuần nào trong DANHGIA để đồng bộ.");
      setLoading(false);
      return;
    }

    let processedWeeks = 0;

    for (const tuanDoc of weeksSnap.docs) {
      const tuanId = tuanDoc.id; // ví dụ: tuan_1
      const data = tuanDoc.data();

      const lopMap = {};

      // 🧩 Gom học sinh theo lớp
      for (const [key, value] of Object.entries(data)) {
        const parts = key.split(".");
        if (parts.length < 3) continue;
        const lop = `${parts[0]}.${parts[1]}`; // ví dụ: 4.1 hoặc 5.1_CN
        const hocSinhId = parts[2];

        if (!lopMap[lop]) lopMap[lop] = {};

        // 🧠 Map dữ liệu học sinh sang cấu trúc DGTX mới
        lopMap[lop][hocSinhId] = {
          hoVaTen: value.hoVaTen || "",
          status: value.status || "",             // HS đánh giá
        };
      }

      // 🔥 Ghi từng lớp vào DGTX/[lop]/tuan/[tuan_x]
      for (const [lopId, hocSinhMap] of Object.entries(lopMap)) {
        const tuanRef = doc(db, `DGTX/${lopId}/tuan/${tuanId}`);
        await setDoc(tuanRef, hocSinhMap, { merge: true });
      }

      processedWeeks++;
      setProgress(Math.round((processedWeeks / weeksSnap.size) * 100));
    }

    setSuccess(true);
    setMessage(`✅ Đã đồng bộ thành công ${weeksSnap.size} tuần từ DANHGIA → DGTX.`);
  } catch (err) {
    console.error("❌ Lỗi khi đồng bộ dữ liệu:", err);
    setSuccess(false);
    setMessage("❌ Lỗi khi đồng bộ dữ liệu. Kiểm tra console để biết chi tiết.");
  } finally {
    setLoading(false);
  }
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
          {/* 🔼 Môn học đặt lên trên */}
          <FormControl fullWidth size="small">
            <Select value={subject} onChange={handleSubjectChange}>
              <MenuItem value="Tin học">Tin học</MenuItem>
              <MenuItem value="Công nghệ">Công nghệ</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSyncBangDiem}
            disabled={loading}
          >
            {loading ? `🔄 Đang đồng bộ... (${progress}%)` : '🔁 Đồng bộ dữ liệu'}
          </Button>


          {/* 🔽 Lớp và tuần đặt xuống dưới */}
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
        </Stack>
      </Box>
    </Card>
  </Box>
);

}
