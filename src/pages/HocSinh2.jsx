//import React, { useState, useEffect, useContext } from "react";
import React, { useState, useEffect, useContext, useRef } from "react";
import { 
  Box, Typography, MenuItem, Select, Grid, Paper, Button, Stack, 
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  FormControl, 
  InputLabel,
  TextField,
} from "@mui/material";

import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, updateDoc, setDoc } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import CloseIcon from "@mui/icons-material/Close";
import Draggable from "react-draggable";
import { useTheme, useMediaQuery } from "@mui/material"; 

export default function HocSinh() {
  // 🔹 Lấy context
  const { studentData, setStudentData, classData, setClassData } = useContext(StudentContext);
  

  // 🔹 Local state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentStatus, setStudentStatus] = useState({});

  const { config, setConfig } = useContext(ConfigContext);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [systemLocked, setSystemLocked] = useState(false);


useEffect(() => {
  const docRef = doc(db, "CONFIG", "config");

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    const data = docSnap.exists() ? docSnap.data() : {};

    const tuan = data.tuan || 1;
    const mon = data.mon || "Tin học";
    const lop = data.lop || "";

    // 🔹 Cập nhật ConfigContext
    setConfig({ tuan, mon, lop });

    // 🔹 Cập nhật local state
    setSelectedWeek(tuan);
    setSelectedClass(lop);
  }, (err) => {
    console.error("❌ Lỗi khi lắng nghe CONFIG/config:", err);
  });

  return () => unsubscribe();
}, []);


  // 🔹 Lấy danh sách lớp (ưu tiên cache từ context)
useEffect(() => {
  const fetchClasses = async () => {
    try {
      const snapshot = await getDocs(collection(db, "DANHSACH"));
      const classList = snapshot.docs.map((doc) => doc.id);

      setClassData(classList);
      setClasses(classList);

      // ✅ Chọn lớp từ config trước, nếu không có mới dùng lớp đầu tiên
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
}, [config.lop]); // ✅ phụ thuộc config.lop để set lớp đúng

// 🔹 Lấy học sinh (ưu tiên dữ liệu từ context)
useEffect(() => {
  if (!selectedClass) return;

  const cached = studentData[selectedClass];
  if (cached && cached.length > 0) {
    // 🟢 Dùng cache nếu có
    setStudents(cached);
    return;
  }

  // 🔵 Nếu chưa có trong context thì tải từ Firestore
  const fetchStudents = async () => {
    try {
      //console.log(`🌐 Đang tải học sinh lớp "${selectedClass}" từ Firestore...`);
      const classDocRef = doc(db, "DANHSACH", selectedClass);
      const classSnap = await getDoc(classDocRef);
      if (classSnap.exists()) {
        const data = classSnap.data();
        let studentList = Object.entries(data).map(([maDinhDanh, info]) => ({
          maDinhDanh,
          hoVaTen: info.hoVaTen,
        }));

        // Sắp xếp theo tên
        studentList.sort((a, b) => {
          const nameA = a.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
          const nameB = b.hoVaTen.trim().split(" ").slice(-1)[0].toLowerCase();
          return nameA.localeCompare(nameB);
        });

        studentList = studentList.map((s, idx) => ({ ...s, stt: idx + 1 }));

        //console.log(`✅ Đã tải học sinh lớp "${selectedClass}" từ Firestore:`, studentList);

        // ⬇️ Lưu vào context và state
        setStudentData((prev) => ({ ...prev, [selectedClass]: studentList }));
        setStudents(studentList);
      } else {
        console.warn(`⚠️ Không tìm thấy dữ liệu lớp "${selectedClass}" trong Firestore.`);
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


  // 🔹 Cột hiển thị
  const getColumns = () => {
    const cols = [[], [], [], [], []];
    students.forEach((student, idx) => {
      const colIndex = Math.floor(idx / 7) % 5;
      cols[colIndex].push(student);
    });
    return cols;
  };

  const columns = getColumns();

  const toggleExpand = (maDinhDanh) => {
    setExpandedStudent(expandedStudent === maDinhDanh ? null : maDinhDanh);
  };

  const saveStudentStatus = async (studentId, hoVaTen, status) => {
    if (!selectedWeek || !selectedClass) return;

    try {
      // 🔹 Nếu là lớp công nghệ, thêm hậu tố "_CN"
      const classKey = config?.mon === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;

      // 🔹 Đường dẫn tài liệu Firestore cho tuần hiện tại
      const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

      // 🔹 Ghi trực tiếp vào field con của học sinh
      await updateDoc(tuanRef, {
        [`${studentId}.hoVaTen`]: hoVaTen,
        [`${studentId}.status`]: status,
      }).catch(async (err) => {
        if (err.code === "not-found") {
          // 🔹 Nếu document chưa tồn tại → tạo mới
          await setDoc(tuanRef, {
            [studentId]: { hoVaTen, status },
          });
        } else {
          throw err;
        }
      });

      //console.log(`✅ ${studentId}: ${hoVaTen} (${status}) đã lưu thành công`);
    } catch (err) {
      console.error("❌ Lỗi khi lưu trạng thái học sinh:", err);
    }
  };

  const handleStatusChange = (maDinhDanh, hoVaTen, status) => {
    setStudentStatus((prev) => {
      const currentStatus = prev[maDinhDanh] || "";
      const newStatus = currentStatus === status ? "" : status;

      // 🧠 Nếu không thay đổi trạng thái → bỏ qua, không ghi Firestore, không re-render
      if (currentStatus === newStatus) return prev;

      const updated = { ...prev, [maDinhDanh]: newStatus };

      // 🔹 Ghi Firestore bất đồng bộ sau khi setState
      saveStudentStatus(maDinhDanh, hoVaTen, newStatus);

      return updated;
    });
  };


  useEffect(() => {
  // 🛑 Nếu chưa đủ thông tin, thoát
  if (!expandedStudent?.maDinhDanh || !selectedClass || !selectedWeek) return;

  const classKey =
    config?.mon === "Công nghệ" ? `${selectedClass}_CN` : selectedClass;
  const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

  // 🟢 Lắng nghe realtime CHỈ học sinh đang được mở
  const unsubscribe = onSnapshot(
    tuanRef,
    (docSnap) => {
      if (!docSnap.exists()) return;

      const record = docSnap.data()?.[expandedStudent.maDinhDanh];
      const currentStatus = record?.status || "";

      setStudentStatus((prev) => {
        // 🔸 Nếu trạng thái không đổi → không setState (tránh render lặp)
        if (prev[expandedStudent.maDinhDanh] === currentStatus) return prev;
        return {
          ...prev,
          [expandedStudent.maDinhDanh]: currentStatus,
        };
      });
    },
    (error) => {
      console.error("❌ Lỗi khi lắng nghe đánh giá realtime:", error);
    }
  );

  // 🧹 Khi đóng dialog → hủy lắng nghe
  return () => unsubscribe();
}, [expandedStudent?.maDinhDanh, selectedClass, selectedWeek, config?.mon]);

  const statusColors = {
    "Hoàn thành tốt": { bg: "#1976d2", text: "#ffffff", label: "T", color: "primary" },
    "Hoàn thành": { bg: "#9C27B0", text: "#ffffff", label: "H", color: "secondary" },
    "Chưa hoàn thành": { bg: "#FF9800", text: "#ffffff", label: "C", color: "warning" },
    "": { bg: "#ffffff", text: "#000000" },
  };

  // ref cho node (an toàn cho React StrictMode)
  const dialogNodeRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  function PaperComponent(props) {
    // 🔹 KHẮC PHỤC LỖI TRÊN MOBILE:
    // Trên điện thoại, không bọc trong <Draggable> để tránh chặn sự kiện chạm (tap)
    if (isMobile) {
      return <Paper {...props} />;
    }

    // 🔹 Chỉ desktop mới dùng draggable
    return (
      <Draggable
        nodeRef={dialogNodeRef}
        handle="#draggable-dialog-title"
        cancel={'[class*="MuiDialogContent-root"]'}
      >
        <Paper ref={dialogNodeRef} {...props} />
      </Draggable>
    );
  }

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
        maxWidth: 1420,
        bgcolor: "white",
      }}
    >
      {/* 🔹 Tiêu đề */}
      <Box sx={{ textAlign: "center", mb: -1 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{
            color: "#1976d2",
            //borderBottom: "3px solid #1976d2",
            display: "inline-block",
            pb: 1,
          }}
        >
          {selectedClass
            ? `DANH SÁCH LỚP ${selectedClass}`
            : "DANH SÁCH HỌC SINH"}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          mt: 2,
          mb: 4,
        }}
      >
        {/* 🔹 Môn (chỉ hiển thị, không cho thay đổi) */}
        <TextField
          label="Môn"
          value={config.mon || "Tin học"}
          InputProps={{ readOnly: true }}
          size="small"
          sx={{
            width: 120,
            //bgcolor: "#f5f5f5",
            "& .MuiInputBase-input.Mui-disabled": { color: "#000" },
            fontWeight: "bold",
          }}
        />

        {/* 🔹 Tuần (chỉ hiển thị, không cho thay đổi) */}
        <TextField
          label="Tuần"
          value={`Tuần ${config.tuan || 1}`}
          InputProps={{ readOnly: true }}
          size="small"
          sx={{
            width: 120,
            //bgcolor: "#f5f5f5",
            "& .MuiInputBase-input.Mui-disabled": { color: "#000" },
            fontWeight: "bold",
          }}
        />
      </Box>

      {/* 🔹 Danh sách học sinh */}
      <Grid container spacing={2} justifyContent="center">
        {columns.map((col, colIdx) => (
          <Grid item key={colIdx}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {col.map((student) => {
                const status = studentStatus[student.maDinhDanh];
                return (
                  <Paper
                    key={student.maDinhDanh}
                    elevation={3}
                    sx={{
                      minWidth: 120,
                      width: { xs: "75vw", sm: "auto" },
                      p: 2,
                      borderRadius: 2,
                      cursor: "pointer",
                      textAlign: "left",
                      bgcolor: "#ffffff",
                      transition: "0.2s",
                      "&:hover": {
                        transform: "scale(1.03)",
                        boxShadow: 4,
                        bgcolor: "#f5f5f5",
                      },
                    }}
                    onClick={() => setExpandedStudent(student)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {student.stt}. {student.hoVaTen}
                      </Typography>
                      {status && (
                        <Chip
                          label={statusColors[status].label}
                          color={statusColors[status].color}
                          size="small"
                          sx={{ ml: 1, fontWeight: "bold" }}
                        />
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>

    {/* 🔹 Dialog hiển thị khi chọn học sinh */}
    <Dialog
      open={Boolean(expandedStudent)}
      onClose={(event, reason) => {
        if (reason !== "backdropClick") {
          setExpandedStudent(null);
        }
      }}
      maxWidth="xs"
      fullWidth
      PaperComponent={PaperComponent}
    >

      {expandedStudent && (
        <>
          <DialogTitle
            id="draggable-dialog-title"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "#64b5f6",
              flexWrap: "wrap",
              py: 1.5,
              cursor: "move", // 🟢 thêm để dễ thấy có thể kéo
            }}
          >

            <Box>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                sx={{ color: "#ffffff", fontSize: "1.05rem" }}
              >
                {expandedStudent.hoVaTen.toUpperCase()}
              </Typography>
            </Box>

            <IconButton
              onClick={() => setExpandedStudent(null)}
              sx={{
                color: "#f44336",
                "&:hover": { bgcolor: "rgba(244,67,54,0.1)" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ mt: 2 }}>
            <Stack spacing={1}>
              {["Hoàn thành tốt", "Hoàn thành", "Chưa hoàn thành"].map((s) => {
                const isSelected = studentStatus[expandedStudent.maDinhDanh] === s;
                return (
                  <Button
                    key={s}
                    variant={isSelected ? "contained" : "outlined"}
                    color={
                      s === "Hoàn thành tốt"
                        ? "primary"
                        : s === "Hoàn thành"
                        ? "secondary"
                        : "warning"
                    }
                    onClick={() =>
                      handleStatusChange(
                        expandedStudent.maDinhDanh,
                        expandedStudent.hoVaTen,
                        s
                      )
                    }
                  >
                    {isSelected ? `✓ ${s}` : s}
                  </Button>
                );
              })}

              {/* 🔹 Nút hủy đánh giá */}
              {studentStatus[expandedStudent.maDinhDanh] && (
                <Box sx={{ mt: 5, textAlign: "center" }}>
                  <Button
                    onClick={() => {
                      handleStatusChange(
                        expandedStudent.maDinhDanh,
                        expandedStudent.hoVaTen,
                        ""
                      );
                      setExpandedStudent(null); // 🔹 Đóng dialog sau khi hủy
                    }}
                    sx={{
                      width: 160,
                      px: 2,
                      bgcolor: "#4caf50",
                      color: "#ffffff",
                      borderRadius: 1,
                      textTransform: "none",
                      fontWeight: "bold",
                      "&:hover": {
                        bgcolor: "#388e3c",
                      },
                      mt: 1,
                    }}
                  >
                    HỦY ĐÁNH GIÁ
                  </Button>
                </Box>
              )}
            </Stack>
          </DialogContent>
        </>
      )}
    </Dialog>
  </Box>
);

}
