import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Box,
  Typography,
  MenuItem,
  Select,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  IconButton,
  Stack,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import Draggable from "react-draggable";
import { useTheme, useMediaQuery } from "@mui/material";

export default function GiaoVien() {
  const { studentData, setStudentData, setClassData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);

  // Local state
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentStatus, setStudentStatus] = useState({});
  const [expandedStudent, setExpandedStudent] = useState(null);

  // ref cho dialog draggable
  const dialogNodeRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  function PaperComponent(props) {
    if (isMobile) return <Paper {...props} />;
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

  // Hàm gộp cập nhật config + Firestore
  const updateConfig = async (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig); // cập nhật React context
    try {
      await setDoc(doc(db, "CONFIG", "config"), { [field]: value }, { merge: true });
    } catch (err) {
      console.error(`❌ Lỗi cập nhật ${field}:`, err);
    }
  };

  // Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      const snapshot = await getDocs(collection(db, "DANHSACH"));
      const classList = snapshot.docs.map(d => d.id);
      setClasses(classList);
      setClassData(classList);
      if (!config.lop && classList.length > 0) {
        updateConfig("lop", classList[0]);
      }
    };
    fetchClasses();
  }, []);

  // Lấy danh sách học sinh khi đổi lớp
  useEffect(() => {
    const selectedClass = config.lop;
    if (!selectedClass) return;
    const cached = studentData[selectedClass];
    if (cached?.length > 0) {
      setStudents(cached);
      return;
    }
    const fetchStudents = async () => {
      const ref = doc(db, "DANHSACH", selectedClass);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const list = Object.entries(data)
          .map(([id, info]) => ({ maDinhDanh: id, hoVaTen: info.hoVaTen }))
          .sort((a, b) =>
            a.hoVaTen.split(" ").slice(-1)[0].localeCompare(b.hoVaTen.split(" ").slice(-1)[0])
          )
          .map((s, i) => ({ ...s, stt: i + 1 }));
        setStudents(list);
        setStudentData(prev => ({ ...prev, [selectedClass]: list }));
      } else setStudents([]);
    };
    fetchStudents();
  }, [config.lop, studentData]);

  // Lắng nghe realtime trạng thái đánh giá
  useEffect(() => {
    const { lop, tuan, mon } = config;
    if (!lop || !tuan || !mon) return;
    const classKey = mon === "Công nghệ" ? `${lop}_CN` : lop;
    const tuanRef = doc(db, "DGTX", classKey, "tuan", `tuan_${tuan}`);

    const unsubscribe = onSnapshot(tuanRef, snap => {
      if (snap.exists()) {
        const data = snap.data();
        const updated = {};
        Object.entries(data).forEach(([id, info]) => {
          updated[id] = info.status || "";
        });
        setStudentStatus(updated);
      } else setStudentStatus({});
    });

    return () => unsubscribe();
  }, [config.lop, config.tuan, config.mon]);

  // Lưu trạng thái học sinh
  const saveStudentStatus = async (studentId, hoVaTen, status) => {
    const { lop, tuan, mon } = config;
    if (!lop || !tuan) return;
    const classKey = mon === "Công nghệ" ? `${lop}_CN` : lop;
    const tuanRef = doc(db, "DGTX", classKey, "tuan", `tuan_${tuan}`);
    try {
      await updateDoc(tuanRef, {
        [`${studentId}.hoVaTen`]: hoVaTen,
        [`${studentId}.status`]: status,
      }).catch(async err => {
        if (err.code === "not-found") {
          await setDoc(tuanRef, { [studentId]: { hoVaTen, status } });
        } else throw err;
      });
    } catch (err) {
      console.error("❌ Lỗi lưu đánh giá:", err);
    }
  };

  const handleStatusChange = (maDinhDanh, hoVaTen, status) => {
    setStudentStatus(prev => {
      const updated = { ...prev };
      const newStatus = prev[maDinhDanh] === status ? "" : status;
      updated[maDinhDanh] = newStatus;
      saveStudentStatus(maDinhDanh, hoVaTen, newStatus);
      return updated;
    });
  };

  // Handler đổi lớp / tuần / môn
  const handleClassChange = e => updateConfig("lop", e.target.value);
  const handleWeekChange = e => updateConfig("tuan", Number(e.target.value));
  const handleMonChange = e => updateConfig("mon", e.target.value === "congnghe" ? "Công nghệ" : "Tin học");

  // Chia cột
  const getColumns = () => {
    const cols = [[], [], [], [], []];
    students.forEach((s, i) => cols[Math.floor(i / 7) % 5].push(s));
    return cols;
  };
  const columns = getColumns();

  // Bảng màu
  const statusColors = {
    "Hoàn thành tốt": { bg: "#1976d2", text: "#ffffff" },
    "Hoàn thành": { bg: "#9C27B0", text: "#ffffff" },
    "Chưa hoàn thành": { bg: "#FF9800", text: "#ffffff" },
    "": { bg: "#ffffff", text: "#000000" },
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)", pt: 3, px: 3 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 3, width: "100%", maxWidth: 1420, bgcolor: "white" }}>
        <Box sx={{ textAlign: "center", mb: 1 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: "#1976d2", pb: 1 }}>
            THEO DÕI - ĐÁNH GIÁ HỌC SINH
          </Typography>
        </Box>

        {/* Bộ chọn Lớp / Môn / Tuần */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 4 }}>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Lớp</InputLabel>
            <Select value={config.lop || ""} onChange={handleClassChange} label="Lớp">
              {classes.map(cls => <MenuItem key={cls} value={cls}>{cls}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120, bgcolor: "white" }}>
            <InputLabel id="mon-label">Môn</InputLabel>
            <Select
              labelId="mon-label"
              value={config.mon === "Công nghệ" ? "congnghe" : "tinhoc"}
              onChange={handleMonChange}
              label="Môn"
            >
              <MenuItem value="tinhoc">Tin học</MenuItem>
              <MenuItem value="congnghe">Công nghệ</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tuần</InputLabel>
            <Select value={config.tuan || 1} onChange={handleWeekChange} label="Tuần">
              {[...Array(35)].map((_, i) => <MenuItem key={i + 1} value={i + 1}>Tuần {i + 1}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {/* Danh sách học sinh */}
        <Grid container spacing={2} justifyContent="center">
          {columns.map((col, colIdx) => (
            <Grid item key={colIdx}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {col.map(student => {
                  const status = studentStatus[student.maDinhDanh];
                  const chipProps = {
                    "Hoàn thành tốt": { label: "T", color: "primary" },
                    "Hoàn thành": { label: "H", color: "secondary" },
                    "Chưa hoàn thành": { label: "C", color: "warning" },
                  }[status] || null;

                  return (
                    <Paper key={student.maDinhDanh} elevation={3} onClick={() => setExpandedStudent(student)} sx={{ minWidth: 120, width: { xs: "75vw", sm: "auto" }, p: 2, borderRadius: 2, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "#ffffff", color: "inherit", transition: "0.2s", boxShadow: 1, "&:hover": { transform: "scale(1.03)", boxShadow: 4, bgcolor: "#f5f5f5" } }}>
                      <Typography variant="subtitle2" fontWeight="medium" noWrap>
                        {student.stt}. {student.hoVaTen}
                      </Typography>
                      {chipProps && <Chip label={chipProps.label} color={chipProps.color} size="small" sx={{ fontWeight: "bold", borderRadius: "50%", width: 28, height: 28, minWidth: 0, p: 0, justifyContent: "center", fontSize: "0.8rem", boxShadow: "0 0 4px rgba(0,0,0,0.15)" }} />}
                    </Paper>
                  );
                })}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Dialog chọn đánh giá */}
      <Dialog open={Boolean(expandedStudent)} onClose={() => setExpandedStudent(null)} maxWidth="xs" fullWidth PaperComponent={PaperComponent}>
        {expandedStudent && (
          <>
            <DialogTitle id="draggable-dialog-title" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#64b5f6", flexWrap: "wrap", py: 1.5, cursor: "move" }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ color: "#ffffff" }}>
                {expandedStudent.hoVaTen.toUpperCase()}
              </Typography>
              <IconButton onClick={() => setExpandedStudent(null)} sx={{ color: "#f44336", "&:hover": { bgcolor: "rgba(244,67,54,0.1)" } }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {["Hoàn thành tốt", "Hoàn thành", "Chưa hoàn thành"].map(s => {
                  const isSelected = studentStatus[expandedStudent.maDinhDanh] === s;
                  return (
                    <Button key={s} variant={isSelected ? "contained" : "outlined"} color={s === "Hoàn thành tốt" ? "primary" : s === "Hoàn thành" ? "secondary" : "warning"} onClick={() => handleStatusChange(expandedStudent.maDinhDanh, expandedStudent.hoVaTen, s)}>
                      {isSelected ? `✓ ${s}` : s}
                    </Button>
                  );
                })}

                {studentStatus[expandedStudent.maDinhDanh] && (
                  <Box sx={{ textAlign: "center", mt: 2 }}>
                    <Button onClick={() => { handleStatusChange(expandedStudent.maDinhDanh, expandedStudent.hoVaTen, ""); setExpandedStudent(null); }} sx={{ bgcolor: "#4caf50", color: "#fff", "&:hover": { bgcolor: "#388e3c" }, mt: 1 }}>
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
