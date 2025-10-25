import React, { useState, useEffect, useContext } from "react";
import { Box, Typography, MenuItem, Select, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, IconButton, Tooltip } from "@mui/material";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, setDoc, onSnapshot } from "firebase/firestore";
import { exportDanhsach } from "../utils/exportDanhSach";
import { inDanhSach } from "../utils/InDanhSach";

import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";

export default function DanhSachHS() {
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);

  // 🔹 Lấy config realtime
  useEffect(() => {
    const docRef = doc(db, "CONFIG", "config");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lopConfig = data.lop || "";
        setSelectedClass(lopConfig);
        setConfig((prev) => ({ ...prev, lop: lopConfig }));
      }
    });
    return () => unsubscribe();
  }, [setConfig]);

  // 🔹 Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const snapshot = await getDocs(collection(db, "DANHSACH"));
        const classList = snapshot.docs.map((doc) => doc.id);
        setClassData(classList);
        setClasses(classList);
        if (classList.length > 0) {
          setSelectedClass((prev) => prev || config.lop || classList[0]);
        }
      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách lớp:", err);
        setClasses([]);
        setClassData([]);
      }
    };
    fetchClasses();
  }, [config.lop, setClassData]);

  // 🔹 Lấy danh sách học sinh
  useEffect(() => {
  if (!selectedClass) return;

  // Hàm so sánh từng chữ từ phải sang trái
  const compareFullNamesRightToLeft = (a, b) => {
    const partsA = a.hoVaTen.replace(/\//g, " ").trim().split(/\s+/);
    const partsB = b.hoVaTen.replace(/\//g, " ").trim().split(/\s+/);
    const len = Math.max(partsA.length, partsB.length);

    for (let i = 1; i <= len; i++) { // bắt đầu từ cuối
      const wordA = partsA[partsA.length - i] || "";
      const wordB = partsB[partsB.length - i] || "";
      const cmp = wordA.localeCompare(wordB, "vi", { sensitivity: "base" });
      if (cmp !== 0) return cmp;
    }

    return 0;
  };

  // Lấy dữ liệu từ cache nếu có
  const cached = studentData[selectedClass];
  if (cached && cached.length > 0) {
    const sorted = [...cached].sort(compareFullNamesRightToLeft).map((stu, idx) => ({
      ...stu,
      stt: idx + 1,
    }));
    setStudents(sorted);
    return;
  }

  // Nếu chưa có cache, fetch từ Firestore
  const fetchStudents = async () => {
    try {
      const classDocRef = doc(db, "DANHSACH", selectedClass);
      const classSnap = await getDoc(classDocRef);

      if (!classSnap.exists()) {
        setStudents([]);
        setStudentData((prev) => ({ ...prev, [selectedClass]: [] }));
        return;
      }

      const data = classSnap.data();
      let studentList = Object.entries(data).map(([maDinhDanh, info]) => ({
        maDinhDanh,
        hoVaTen: info.hoVaTen,
        ghiChu: "",
      }));

      // 🔹 Sắp xếp theo từng chữ từ phải sang trái
      studentList.sort(compareFullNamesRightToLeft);

      // Thêm STT
      studentList = studentList.map((stu, idx) => ({ ...stu, stt: idx + 1 }));

      // Cập nhật cache và state
      setStudentData((prev) => ({ ...prev, [selectedClass]: studentList }));
      setStudents(studentList);
    } catch (err) {
      console.error(`❌ Lỗi khi lấy học sinh lớp "${selectedClass}":`, err);
      setStudents([]);
    }
  };

  fetchStudents();
}, [selectedClass, studentData, setStudentData]);


  {/*const handleClassChange = async (e) => {
    const newClass = e.target.value;
    setSelectedClass(newClass);
    try {
      const docRef = doc(db, "CONFIG", "config");
      await setDoc(docRef, { lop: newClass }, { merge: true });
      setConfig(prev => ({ ...prev, lop: newClass }));
    } catch (err) {
      console.error("❌ Lỗi cập nhật lớp:", err);
    }
  };*/}
  
  const handleClassChange = (e) => {
    const newClass = e.target.value;
    setSelectedClass(newClass); // chỉ cập nhật state local
    };

  return (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
      pt: 3,
      px: 3,
    }}
  >
    <Paper
      elevation={6}
      sx={{
        p: 4,
        borderRadius: 3,
        width: "100%",
        maxWidth: 800,
        bgcolor: "white",
        position: "relative", // ✅ để đặt icon tuyệt đối
      }}
    >
      {/* 🔹 Nhóm icon ở góc trên trái */}
      <Box
        sx={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          gap: 1, // khoảng cách giữa 2 icon
        }}
      >
        {/* Xuất Excel */}
        <Tooltip title="Xuất danh sách Excel">
          <IconButton
            onClick={() => exportDanhsach(selectedClass)}
            sx={{
              color: "#1976d2",
              backgroundColor: "rgba(25,118,210,0.1)",
              "&:hover": { backgroundColor: "rgba(25,118,210,0.2)" },
            }}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>

        {/* In danh sách */}
        <Tooltip title="In danh sách học sinh">
          <IconButton
            onClick={() => inDanhSach(selectedClass)}
            sx={{
              color: "#2e7d32",
              backgroundColor: "rgba(46,125,50,0.1)",
              "&:hover": { backgroundColor: "rgba(46,125,50,0.2)" },
            }}
          >
            <PrintIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tiêu đề */}
      <Box sx={{ textAlign: "center", mb: 2 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: "#1976d2" }}>
          DANH SÁCH HỌC SINH
        </Typography>
      </Box>

      {/* Dropdown chọn lớp */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mb: 4,
          gap: 1,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          Lớp:
        </Typography>
        <Select
          value={selectedClass}
          onChange={handleClassChange}
          size="small"
          sx={{ width: 80, height: 40 }}
        >
          {classes.map((cls) => (
            <MenuItem key={cls} value={cls}>
              {cls}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Bảng học sinh */}
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
          <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ height: 36 }}>
                <TableCell
                  sx={{
                    bgcolor: "#1976d2",
                    color: "#ffffff",
                    textAlign: "center",
                    borderRight: "1px solid rgba(0,0,0,0.12)",
                    width: 50,
                  }}
                >
                  STT
                </TableCell>
                <TableCell
                  sx={{
                    bgcolor: "#1976d2",
                    color: "#ffffff",
                    textAlign: "center",
                    borderRight: "1px solid rgba(0,0,0,0.12)",
                    width: 120,
                  }}
                >
                  MÃ ĐỊNH DANH
                </TableCell>
                <TableCell
                  sx={{
                    bgcolor: "#1976d2",
                    color: "#ffffff",
                    textAlign: "center",
                    borderRight: "1px solid rgba(0,0,0,0.12)",
                    width: 200,
                  }}
                >
                  HỌ VÀ TÊN
                </TableCell>
                <TableCell
                  sx={{
                    bgcolor: "#1976d2",
                    color: "#ffffff",
                    textAlign: "center",
                    width: 250,
                  }}
                >
                  GHI CHÚ
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map((student) => (
                <TableRow key={student.maDinhDanh} sx={{ height: 32 }}>
                  <TableCell
                    sx={{
                      px: 1,
                      textAlign: "center",
                      border: "1px solid rgba(0,0,0,0.12)",
                      width: 50,
                    }}
                  >
                    {student.stt}
                  </TableCell>
                  <TableCell
                    sx={{
                      px: 1,
                      textAlign: "center",
                      border: "1px solid rgba(0,0,0,0.12)",
                      width: 120,
                    }}
                  >
                    {student.maDinhDanh}
                  </TableCell>
                  <TableCell
                    sx={{
                      px: 1,
                      textAlign: "left",
                      border: "1px solid rgba(0,0,0,0.12)",
                      width: 200,
                    }}
                  >
                    {student.hoVaTen}
                  </TableCell>
                  <TableCell
                    sx={{
                      px: 1,
                      textAlign: "center",
                      border: "1px solid rgba(0,0,0,0.12)",
                      width: 250,
                    }}
                  >
                    {student.ghiChu}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Paper>
  </Box>
);

}
