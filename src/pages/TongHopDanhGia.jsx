import React, { useState, useEffect, useContext } from "react";
import {
  Box, Card, Typography, Divider, Stack,
  FormControl, Select, MenuItem,
  Checkbox, FormControlLabel, Table,
  TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper
} from "@mui/material";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
//import { doc, getDoc, getDocs } from "firebase/firestore";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";


export default function TongHopDanhGia() {
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isCongNghe, setIsCongNghe] = useState(false);

  // Lấy config tuần & công nghệ (chỉ hiển thị)
  useEffect(() => {
    const fetchConfig = async () => {
      const docRef = doc(db, "CONFIG", "config");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSelectedWeek(data.tuan || 1);
        setIsCongNghe(data.congnghe || false);
        setConfig(data);
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


  // Lấy danh sách học sinh 
useEffect(() => {
  if (!selectedClass) return;

  const fetchStudentsAndStatus = async () => {
    try {
      // 1️⃣ Lấy danh sách học sinh từ DANHSACH
      const classDocRef = doc(db, "DANHSACH", selectedClass);
      const classSnap = await getDoc(classDocRef);
      if (!classSnap.exists()) {
        setStudents([]);
        setStudentData(prev => ({ ...prev, [selectedClass]: [] }));
        return;
      }

      const studentsData = classSnap.data();
      let studentList = Object.entries(studentsData).map(([maDinhDanh, info]) => ({
        maDinhDanh,
        hoVaTen: info.hoVaTen || "",
        statusByWeek: {},
      }));

      // 2️⃣ Lấy tất cả tuần trong DANHGIA
      const weeksSnapshot = await getDocs(collection(db, "DANHGIA"));

      for (const weekDoc of weeksSnapshot.docs) {
        const weekId = weekDoc.id; // ví dụ: tuan_4
        const weekData = weekDoc.data();

        // Duyệt qua tất cả key trong document (mỗi key là 1 học sinh)
        for (const [key, value] of Object.entries(weekData)) {
          // key ví dụ: "5.1.7965625085" hoặc "4.5_CN.4070235011"
          if (!key.startsWith(selectedClass)) continue;

          // tách mã học sinh (sau dấu chấm cuối)
          const maHS = key.split(".").pop();
          const student = studentList.find(s => s.maDinhDanh === maHS);
          if (student) {
            student.statusByWeek[weekId] = value.status || "-";
          }
        }
      }

      // 3️⃣ Sắp xếp theo tên
      studentList.sort((a, b) => {
        const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        return nameA.localeCompare(nameB);
      });

      studentList = studentList.map((s, idx) => ({ ...s, stt: idx + 1 }));

      // 4️⃣ Lưu vào state & context
      setStudentData(prev => ({ ...prev, [selectedClass]: studentList }));
      setStudents(studentList);

    } catch (err) {
      console.error(`❌ Lỗi khi lấy học sinh + đánh giá lớp "${selectedClass}":`, err);
      setStudents([]);
    }
  };

  fetchStudentsAndStatus();
}, [selectedClass, setStudentData]);

{/*useEffect(() => {
  if (!selectedClass) return;

  const fetchStudentsAndStatus = async () => {
    try {
      // 1️⃣ Lấy danh sách học sinh từ DANHSACH
      const classDocRef = doc(db, "DANHSACH", selectedClass);
      const classSnap = await getDoc(classDocRef);
      if (!classSnap.exists()) {
        setStudents([]);
        setStudentData(prev => ({ ...prev, [selectedClass]: [] }));
        return;
      }

      const studentsData = classSnap.data();
      let studentList = Object.entries(studentsData).map(([maDinhDanh, info], idx) => ({
        maDinhDanh,
        hoVaTen: info.hoVaTen || "",
        statusByWeek: {}, // để lưu status từng tuần
      }));

      // 2️⃣ Lấy tất cả tuần trong DANHGIA
      const weeksSnapshot = await getDocs(collection(db, "DANHGIA"));
      for (const weekDoc of weeksSnapshot.docs) {
        const weekData = weekDoc.data();
        const classWeekData = weekData[selectedClass]; // chỉ lấy lớp đang chọn
        if (!classWeekData) continue;

        for (const [maHS, info] of Object.entries(classWeekData)) {
          const student = studentList.find(s => s.maDinhDanh === maHS);
          if (student) {
            student.statusByWeek[weekDoc.id] = info.status || "-";
          }
        }
      }

      // 3️⃣ Sắp xếp theo tên
      studentList.sort((a, b) => {
        const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
        return nameA.localeCompare(nameB);
      });

      studentList = studentList.map((s, idx) => ({ ...s, stt: idx + 1 }));

      // 4️⃣ Lưu vào context & state
      setStudentData(prev => ({ ...prev, [selectedClass]: studentList }));
      setStudents(studentList);

    } catch (err) {
      console.error(`❌ Lỗi khi lấy học sinh + đánh giá lớp "${selectedClass}":`, err);
      setStudents([]);
    }
  };

  fetchStudentsAndStatus();
}, [selectedClass, setStudentData]);*/}


  const handleCongNgheChange = (e) => setIsCongNghe(e.target.checked);
  const borderStyle = "1px solid #e0e0e0"; // màu nhạt như đường mặc định

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
      <Card elevation={6} sx={{ p: 4, borderRadius: 3, maxWidth: 1300, mx: "auto" }}>
        <Typography variant="h5" fontWeight="bold" color="primary" align="center" gutterBottom>
          TỔNG HỢP ĐÁNH GIÁ
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          mb={3}
        >
          <FormControl size="small" sx={{ minWidth: 80, textAlign: "center" }}>
            <Select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              size="small"
              sx={{
                width: 80,
                height: 40,
                borderRadius: 2,
                bgcolor: "transparent",
                "& .MuiSelect-select": {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  px: 1,
                },
                "&:hover": { bgcolor: "#e0e0e0" },
              }}
            >
              {classes.map((cls) => (
                <MenuItem key={cls} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={<Checkbox checked={!!isCongNghe} onChange={handleCongNgheChange} />}
            label="Công nghệ"
            sx={{ marginLeft: 0 }}
          />
        </Stack>

        <TableContainer component={Paper} sx={{ maxHeight: "70vh", overflowY: "auto", overflowX: "auto" }}>
          <Table stickyHeader size="small" sx={{ tableLayout: "fixed", minWidth: 1200 }}>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30, borderRight: borderStyle }}>
                  STT
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    whiteSpace: "nowrap",
                    backgroundColor: "#1976d2",
                    color: "white",
                    width: 220,
                    borderRight: borderStyle,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  HỌ VÀ TÊN
                </TableCell>
                <TableCell align="center" sx={{ backgroundColor: "#1976d2", color: "white", width: 30, borderRight: borderStyle }}>
                  LỚP
                </TableCell>
                {Array.from({ length: 35 }, (_, i) => (
                  <TableCell
                    key={i + 1}
                    align="center"
                    sx={{ backgroundColor: "#1976d2", color: "white", width: 55, borderRight: borderStyle }}
                  >
                    Tuần {i + 1}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map((student) => (
                <TableRow key={student.maDinhDanh} hover>
                  <TableCell align="center" sx={{ width: 50, borderRight: borderStyle }}>{student.stt}</TableCell>
                  <TableCell
                    align="left"
                    sx={{
                      whiteSpace: "nowrap",
                      width: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      borderRight: borderStyle,
                    }}
                  >
                    {student.hoVaTen}
                  </TableCell>
                  <TableCell align="center" sx={{ width: 80, borderRight: borderStyle }}>{selectedClass}</TableCell>
                  {Array.from({ length: 35 }).map((_, i) => {
                    const weekId = `tuan_${i + 1}`;
                    const status = student.statusByWeek?.[weekId] || "";
                    const statusShort = status === "Chưa hoàn thành" ? "C" 
                                      : status === "Hoàn thành" ? "H"
                                      : status === "Hoàn thành tốt" ? "T"
                                      : "";
                    return (
                      <TableCell key={i + 1} align="center" sx={{ width: 60, borderRight: borderStyle }}>
                        {statusShort}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>

          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
