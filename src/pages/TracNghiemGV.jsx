import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Radio,
  Checkbox,
  Stack,
  Select,
  MenuItem,
  IconButton,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
} from "@mui/material";
//import { doc, setDoc } from "firebase/firestore";
//import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

import { db } from "../firebase"; // Firestore instance

import DeleteIcon from "@mui/icons-material/Delete";
import { useConfig } from "../context/ConfigContext";
import OpenInBrowserIcon from "@mui/icons-material/OpenInBrowser";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SaveIcon from "@mui/icons-material/Save";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";


export default function TracNghiemGV() {
  const [questions, setQuestions] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });


  const { config } = useConfig();

const hocKyMap = {
  "Giữa kỳ I": { from: 1, to: 9 },
  "Cuối kỳ I": { from: 10, to: 18 },
  "Giữa kỳ II": { from: 19, to: 27 },
  "Cả năm": { from: 28, to: 35 },
};

// State cho học kỳ và tuần
const [semester, setSemester] = useState(config.hocKy || "");
const [week, setWeek] = useState(config.tuan || 1);

// Đồng bộ khi config thay đổi
useEffect(() => {
  if (config.hocKy) setSemester(config.hocKy);
  if (config.tuan) setWeek(config.tuan);
}, [config.hocKy, config.tuan]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const classes = ["Lớp 4", "Lớp 5"];
  const subjects = ["Tin học", "Công nghệ"];

  // -----------------------
  // Load dữ liệu khi mount
  // -----------------------
  useEffect(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem("teacherConfig") || "{}");
      if (cfg?.selectedClass) setSelectedClass(cfg.selectedClass);
      if (cfg?.selectedSubject) setSelectedSubject(cfg.selectedSubject);

      const saved = JSON.parse(localStorage.getItem("teacherQuiz") || "[]");
      if (Array.isArray(saved) && saved.length) {
        setQuestions(saved);
      } else {
        // 🔹 Nếu không có dữ liệu, tạo 1 câu hỏi trống
        setQuestions([createEmptyQuestion()]);
      }
    } catch (err) {
      console.error("❌ Không thể load dữ liệu:", err);
      // 🔹 Nếu lỗi, vẫn tạo 1 câu hỏi trống
      setQuestions([createEmptyQuestion()]);
    }
  }, []);


  // 🔹 Lưu config vào localStorage khi thay đổi
  useEffect(() => {
    const cfg = {
      selectedClass,
      selectedSubject,
      semester,
      week,
    };
    localStorage.setItem("teacherConfig", JSON.stringify(cfg));
  }, [selectedClass, selectedSubject, semester, week]);

  // -----------------------
  // Xử lý câu hỏi
  // -----------------------
  const createEmptyQuestion = () => ({
    id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    question: "",
    options: ["", "", "", ""],
    type: "single",
    correct: null,
    score: 1,
  });

  const handleAddQuestion = () => setQuestions((prev) => [...prev, createEmptyQuestion()]);
  const handleDeleteQuestion = (index) =>
    setQuestions((prev) => prev.filter((_, i) => i !== index));

  const updateQuestionAt = (index, patch) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const isQuestionValid = (q) => {
    if (!q.question?.trim()) return false;
    if (q.score <= 0) return false;
    const nonEmptyOpts = (q.options || []).filter((o) => o?.trim());
    if (nonEmptyOpts.length < 2) return false;
    if (q.type === "single") return typeof q.correct === "number";
    if (q.type === "multiple") return Array.isArray(q.correct) && q.correct.length > 0;
    return false;
  };

  const handleSaveAll = async () => {
  // Kiểm tra câu hỏi hợp lệ
  const invalid = questions
    .map((q, i) => (!isQuestionValid(q) ? `Câu ${i + 1}` : null))
    .filter(Boolean);

  if (invalid.length > 0) {
    setSnackbar({
      open: true,
      message: `❌ Các câu hỏi chưa hợp lệ: ${invalid.join(", ")}`,
      severity: "error",
    });
    return;
  }

  try {
    // 🔹 Lưu vào localStorage như trước (tùy muốn)
    localStorage.setItem("teacherQuiz", JSON.stringify(questions));
    const cfg = {
      selectedClass,
      selectedSubject,
      semester,
      week,
    };
    localStorage.setItem("teacherConfig", JSON.stringify(cfg));

    // 🔹 Lưu vào Firestore
    if (!selectedClass || !selectedSubject || !week) {
      throw new Error("Vui lòng chọn lớp, môn và tuần trước khi lưu");
    }

    // Tạo ID document rõ ràng
    const docId = `quiz_${selectedClass}_${selectedSubject}_${week}`;
    const quizRef = doc(db, "TRACNGHIEM", docId);

    await setDoc(quizRef, {
      class: selectedClass,
      subject: selectedSubject,
      week: week,
      semester: semester,
      questions: questions,
    });

    setSnackbar({
      open: true,
      message: "✅ Đã lưu thành công!",
      severity: "success",
    });
  } catch (err) {
    console.error(err);
    setSnackbar({
      open: true,
      message: `❌ Lỗi khi lưu đề: ${err.message}`,
      severity: "error",
    });
  }
};

  const handleSaveAll_storage = () => {
    // Kiểm tra câu hỏi hợp lệ
    const invalid = questions
      .map((q, i) => (!isQuestionValid(q) ? `Câu ${i + 1}` : null))
      .filter(Boolean);

    if (invalid.length > 0) {
      setSnackbar({
        open: true,
        message: `❌ Các câu hỏi chưa hợp lệ: ${invalid.join(", ")}`,
        severity: "error",
      });
      return;
    }

    try {
      // Lưu danh sách câu hỏi
      localStorage.setItem("teacherQuiz", JSON.stringify(questions));

      // Lưu config lớp/môn/học kỳ/tuần
      const cfg = {
        selectedClass,
        selectedSubject,
        semester,
        week,
      };
      localStorage.setItem("teacherConfig", JSON.stringify(cfg));

      setSnackbar({
        open: true,
        message: "✅ Đã lưu thành công!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi lưu đề!",
        severity: "error",
      });
    }
  };

  // --- Hàm mở dialog và fetch danh sách document ---
  const handleOpenDialog = async () => {
    setOpenDialog(true);
    try {
      const colRef = collection(db, "TRACNGHIEM");
      const snap = await getDocs(colRef);
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      setQuizList(docs);
    } catch (err) {
      console.error("❌ Lỗi khi fetch danh sách đề:", err);
    }
  };

  // --- Hàm mở đề đã chọn ---
  /*const handleOpenQuiz = async () => {
    if (!selectedQuizId) return;
    try {
      const docRef = doc(db, "TRACNGHIEM", selectedQuizId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Load dữ liệu lên giao diện soạn đề
        setQuestions(data.questions || []);
        setSelectedClass(data.class || "");
        setSelectedSubject(data.subject || "");
        setSemester(data.semester || "");
        setWeek(data.week || 1);

        setSnackbar({
          open: true,
          //message: `✅ Đã mở đề "${selectedQuizId}"`,
          message: `✅ Đã mở đề ${data.class} - ${data.subject} - Tuần ${data.week}`,
          severity: "success",
        });
        setOpenDialog(false);
      } else {
        setSnackbar({
          open: true,
          message: "❌ Không tìm thấy đề này!",
          severity: "error",
        });
      }
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: `❌ Lỗi khi mở đề: ${err.message}`,
        severity: "error",
      });
    }
  };*/

  // ⚙️ State cho dialog mở đề
const [openDialog, setOpenDialog] = useState(false);
const [docList, setDocList] = useState([]);
const [loadingList, setLoadingList] = useState(false);
const [selectedDoc, setSelectedDoc] = useState(null);

// 🔹 Hàm lấy danh sách đề trong Firestore
const fetchQuizList = async () => {
  setLoadingList(true);
  try {
    const colRef = collection(db, "TRACNGHIEM");
    const snap = await getDocs(colRef);
    const docs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setDocList(docs);
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách đề:", err);
    setSnackbar({
      open: true,
      message: "❌ Không thể tải danh sách đề!",
      severity: "error",
    });
  } finally {
    setLoadingList(false);
    setOpenDialog(true);
  }
};

// 🔹 Hàm mở đề được chọn
const handleOpenSelectedDoc = async () => {
  if (!selectedDoc) return;
  try {
    const docRef = doc(db, "TRACNGHIEM", selectedDoc);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // 🔹 Cập nhật dữ liệu lên UI
      setQuestions(data.questions || []);
      setSelectedClass(data.class || "");
      setSelectedSubject(data.subject || "");
      setSemester(data.semester || "");
      setWeek(data.week || 1);

      // 🔹 Hiển thị thông báo
      setSnackbar({
        open: true,
        //message: `✅ Đã mở đề "${selectedDoc}"`,
        message: `✅ Đã mở đề: ${data.class} - ${data.subject} - Tuần ${data.week}`,
        severity: "success",
      });
      setOpenDialog(false);

      // 🔹 Ghi lại tên đề vào CONFIG/config/deTracNghiem
      try {
        const configRef = doc(db, "CONFIG", "config");
        await setDoc(
          configRef,
          { deTracNghiem: selectedDoc },
          { merge: true } // ✅ chỉ ghi thêm, không ghi đè
        );
        console.log(`✅ Đã ghi deTracNghiem = "${selectedDoc}" vào CONFIG/config`);
      } catch (err) {
        console.error("❌ Lỗi khi ghi CONFIG/config/deTracNghiem:", err);
      }

    } else {
      setSnackbar({
        open: true,
        message: "❌ Không tìm thấy đề này!",
        severity: "error",
      });
    }
  } catch (err) {
    console.error(err);
    setSnackbar({
      open: true,
      message: `❌ Lỗi khi mở đề: ${err.message}`,
      severity: "error",
    });
  }
};


  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: 3,
        background: "#e3f2fd",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* ------------------ DIALOG MỞ ĐỀ ------------------ */}
          <Dialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: { borderRadius: 3, p: 1.5, bgcolor: "#f9fbfc" },
            }}
          >
            <DialogTitle sx={{ textAlign: "center", fontWeight: "bold", color: "#1976d2" }}>
              📂 Chọn đề để mở
            </DialogTitle>

            <DialogContent dividers sx={{ maxHeight: 200, overflowY: "auto" }}>
              {loadingList ? (
                <Typography align="center" sx={{ py: 4 }}>
                  ⏳ Đang tải danh sách đề...
                </Typography>
              ) : docList.length === 0 ? (
                <Typography align="center" sx={{ py: 4, color: "text.secondary" }}>
                  Không có đề nào trong Firestore.
                </Typography>
              ) : (
                <Stack spacing={1.2}>
            {docList.map((doc) => {
              const selected = selectedDoc === doc.id;
              return (
                <Paper
                  key={doc.id}
                  elevation={selected ? 4 : 1}
                  onClick={() => setSelectedDoc(doc.id)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "0.2s",
                    border: selected ? "2px solid #1976d2" : "1px solid #e0e0e0",
                    bgcolor: selected ? "#e3f2fd" : "#fff",
                    "&:hover": {
                      borderColor: "#90caf9",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  {/* Ẩn doc.id */}
                  {/* <Typography variant="subtitle1" fontWeight="600" color="#1976d2">
                    {doc.id}
                  </Typography> */}
                  
                  {/* Chỉ hiển thị gọn */}
                  <Typography variant="body1" fontWeight="600" color="#1976d2">
                    {doc.class} - {doc.subject} - Tuần {doc.week}
                  </Typography>
                </Paper>
              );
            })}
          </Stack>

          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleOpenSelectedDoc}
            variant="contained"
            disabled={!selectedDoc}
            sx={{ borderRadius: 2 }}
          >
            Mở đề
          </Button>

          <Button
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>


      {/* Card chứa tiêu đề và các ô chọn */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          backgroundColor: "#fff",
          width: "100%",
          maxWidth: 970,
          position: "relative",
        }}
        elevation={3}
      >
        {/* Icon mở/lưu ở góc trên trái */}
        <Stack direction="row" spacing={0.2} sx={{ position: "absolute", top: 8, left: 8 }}>
          <IconButton onClick={fetchQuizList} sx={{ color: "#1976d2" }}>
            <FolderOpenIcon />
          </IconButton>
          <IconButton onClick={handleSaveAll} sx={{ color: "#1976d2" }}>
            <SaveIcon />
          </IconButton>
        </Stack>

        {/* Tiêu đề căn giữa */}
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ textAlign: "center", mb: 3, color: "#1976d2", textTransform: "uppercase" }}
        >
          Soạn đề trắc nghiệm
        </Typography>

        {/* Stack chứa các ô chọn */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
        >
          <FormControl size="small" sx={{ width: 130 }}>
            <InputLabel>Lớp</InputLabel>
            <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} label="Lớp">
              {classes.map((lop) => (
                <MenuItem key={lop} value={lop}>
                  {lop}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: 130 }}>
            <InputLabel>Môn học</InputLabel>
            <Select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} label="Môn học">
              {subjects.map((mon) => (
                <MenuItem key={mon} value={mon}>
                  {mon}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: 130 }}>
            <InputLabel>Học kỳ</InputLabel>
            <Select value={semester} label="Học kỳ" onChange={(e) => setSemester(e.target.value)}>
              {Object.keys(hocKyMap).map((hk) => (
                <MenuItem key={hk} value={hk}>
                  {hk}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: 130 }}>
            <InputLabel>Tuần</InputLabel>
            <Select
              value={week}
              label="Tuần"
              onChange={(e) => setWeek(Number(e.target.value))}
            >
              {semester &&
                Array.from(
                  { length: hocKyMap[semester].to - hocKyMap[semester].from + 1 },
                  (_, i) => i + hocKyMap[semester].from
                ).map((t) => (
                  <MenuItem key={t} value={t}>
                    Tuần {t}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Danh sách câu hỏi */}
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 1000 }}>
        {questions.map((q, qi) => (
          <Paper key={q.id} sx={{ p: 3, borderRadius: 2 }} elevation={2}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h6">Câu {qi + 1}</Typography>

                  <FormControl size="small" sx={{ width: 150 }}>
                    <InputLabel>Loại câu hỏi</InputLabel>
                    <Select
                      value={q.type}
                      onChange={(e) =>
                        updateQuestionAt(qi, {
                          type: e.target.value,
                          correct: e.target.value === "single" ? null : [],
                        })
                      }
                      label="Loại câu hỏi"
                    >
                      <MenuItem value="single">1 đáp án</MenuItem>
                      <MenuItem value="multiple">Nhiều đáp án</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Điểm"
                    type="number"
                    size="small"
                    value={q.score ?? 1}
                    onChange={(e) =>
                      updateQuestionAt(qi, {
                        score: parseFloat(e.target.value) || 1,
                      })
                    }
                    sx={{ width: 80 }}
                  />

                  <FormControl size="small" sx={{ width: 120 }}>
                    <InputLabel>Kiểu sắp xếp</InputLabel>
                    <Select
                      value={q.sortType || "fixed"}
                      onChange={(e) => updateQuestionAt(qi, { sortType: e.target.value })}
                      label="Kiểu sắp xếp"
                    >
                      <MenuItem value="fixed">Cố định</MenuItem>
                      <MenuItem value="shuffle">Đảo câu</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ color: isQuestionValid(q) ? "green" : "red" }}>
                    {isQuestionValid(q) ? "Hợp lệ" : "Chưa hợp lệ"}
                  </Typography>
                  <IconButton onClick={() => handleDeleteQuestion(qi)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </Stack>
              </Stack>

              <TextField
                fullWidth
                multiline
                placeholder="Nhập nội dung câu hỏi..."
                value={q.question}
                onChange={(e) => updateQuestionAt(qi, { question: e.target.value })}
                size="small"
                InputProps={{
                  sx: {
                    fontWeight: "bold", // in đậm
                  },
                }}
              />

              <Stack spacing={0.5}>
                {q.options.map((opt, oi) => (
                  <Stack key={oi} direction="row" spacing={1} alignItems="flex-start">
                    {q.type === "single" ? (
                      <Radio
                        checked={q.correct === oi}
                        onChange={() => updateQuestionAt(qi, { correct: oi })}
                        sx={{ mt: 0.5, p: 0 }}
                      />
                    ) : (
                      <Checkbox
                        checked={Array.isArray(q.correct) && q.correct.includes(oi)}
                        onChange={() => {
                          const prev = Array.isArray(q.correct) ? [...q.correct] : [];
                          updateQuestionAt(qi, {
                            correct: prev.includes(oi)
                              ? prev.filter((x) => x !== oi)
                              : [...prev, oi],
                          });
                        }}
                        sx={{ mt: 0.5, p: 0 }}
                      />
                    )}
                    <TextField
                      fullWidth
                      placeholder={`Phương án ${oi + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const opts = [...q.options];
                        opts[oi] = e.target.value;
                        updateQuestionAt(qi, { options: opts });
                      }}
                      size="small"
                    />
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Paper>
        ))}

        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={handleAddQuestion}>
            Thêm câu hỏi
          </Button>
          <Button variant="outlined" color="secondary" onClick={handleSaveAll} disabled={questions.length === 0}>
            Lưu đề
          </Button>
        </Stack>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
