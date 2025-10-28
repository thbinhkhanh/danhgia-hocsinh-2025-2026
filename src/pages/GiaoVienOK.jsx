import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  MenuItem,
  Select,
  Grid,
  Paper,
  FormControl,
  InputLabel,
} from "@mui/material";
import { db } from "../firebase";
import { StudentContext } from "../context/StudentContext";
import { ConfigContext } from "../context/ConfigContext";
import { doc, getDoc, getDocs, collection, setDoc, onSnapshot } from "firebase/firestore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Chip } from "@mui/material";


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

  // 🔹 Lấy danh sách học sinh của lớp
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
      } else {
        setStudents([]);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  // 🔹 Lắng nghe realtime trạng thái đánh giá từ HS
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
      } else {
        setStudentStatus({});
      }
    });

    return () => unsubscribe();
  }, [selectedClass, selectedWeek, isCongNghe]);

  // 🔹 Bảng màu
  const statusColors = {
    "Hoàn thành tốt": { bg: "#1976d2", text: "#ffffff" },  // xanh dương, chữ trắng
    "Hoàn thành": { bg: "#9C27B0", text: "#ffffff" },      // tím, chữ trắng
    "Chưa hoàn thành": { bg: "#FF9800", text: "#ffffff" }, // cam, chữ trắng
    "": { bg: "#ffffff", text: "#000000" },                // mặc định trắng, chữ đen
  };

  // 🔹 Hàm chia cột hiển thị
  const getColumns = () => {
    const cols = [[], [], [], [], []];
    students.forEach((s, i) => {
      cols[Math.floor(i / 7) % 5].push(s);
    });
    return cols;
  };

  const columns = getColumns();

  // 🔹 Hàm đổi lớp / tuần / môn
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
    const isCN = e.target.value === "congnghe";
    setIsCongNghe(isCN);
    await setDoc(doc(db, "CONFIG", "config"), { congnghe: isCN }, { merge: true });
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
        sx={{ p: 4, borderRadius: 3, width: "100%", maxWidth: 1420, bgcolor: "white" }}
      >
        <Box sx={{ textAlign: "center", mb: 1 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ color: "#1976d2", pb: 1 }}>
            TRANG THEO DÕI ĐÁNH GIÁ HỌC SINH
          </Typography>
        </Box>

        {/* Bộ chọn Lớp / Môn / Tuần */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            mb: 4,
          }}
        >
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel id="lop-label">Lớp</InputLabel>
            <Select labelId="lop-label" value={selectedClass} onChange={handleClassChange} label="Lớp">
              {classes.map((cls) => (
                <MenuItem key={cls} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="mon-label">Môn học</InputLabel>
            <Select
              labelId="mon-label"
              value={isCongNghe ? "congnghe" : "tinhoc"}
              onChange={handleMonChange}
              label="Môn học"
            >
              <MenuItem value="tinhoc">Tin học</MenuItem>
              <MenuItem value="congnghe">Công nghệ</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id="tuan-label">Tuần</InputLabel>
            <Select labelId="tuan-label" value={selectedWeek} onChange={handleWeekChange} label="Tuần">
              {[...Array(35)].map((_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  Tuần {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Hiển thị học sinh */}
        <Grid container spacing={2} justifyContent="center">
          {columns.map((col, colIdx) => (
            <Grid item key={colIdx}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {col.map((student) => {
                  const status = studentStatus[student.maDinhDanh] || "";

                  const chipProps = {
                    "Hoàn thành tốt": { label: "T", color: "primary" },
                    "Hoàn thành": { label: "H", color: "secondary" },
                    "Chưa hoàn thành": { label: "C", color: "warning" },
                  }[status] || null;

                  return (
                    <Paper
                      key={student.maDinhDanh}
                      elevation={2}
                      sx={{
                        minWidth: 180,
                        p: 2,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: "#fff",
                        "&:hover": { bgcolor: "#f9f9f9" },
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
                            borderRadius: "50%",   // 🔵 làm chip tròn
                            width: 28,             // chiều rộng
                            height: 28,            // chiều cao
                            minWidth: 0,
                            p: 0,
                            justifyContent: "center",
                            fontSize: "0.8rem",
                            boxShadow: "0 0 4px rgba(0,0,0,0.15)", // đổ bóng nhẹ
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
    </Box>
  );
}
