import React, { useState, useEffect, useContext } from "react";
import { Box, Typography, MenuItem, Select, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, setDoc, onSnapshot } from "firebase/firestore";

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

    const cached = studentData[selectedClass];
    if (cached && cached.length > 0) {
      setStudents(cached);
      return;
    }

    const fetchStudents = async () => {
      try {
        const classDocRef = doc(db, "DANHSACH", selectedClass);
        const classSnap = await getDoc(classDocRef);
        if (classSnap.exists()) {
          const data = classSnap.data();
          let studentList = Object.entries(data).map(([maDinhDanh, info], idx) => ({
            stt: idx + 1,
            maDinhDanh,
            hoVaTen: info.hoVaTen,
            ghiChu: "", // trống ban đầu
          }));
          setStudentData((prev) => ({ ...prev, [selectedClass]: studentList }));
          setStudents(studentList);
        } else {
          setStudents([]);
          setStudentData((prev) => ({ ...prev, [selectedClass]: [] }));
        }
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
        }}
      >
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: "#1976d2" }}>
            DANH SÁCH HỌC SINH
          </Typography>
        </Box>

        {/* Dropdown chọn lớp với nhãn */}
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 4, gap: 1 }}>
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


        {/* Bảng hiển thị học sinh */}
        <TableContainer component={Paper}>
            <Table size="small">
                <TableHead>
                <TableRow sx={{ height: 36 }}>
                    <TableCell
                    sx={{
                        bgcolor: "#1976d2",
                        color: "#ffffff",
                        fontWeight: "bold",
                        px: 1,
                        width: 50,
                        textAlign: "center",
                        borderRight: "1px solid rgba(0,0,0,0.12)"
                    }}
                    >
                    STT
                    </TableCell>
                    <TableCell
                    sx={{
                        bgcolor: "#1976d2",
                        color: "#ffffff",
                        fontWeight: "bold",
                        px: 1,
                        width: 120,
                        textAlign: "center",       // căn giữa mã định danh
                        borderRight: "1px solid rgba(0,0,0,0.12)"
                    }}
                    >
                    MÃ ĐỊNH DANH
                    </TableCell>
                    <TableCell
                    sx={{
                        bgcolor: "#1976d2",
                        color: "#ffffff",
                        fontWeight: "bold",
                        px: 1,
                        width: 200,
                        textAlign: "center",
                        borderRight: "1px solid rgba(0,0,0,0.12)"
                    }}
                    >
                    HỌ VÀ TÊN
                    </TableCell>
                    <TableCell
                    sx={{
                        bgcolor: "#1976d2",
                        color: "#ffffff",
                        fontWeight: "bold",
                        px: 1,
                        width: 250,
                        textAlign: "center"
                    }}
                    >
                    GHI CHÚ
                    </TableCell>
                </TableRow>
                </TableHead>

                <TableBody>
                {students.map((student) => (
                    <TableRow key={student.maDinhDanh} sx={{ height: 32 }}>
                    <TableCell sx={{ px: 1, width: 50, textAlign: "center", borderRight: "1px solid rgba(0,0,0,0.12)" }}>
                        {student.stt}
                    </TableCell>
                    <TableCell sx={{ px: 1, width: 120, textAlign: "center", borderRight: "1px solid rgba(0,0,0,0.12)" }}>
                        {student.maDinhDanh}
                    </TableCell>
                    <TableCell sx={{ px: 1, width: 200, borderRight: "1px solid rgba(0,0,0,0.12)" }}>
                        {student.hoVaTen}
                    </TableCell>
                    <TableCell sx={{ px: 1, width: 250 }}>
                        {student.ghiChu}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </TableContainer>



      </Paper>
    </Box>
  );
}
