//import React, { useState, useEffect, useContext } from "react";
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

export default function GiaoVien() {
  // 🔹 Context
  const { studentData, setStudentData, setClassData } = useContext(StudentContext);
  const { config, setConfig } = useContext(ConfigContext);

  // 🔹 Local state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [studentStatus, setStudentStatus] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isCongNghe, setIsCongNghe] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState(null); // 🔸 thêm dialog

  // 🔹 Lắng nghe CONFIG realtime
  useEffect(() => {
    const docRef = doc(db, "CONFIG", "config");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSelectedWeek(data.tuan || 1);
        setSelectedClass(data.lop || "");
        setIsCongNghe(data.congnghe === true);
        setConfig((prev) => ({ ...prev, ...data }));
      }
    });
    return () => unsubscribe();
  }, []);

  // 🔹 Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      const snapshot = await getDocs(collection(db, "DANHSACH"));
      const classList = snapshot.docs.map((d) => d.id);
      setClasses(classList);
      setClassData(classList);
      if (classList.length > 0 && !selectedClass) {
        setSelectedClass(config.lop || classList[0]);
      }
    };
    fetchClasses();
  }, [config.lop]);

  // 🔹 Lấy danh sách học sinh
  useEffect(() => {
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
        setStudentData((prev) => ({ ...prev, [selectedClass]: list }));
      } else setStudents([]);
    };
    fetchStudents();
  }, [selectedClass]);

  // 🔹 Lắng nghe realtime trạng thái đánh giá
  useEffect(() => {
    if (!selectedClass || !selectedWeek) return;
    const classKey = isCongNghe ? `${selectedClass}_CN` : selectedClass;
    const tuanRef = doc(db, "DGTX", classKey, "tuan", `tuan_${selectedWeek}`);

    const unsubscribe = onSnapshot(tuanRef, (snap) => {
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
  }, [selectedClass, selectedWeek, isCongNghe]);

  // 🔹 Lưu trạng thái
  const saveStudentStatus = async (studentId, hoVaTen, status) => {
    if (!selectedWeek || !selectedClass) return;
    const classKey = isCongNghe ? `${selectedClass}_CN` : selectedClass;
    const tuanRef = doc(db, "DGTX", classKey, "tuan", `tuan_${selectedWeek}`);
    try {
      await updateDoc(tuanRef, {
        [`${studentId}.hoVaTen`]: hoVaTen,
        [`${studentId}.status`]: status,
      }).catch(async (err) => {
        if (err.code === "not-found") {
          await setDoc(tuanRef, { [studentId]: { hoVaTen, status } });
        } else throw err;
      });
    } catch (err) {
      console.error("❌ Lỗi lưu đánh giá:", err);
    }
  };

  const handleStatusChange = (maDinhDanh, hoVaTen, status) => {
    setStudentStatus((prev) => {
      const updated = { ...prev };
      const newStatus = prev[maDinhDanh] === status ? "" : status;
      updated[maDinhDanh] = newStatus;
      saveStudentStatus(maDinhDanh, hoVaTen, newStatus);
      return updated;
    });
  };

  // 🔹 Bảng màu
  const statusColors = {
    "Hoàn thành tốt": { bg: "#1976d2", text: "#ffffff" },
    "Hoàn thành": { bg: "#9C27B0", text: "#ffffff" },
    "Chưa hoàn thành": { bg: "#FF9800", text: "#ffffff" },
    "": { bg: "#ffffff", text: "#000000" },
  };

  // 🔹 Chia cột
  const getColumns = () => {
    const cols = [[], [], [], [], []];
    students.forEach((s, i) => cols[Math.floor(i / 7) % 5].push(s));
    return cols;
  };
  const columns = getColumns();

  // 🔹 Đổi lớp / tuần / môn
  const handleClassChange = async (e) => {
    const newClass = e.target.value;
    setSelectedClass(newClass);
    await setDoc(doc(db, "CONFIG", "config"), { lop: newClass }, { merge: true });
  };
  const handleWeekChange = async (e) => {
    const newWeek = Number(e.target.value);
    setSelectedWeek(newWeek);
    await setDoc(doc(db, "CONFIG", "config"), { tuan: newWeek }, { merge: true });
  };
  const handleMonChange = async (e) => {
    const newValue = e.target.value;
    const newSubject = newValue === "congnghe" ? "Công nghệ" : "Tin học";
    const isCN = newValue === "congnghe";

    // 🧩 Cập nhật state cục bộ
    setIsCongNghe(isCN);

    try {
      const docRef = doc(db, "CONFIG", "config");

      // 🔄 Ghi cả 'mon' và 'congnghe' lên Firestore
      await setDoc(
        docRef,
        { mon: newSubject, congnghe: isCN },
        { merge: true }
      );

      // 🔄 Cập nhật Context ngay lập tức để UI phản ứng tức thì
      setConfig((prev) => ({
        ...prev,
        mon: newSubject,
        congnghe: isCN,
      }));
    } catch (err) {
      console.error("❌ Lỗi cập nhật môn học:", err);
    }
  };

  /// ref cho node (an toàn cho React StrictMode)
  const dialogNodeRef = useRef(null);

  function PaperComponent(props) {
    // sử dụng nodeRef để tránh findDOMNode warnings / errors
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
            <Select value={selectedClass} onChange={handleClassChange} label="Lớp">
              {classes.map((cls) => (
                <MenuItem key={cls} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Môn học</InputLabel>
            <Select value={isCongNghe ? "congnghe" : "tinhoc"} onChange={handleMonChange} label="Môn học">
              <MenuItem value="tinhoc">Tin học</MenuItem>
              <MenuItem value="congnghe">Công nghệ</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Tuần</InputLabel>
            <Select value={selectedWeek} onChange={handleWeekChange} label="Tuần">
              {[...Array(35)].map((_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  Tuần {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Danh sách học sinh */}
        <Grid container spacing={2} justifyContent="center">
          {columns.map((col, colIdx) => (
            <Grid item key={colIdx}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {col.map((student) => {
                  const status = studentStatus[student.maDinhDanh];
                  const chipProps =
                    {
                      "Hoàn thành tốt": { label: "T", color: "primary" },
                      "Hoàn thành": { label: "H", color: "secondary" },
                      "Chưa hoàn thành": { label: "C", color: "warning" },
                    }[status] || null;

                  return (
                    <Paper
                      key={student.maDinhDanh}
                      elevation={3}
                      onClick={() => setExpandedStudent(student)}
                      sx={{
                        minWidth: 120,
                        width: { xs: "75vw", sm: "auto" }, // 🔹 quan trọng: width bằng nhau trên mobile
                        p: 2,
                        borderRadius: 2,
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: "#ffffff",
                        color: "inherit",
                        transition: "0.2s",
                        boxShadow: 1,
                        "&:hover": {
                          transform: "scale(1.03)",
                          boxShadow: 4,
                          bgcolor: "#f5f5f5",
                        },
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="medium" noWrap>
                        {student.stt}. {student.hoVaTen}
                      </Typography>
                      {chipProps && (
                        <Chip
                          label={chipProps.label}
                          color={chipProps.color}
                          size="small"
                          sx={{
                            fontWeight: "bold",
                            borderRadius: "50%",
                            width: 28,
                            height: 28,
                            minWidth: 0,
                            p: 0,
                            justifyContent: "center",
                            fontSize: "0.8rem",
                            boxShadow: "0 0 4px rgba(0,0,0,0.15)",
                          }}
                        />
                      )}
                    </Paper>
                  );
                })}
              </Box>
            </Grid>
          ))}
        </Grid>

      </Paper>

      {/* 🔹 Dialog chọn đánh giá */}
      <Dialog
  open={Boolean(expandedStudent)}
  onClose={() => setExpandedStudent(null)}
  maxWidth="xs"
  fullWidth
  PaperComponent={PaperComponent}   // 🔹 thêm dòng này
>
  {expandedStudent && (
    <>
      <DialogTitle
        id="draggable-dialog-title"  // 🔹 thêm dòng này
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#64b5f6",
          flexWrap: "wrap",
          py: 1.5,
          cursor: "move", // 🔹 đổi con trỏ chuột cho biết là kéo được
        }}
      >
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          sx={{ color: "#ffffff" }}
        >
          {expandedStudent.hoVaTen.toUpperCase()}
        </Typography>
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

      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
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

          {studentStatus[expandedStudent.maDinhDanh] && (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Button
                onClick={() => {
                  handleStatusChange(
                    expandedStudent.maDinhDanh,
                    expandedStudent.hoVaTen,
                    ""
                  );
                  setExpandedStudent(null);
                }}
                sx={{
                  bgcolor: "#4caf50",
                  color: "#fff",
                  "&:hover": { bgcolor: "#388e3c" },
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
