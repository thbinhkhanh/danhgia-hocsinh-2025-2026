import React, { useState, useEffect, useContext } from "react";
import {
  Box, Card, Typography, Divider, Stack,
  FormControl, InputLabel, Select, MenuItem,
  Checkbox, FormControlLabel, Table,
  TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Tooltip,
} from "@mui/material";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import DownloadIcon from "@mui/icons-material/Download";
import { exportEvaluationToExcel } from "../utils/exportExcel";
import { exportEvaluationToExcelFromTable } from "../utils/exportExcelFromTable";


export default function TongHopDanhGia() {
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isCongNghe, setIsCongNghe] = useState(false);

  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(9);
  
  const [isTeacherChecked, setIsTeacherChecked] = useState(false);

 // Khi context có lớp (VD từ trang khác), cập nhật selectedClass và fetch lại
  useEffect(() => {
    if (config?.lop) {
      setSelectedClass(config.lop);
    }
  }, [config?.lop]);


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

      // ✅ Chọn collection tùy theo checkbox "Giáo viên"
      const collectionName = isTeacherChecked ? "DANHGIA_GV" : "DANHGIA";

      // ✅ Lấy dữ liệu trong khoảng tuần song song để tối ưu tốc độ
      const weekPromises = [];
      for (let i = weekFrom; i <= weekTo; i++) {
        const weekId = `tuan_${i}`;
        weekPromises.push(getDoc(doc(db, collectionName, weekId)).then((snap) => ({ weekId, snap })));
      }

      const weekResults = await Promise.all(weekPromises);

      // 2️⃣ Xử lý dữ liệu từng tuần
      for (const { weekId, snap } of weekResults) {
        if (!snap.exists()) continue;

        const weekData = snap.data();

        for (const [key, value] of Object.entries(weekData)) {
          // --- Lọc theo Công nghệ ---
          const isCN = key.includes("_CN.");
          if (isCongNghe && !isCN) continue; // chỉ lấy key có _CN
          if (!isCongNghe && isCN) continue; // bỏ qua key _CN khi không bật CN

          // --- Lọc theo lớp ---
          // ví dụ key: "4.1_CN.7955284800" hoặc "4.1.7955284800"
          const classPrefix = isCongNghe ? `${selectedClass}_CN` : selectedClass;
          if (!key.startsWith(classPrefix)) continue;

          const maHS = key.split(".").pop();
          const student = studentList.find((s) => s.maDinhDanh === maHS);
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
      setStudentData((prev) => ({ ...prev, [selectedClass]: studentList }));
      setStudents(studentList);

    } catch (err) {
      console.error(`❌ Lỗi khi lấy học sinh + đánh giá lớp "${selectedClass}":`, err);
      setStudents([]);
    }
  };

  fetchStudentsAndStatus();
}, [selectedClass, weekFrom, weekTo, setStudentData, isTeacherChecked, isCongNghe]);


const handleDownload = async () => {
  try {
    await exportEvaluationToExcelFromTable(students, selectedClass, weekFrom, weekTo);
  } catch (error) {
    console.error("❌ Lỗi khi xuất Excel:", error);
  }
};


const handleCongNgheChange = (e) => setIsCongNghe(e.target.checked);
const borderStyle = "1px solid #e0e0e0"; // màu nhạt như đường mặc định

return (
  <Box sx={{ minHeight: "100vh", backgroundColor: "#e3f2fd", pt: 3 }}>
    <Card
      elevation={6}
      sx={{
        p: 4,
        borderRadius: 3,
        maxWidth: 1300,
        mx: "auto",
        position: "relative",
      }}
    >
      {/* 🔹 Nút tải Excel */}
      <Tooltip title="Tải xuống Excel" arrow>
        <IconButton
          onClick={handleDownload}
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            color: "primary.main",
            bgcolor: "white",
            boxShadow: 2,
            "&:hover": { bgcolor: "primary.light", color: "white" },
          }}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* ===== Header ===== */}
      <Typography
        variant="h5"
        fontWeight="bold"
        color="primary"
        gutterBottom
        sx={{ textAlign: "center", width: "100%", display: "block", mb: 2 }}
      >
        TỔNG HỢP ĐÁNH GIÁ
      </Typography>

      {/* ===== Row tuần ===== */}
      <Stack
        direction="row"
        spacing={2}
        justifyContent="center"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
      >
        <FormControl size="small" sx={{ minWidth: 100 }}>
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

        <FormControl size="small" sx={{ minWidth: 100 }}>
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

      <Divider sx={{ mb: 3 }} />

      {/* 🔹 Hàng chọn lớp và bộ lọc */}
      <Stack
        direction="row"
        spacing={2}
        justifyContent="center"
        alignItems="center"
        mb={3}
      >
        {/* Lớp */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body1" fontWeight="medium">
            Lớp:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={selectedClass}
              onChange={(e) => {
                const newClass = e.target.value;
                setSelectedClass(newClass); // local state
                setConfig((prev) => ({ ...prev, lop: newClass })); // cập nhật context
              }}
              size="small"
              sx={{
                width: 80,
                height: 40,
                borderRadius: 2,
                "& .MuiSelect-select": {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
              }}
            >
              {classes.map((cls) => (
                <MenuItem key={cls} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

        </Stack>

        {/* Checkbox Công nghệ */}
        <FormControlLabel
          control={<Checkbox checked={!!isCongNghe} onChange={handleCongNgheChange} />}
          label="Công nghệ"
        />

        {/* Checkbox Giáo viên */}
        <FormControlLabel
          control={
            <Checkbox
              checked={!!isTeacherChecked}
              onChange={(e) => setIsTeacherChecked(e.target.checked)}
            />
          }
          label="Giáo viên"
        />
      </Stack>

      {/* --- Bảng dữ liệu --- */}
      <TableContainer
        component={Paper}
        sx={{ maxHeight: "70vh", overflowY: "auto", overflowX: "auto" }}
      >
        <Table stickyHeader size="small" sx={{ tableLayout: "fixed", minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell
                align="center"
                sx={{ backgroundColor: "#1976d2", color: "white", width: 50 }}
              >
                STT
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  backgroundColor: "#1976d2",
                  color: "white",
                  width: 220,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                HỌ VÀ TÊN
              </TableCell>
              <TableCell
                align="center"
                sx={{ backgroundColor: "#1976d2", color: "white", width: 60 }}
              >
                LỚP
              </TableCell>

              {Array.from({ length: weekTo - weekFrom + 1 }, (_, i) => {
                const weekNum = weekFrom + i;
                return (
                  <TableCell
                    key={weekNum}
                    align="center"
                    sx={{ backgroundColor: "#1976d2", color: "white", width: 60 }}
                  >
                    Tuần {weekNum}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>

          <TableBody>
            {students.map((student) => (
              <TableRow key={student.maDinhDanh} hover>
                <TableCell align="center">{student.stt}</TableCell>
                <TableCell align="left">{student.hoVaTen}</TableCell>
                <TableCell align="center">{selectedClass}</TableCell>
                {Array.from({ length: weekTo - weekFrom + 1 }, (_, i) => {
                  const weekNum = weekFrom + i;
                  const weekId = `tuan_${weekNum}`;
                  const status = student.statusByWeek?.[weekId] || "";
                  const statusShort =
                    status === "Chưa hoàn thành"
                      ? "C"
                      : status === "Hoàn thành"
                      ? "H"
                      : status === "Hoàn thành tốt"
                      ? "T"
                      : "";
                  return (
                    <TableCell key={weekNum} align="center">
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
