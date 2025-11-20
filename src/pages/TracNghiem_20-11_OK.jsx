import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  LinearProgress,
  IconButton,
  Tooltip,
  Snackbar, 
  Alert,
  Divider,
  TextField,
} from "@mui/material";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// Thay cho react-beautiful-dnd
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import { db } from "../firebase";
import { useContext } from "react";
import { ConfigContext } from "../context/ConfigContext";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AccessTimeIcon from "@mui/icons-material/AccessTime";


import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

// Hàm shuffle mảng
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function TracNghiem() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizClass, setQuizClass] = useState("");
  const [score, setScore] = useState(0);

  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const { config } = useContext(ConfigContext);
  const [saving, setSaving] = useState(false);
  const [openExitConfirm, setOpenExitConfirm] = useState(false);

  const location = useLocation();
  const { studentId, studentName, studentClass, selectedWeek, mon } = location.state || {};
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const studentInfo = {
    name: studentName || "Họ và tên: Test",
    class: studentClass || "Test"
  };

  // Đồng bộ thời gian
  useEffect(() => {
    if (config?.timeLimit) setTimeLeft(config.timeLimit * 60);
  }, [config?.timeLimit]);

  // Timer
  useEffect(() => {
    if (!started || submitted) return;
    if (timeLeft <= 0) {
      autoSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [started, timeLeft, submitted]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleMatchSelect = (questionId, leftIndex, rightIndex) => {
    setAnswers(prev => {
      const prevAns = prev[questionId] ?? [];
      const newAns = [...prevAns];
      newAns[leftIndex] = rightIndex;
      return { ...prev, [questionId]: newAns };
    });
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        let prog = 0;

        // Lấy config
        const configRef = doc(db, "CONFIG", "config");
        const configSnap = await getDoc(configRef);
        prog += 50;
        setProgress(prog);
        if (!configSnap.exists()) return;

        const configData = configSnap.data();
        const docId = configData.deTracNghiem;
        if (!docId) return;

        // Lấy dữ liệu trắc nghiệm
        const docRef = doc(db, "TRACNGHIEM", docId);
        const docSnap = await getDoc(docRef);
        prog += 30;
        setProgress(prog);

        let loadedQuestions = [];

        if (docSnap.exists()) {
          const data = docSnap.data();
          setQuizClass(data.class || "");

          let saved = Array.isArray(data.questions) ? data.questions : [];
          saved = shuffleArray(saved);

          loadedQuestions = saved
            .map((q, index) => {
              const questionId = q.id ?? `q_${index}`;
              const questionText = typeof q.question === "string" ? q.question.trim() : "";

              let rawType = (q.type || "").toString().trim().toLowerCase();
              if (rawType === "matching") rawType = "matching";
              if (rawType === "single" || rawType === "multiple") rawType = rawType;

              const type = ["sort", "matching", "single", "multiple"].includes(rawType) ? rawType : null;
              if (!type) return null;

              // --- Câu ghép đôi ---
              if (type === "matching") {
                const pairs = Array.isArray(q.pairs) ? q.pairs : [];
                if (pairs.length === 0) return null;

                const leftOptions = pairs.map(p => p.left);
                const rightOptionsOriginal = pairs.map((p, idx) => ({ opt: p.right, idx }));
                const processedRightOptions = shuffleArray(rightOptionsOriginal);

                const originalRightIndexMap = {};
                processedRightOptions.forEach((item, newIndex) => {
                  originalRightIndexMap[item.idx] = newIndex;
                });

                const newCorrect = leftOptions.map((_, i) => originalRightIndexMap[i]);

                return {
                  ...q,
                  id: questionId,
                  type: "matching",
                  question: q.question || "",
                  leftOptions,
                  rightOptions: processedRightOptions.map(i => i.opt),
                  correct: newCorrect,
                  score: q.score ?? 1,
                };
              }

              // --- Câu sắp xếp ---
              else if (type === "sort") {
                const originalOptions = Array.isArray(q.options) && q.options.length > 0
                    ? q.options
                    : ["", "", "", ""];

                const options = [...originalOptions];
                const indexed = options.map((opt, idx) => ({ opt, idx }));
                const processed = q.sortType === "shuffle" ? shuffleArray(indexed) : indexed;

                return {
                    ...q,
                    id: questionId,
                    type: "sort",
                    question: questionText,
                    options,
                    initialSortOrder: processed.map(i => i.idx),
                    correct: options.map((_, i) => i),
                    score: q.score ?? 1,
                };
              }

              // --- Câu 1 lựa chọn / nhiều lựa chọn ---
              else if (type === "single" || type === "multiple") {
                const options = Array.isArray(q.options) && q.options.length > 0
                  ? q.options
                  : ["", "", "", ""];

                // Tạo indexed cho shuffle
                const indexed = options.map((opt, idx) => ({ opt, idx }));

                // Ưu tiên sortType === "shuffle" nếu có, nếu không dùng q.shuffleOptions
                const shouldShuffle = q.sortType === "shuffle" || q.shuffleOptions === true;
                const shuffled = shouldShuffle ? shuffleArray(indexed) : indexed;

                return {
                  ...q,
                  id: questionId,
                  type,
                  question: questionText,
                  options,
                  // Thứ tự hiển thị theo index gốc
                  displayOrder: shuffled.map(i => i.idx),
                  // Đáp án đúng: luôn là mảng index gốc
                  correct: Array.isArray(q.correct)
                    ? q.correct.map(Number)
                    : typeof q.correct === "number"
                    ? [q.correct]
                    : [],
                  score: q.score ?? 1,
                };
              }

              return null;
            })
            .filter(Boolean);

          // Lọc câu hợp lệ
          loadedQuestions = loadedQuestions.filter(q => {
            if (q.type === "matching") {
              return q.question.trim() !== "" && q.leftOptions.length > 0 && q.rightOptions.length > 0;
            } else if (q.type === "sort") {
              return q.question.trim() !== "" && q.options.length > 0;
            } else if (q.type === "single" || q.type === "multiple") {
              return q.question.trim() !== "" && q.options.length > 0 && Array.isArray(q.correct);
            }
            return false;
          });
        }

        setQuestions(loadedQuestions);
        setProgress(100);
      } catch (err) {
        console.error("❌ Lỗi khi load câu hỏi:", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const currentQuestion = questions[currentIndex] || null;
  const isEmptyQuestion = currentQuestion?.question === "";

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const handleCloseSnackbar = (event, reason) => { if (reason === "clickaway") return; setSnackbar(prev => ({ ...prev, open: false })); };

  const handleSubmit = async () => {
    if (!studentId || !studentClass || !selectedWeek) {
      setSnackbar(prev => ({ ...prev, open: false }));
      setTimeout(() => {
        setSnackbar(prev => ({
          ...prev,
          open: true,
          message: "Đây là trang test",
          severity: "info",
        }));
      }, 50);
      return;
    }

    // Kiểm tra câu chưa trả lời: chỉ single/multiple
    const unanswered = questions.filter(q => {
      const userAnswer = answers[q.id];

      if (q.type === "single") {
        // Hỗ trợ userAnswer có thể là number, string hoặc mảng [index]
        const ua =
          Array.isArray(userAnswer) ? userAnswer[0] :
          userAnswer === "" || userAnswer === null || userAnswer === undefined ? undefined :
          Number(userAnswer);

        return ua === undefined || Number.isNaN(ua);
      }

      if (q.type === "multiple") {
        return !Array.isArray(userAnswer) || userAnswer.length === 0;
      }

      return false;
    });

    if (unanswered.length > 0) {
      const unansweredIndexes = unanswered.map(q => {
        const index = questions.findIndex(item => item.id === q.id);
        return index >= 0 ? index + 1 : "?";
      });

      setUnansweredQuestions(unansweredIndexes);
      setOpenAlertDialog(true);
      return;
    }

    try {
      setSaving(true);

      // Tính điểm
      let total = 0;
      const maxScore = questions.reduce((sum, q) => sum + (q.score ?? 1), 0);

      questions.forEach(q => {
        const rawAnswer = answers[q.id];

        // SINGLE
        if (q.type === "single") {
          const ua = answers[q.id];
          if (typeof ua === "number" && (Array.isArray(q.correct) ? q.correct.includes(ua) : ua === q.correct)) {
            total += q.score ?? 1;
          }
        }

        // MULTIPLE
        else if (q.type === "multiple") {
          const userArray = Array.isArray(answers[q.id]) ? answers[q.id] : [];
          const correctArray = Array.isArray(q.correct) ? q.correct : [q.correct];
          const correctSet = new Set(correctArray);
          const userSet = new Set(userArray);
          const isCorrect =
            userSet.size === correctSet.size &&
            [...correctSet].every(x => userSet.has(x));
          if (isCorrect) total += q.score ?? 1;
        }

        // SORT
        else if (q.type === "sort") {
          const userAnswer = Array.isArray(rawAnswer) ? rawAnswer : [];
          if (userAnswer.length > 0) {
            const isCorrect = userAnswer.every((val, i) => val === q.correct[i]);
            if (isCorrect) total += q.score ?? 1;
          }
        }

        // MATCH hoặc MATCHING
        else if (q.type === "match" || q.type === "matching") {
          const userAnswer = Array.isArray(rawAnswer) ? rawAnswer : [];
          if (userAnswer.length > 0) {
            const isCorrect = userAnswer.every((val, i) => val === q.correct[i]);
            if (isCorrect) total += q.score ?? 1;
          }
        }
      });

      const percent = maxScore > 0 ? Math.round((total / maxScore) * 100) : 0;
      setScore(total);
      setSubmitted(true);

      // Chuỗi kết quả
      let resultText = "";
      if (percent >= 75) resultText = "Hoàn thành tốt";
      else if (percent >= 50) resultText = "Hoàn thành";
      else resultText = "Chưa hoàn thành";

      // Lưu vào Firestore
      const classKey = config?.mon === "Công nghệ" ? `${studentClass}_CN` : studentClass;
      const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

      await updateDoc(tuanRef, {
        [`${studentId}.hoVaTen`]: studentName,
        [`${studentId}.diemTracNghiem`]: resultText,
        [`${studentId}.diemTN`]: percent,
      }).catch(async err => {
        if (err.code === "not-found") {
          await setDoc(tuanRef, {
            [studentId]: {
              hoVaTen: studentName,
              status: "",
              diemTracNghiem: resultText,
              diemTN: percent,
            },
          });
        } else {
          throw err;
        }
      });

      console.log(`✅ Đã lưu: ${resultText} và diemTN: ${percent} cho học sinh ${studentId}`);
    } catch (err) {
      console.error("❌ Lỗi khi lưu điểm:", err);
    } finally {
      setSaving(false);
    }
  };


  const autoSubmit = async () => {
    if (!studentId || !studentClass || !selectedWeek) return;

    try {
      setSaving(true);

      // Tính điểm
      let total = 0;
      const maxScore = questions.reduce((sum, q) => sum + (q.score ?? 1), 0);

      questions.forEach(q => {
        const rawAnswer = answers[q.id];

        // SINGLE
        if (q.type === "single") {
          const ua = Array.isArray(rawAnswer)
            ? Number(rawAnswer[0])
            : rawAnswer === undefined || rawAnswer === null || rawAnswer === ""
            ? undefined
            : Number(rawAnswer);

          if (typeof ua === "number" && !Number.isNaN(ua)) {
            const correctArray = Array.isArray(q.correct) ? q.correct : [q.correct];
            if (correctArray.includes(ua)) {
              total += q.score ?? 1;
            }
          }
        }

        // MULTIPLE
        else if (q.type === "multiple") {
          const userArray = Array.isArray(rawAnswer) ? rawAnswer.map(Number) : [];
          const correctArray = Array.isArray(q.correct) ? q.correct : [q.correct];
          const correctSet = new Set(correctArray);
          const userSet = new Set(userArray);

          const isCorrect =
            userSet.size === correctSet.size &&
            [...correctSet].every(x => userSet.has(x));

          if (isCorrect) total += q.score ?? 1;
        }

        // SORT
        else if (q.type === "sort") {
          const userAnswer = Array.isArray(rawAnswer) ? rawAnswer : [];
          if (userAnswer.length > 0) {
            const isCorrect = userAnswer.every((val, i) => val === q.correct[i]);
            if (isCorrect) total += q.score ?? 1;
          }
        }

        // MATCH hoặc MATCHING
        else if (q.type === "match" || q.type === "matching") {
          const userAnswer = Array.isArray(rawAnswer) ? rawAnswer : [];
          if (userAnswer.length > 0) {
            const isCorrect = userAnswer.every((val, i) => val === q.correct[i]);
            if (isCorrect) total += q.score ?? 1;
          }
        }
      });

      const percent = maxScore > 0 ? Math.round((total / maxScore) * 100) : 0;
      setScore(total);
      setSubmitted(true);

      // Chuỗi kết quả
      const resultText =
        percent >= 75 ? "Hoàn thành tốt" :
        percent >= 50 ? "Hoàn thành" :
        "Chưa hoàn thành";

      // Lưu vào Firestore
      const classKey = config?.mon === "Công nghệ" ? `${studentClass}_CN` : studentClass;
      const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

      await updateDoc(tuanRef, {
        [`${studentId}.hoVaTen`]: studentName,
        [`${studentId}.diemTracNghiem`]: resultText,
        [`${studentId}.diemTN`]: percent,
      }).catch(async err => {
        if (err.code === "not-found") {
          await setDoc(tuanRef, {
            [studentId]: {
              hoVaTen: studentName,
              status: "",
              diemTracNghiem: resultText,
              diemTN: percent,
            },
          });
        } else {
          throw err;
        }
      });

      console.log(`✅ AutoSubmit: ${resultText}, diemTN: ${percent} cho học sinh ${studentId}`);
    } catch (err) {
      console.error("❌ Lỗi khi autoSubmit:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => currentIndex < questions.length - 1 && setCurrentIndex(currentIndex + 1);
  const handlePrev = () => currentIndex > 0 && setCurrentIndex(currentIndex - 1);

  const convertPercentToScore = (percent) => {
    if (percent === undefined || percent === null) return "?";
    const raw = percent / 10;
    const decimal = raw % 1;
    if (decimal < 0.25) return Math.floor(raw);
    if (decimal < 0.75) return Math.floor(raw) + 0.5;
    return Math.ceil(raw);
  };

  useEffect(() => {
    if (config.timeLimit) setTimeLeft(config.timeLimit * 60);
  }, [config.timeLimit]);

  function reorder(list, startIndex, endIndex) {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  }

  // Giả sử bạn đang dùng useState để lưu đáp án

// Single: luôn lưu là số index
const handleSingleSelect = (questionId, optionIndex) => {
  // Đảm bảo là number (tránh trường hợp optionIndex là string)
  const idx = Number(optionIndex);
  setAnswers(prev => ({ ...prev, [questionId]: idx }));
};

// Multiple: lưu là mảng số
const handleMultipleSelect = (questionId, optionIndex, checked) => {
  const idx = Number(optionIndex);
  setAnswers(prev => {
    const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
    const next = checked
      ? Array.from(new Set([...current, idx]))
      : current.filter(x => x !== idx);
    return { ...prev, [questionId]: next };
  });
};

return (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
      pt: { xs: 2, sm: 3 },
      px: { xs: 1, sm: 2 },
    }}
  >
    <Paper
      sx={{
        p: { xs: 2, sm: 4 },
        borderRadius: 3,
        width: "100%",
        maxWidth: 1000,
        minWidth: { xs: "auto", sm: 600 },
        minHeight: { xs: "auto", sm: 500 },
        display: "flex",
        flexDirection: "column",
        gap: 2,
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Nút thoát */}
      <Tooltip title="Thoát trắc nghiệm" arrow>
        <IconButton
          onClick={() => {
            if (submitted) {
              navigate(-1);
            } else {
              setOpenExitConfirm(true);
            }
          }}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "#f44336",
            bgcolor: "rgba(255,255,255,0.9)",
            "&:hover": { bgcolor: "rgba(255,67,54,0.2)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Tooltip>

      {/* Thông tin học sinh */}
      <Box
        sx={{
          p: 1.5,
          border: "2px solid #1976d2",
          borderRadius: 2,
          color: "#1976d2",
          width: "fit-content",
          mb: 2,
          position: { xs: "relative", sm: "absolute" },
          top: { sm: 16 },
          left: { sm: 16 },
          alignSelf: { xs: "flex-start", sm: "auto" },
          bgcolor: { xs: "#fff", sm: "transparent" },
          zIndex: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          {studentInfo.name}
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          Lớp: {studentInfo.class}
        </Typography>
      </Box>

      {/* Tiêu đề */}
      <Typography
        variant="h5"
        fontWeight="bold"
        sx={{ color: "#1976d2", mb: { xs: 1, sm: -1 }, textAlign: "center" }}
      >
        LUYỆN TẬP{quizClass ? ` - ${quizClass.toUpperCase()}` : ""}
      </Typography>

      {/* Đồng hồ với vị trí cố định */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 0.5,
          mb: -2,
          minHeight: 40, // giữ khoảng trống luôn
          width: "100%",
        }}
      >
        {/* Nội dung đồng hồ chỉ hiển thị khi started && !loading */}
        {started && !loading && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 3,
              py: 0.5,
              borderRadius: 2,
              bgcolor: "#fff", // tùy chỉnh nếu muốn nền
            }}
          >
            <AccessTimeIcon sx={{ color: "#d32f2f" }} />
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#d32f2f" }}>
              {formatTime(timeLeft)}
            </Typography>
          </Box>
        )}

        {/* Đường gạch ngang màu xám nhạt luôn hiển thị */}
        <Box
          sx={{
            width: "100%",
            height: 1,
            bgcolor: "#e0e0e0", // màu xám nhạt
            mt: 0,
          }}
        />
      </Box>


      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1, width: "100%" }}>
          <Box sx={{ width: { xs: "60%", sm: "30%" } }}>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 3, borderRadius: 3 }} />
            <Typography variant="body2" sx={{ mt: 0.5, textAlign: "center" }}>
              🔄 Đang tải... {progress}%
            </Typography>
          </Box>
        </Box>
      )}

      {/* KHU VỰC HIỂN THỊ CÂU HỎI */}
      {!loading && currentQuestion && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Câu {currentIndex + 1}: {currentQuestion.question}
          </Typography>

          {/* SORT */}
          {currentQuestion.type === "sort" && (
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination || submitted || !started) return;
                const currentOrder =
                  answers[currentQuestion.id] ?? currentQuestion.options.map((_, idx) => idx);
                const newOrder = reorder(currentOrder, result.source.index, result.destination.index);
                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: newOrder }));
              }}
            >
              <Droppable droppableId="sort-options">
                {(provided) => (
                  <Stack {...provided.droppableProps} ref={provided.innerRef} spacing={1.5}>
                    {(answers[currentQuestion.id] ?? currentQuestion.initialSortOrder).map((optIdx, pos) => {
                      const isCorrect = submitted && currentQuestion.correct[pos] === optIdx;
                      return (
                        <Draggable key={optIdx} draggableId={String(optIdx)} index={pos} isDragDisabled={submitted || !started}>
                          {(provided, snapshot) => (
                            <Box
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{
                                p: 1.5,
                                borderRadius: 1,
                                bgcolor: submitted
                                  ? isCorrect
                                    ? "#c8e6c9"
                                    : "#ffcdd2"
                                  : snapshot.isDragging
                                  ? "#e3f2fd"
                                  : "#fafafa",
                                border: "1px solid #90caf9",
                                cursor: submitted || !started ? "default" : "grab",
                                boxShadow: snapshot.isDragging ? 2 : 0,
                              }}
                            >
                              <Typography variant="body1" fontWeight="400">
                                {currentQuestion.options[optIdx]}
                              </Typography>
                            </Box>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </Stack>
                )}
              </Droppable>
            </DragDropContext>
          )}

          {/* MATCH */}
          {currentQuestion.type === "matching" && (
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination || submitted || !started) return;
                const currentOrder =
                  answers[currentQuestion.id] ?? currentQuestion.rightOptions.map((_, idx) => idx);
                const newOrder = reorder(currentOrder, result.source.index, result.destination.index);
                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: newOrder }));
              }}
            >
              <Stack direction="row" spacing={4} justifyContent="center" sx={{ width: "100%" }}>
                {/* Cột trái: câu hỏi ghép đôi */}
                <Stack spacing={2} sx={{ flex: 1 }}>
                  {currentQuestion.leftOptions.map((left, i) => (
                    <Paper
                      key={i}
                      sx={{
                        p: 1.5,
                        minWidth: 240,
                        textAlign: "center",
                        bgcolor: "#fafafa",
                        border: "1px solid #90caf9",
                        fontSize: "1rem",
                        fontWeight: 400,
                        fontFamily: "Arial, Helvetica, sans-serif",
                      }}
                    >
                      {left}
                    </Paper>
                  ))}
                </Stack>

                {/* Cột phải: đáp án kéo thả */}
                <Droppable droppableId="right-options">
                  {(provided) => (
                    <Stack spacing={2} ref={provided.innerRef} {...provided.droppableProps} sx={{ flex: 1 }}>
                      {(answers[currentQuestion.id] ?? currentQuestion.rightOptions.map((_, idx) => idx)).map(
                        (optIdx, pos) => {
                          const isCorrect = submitted && currentQuestion.correct[pos] === optIdx;
                          return (
                            <Draggable
                              key={optIdx}
                              draggableId={String(optIdx)}
                              index={pos}
                              isDragDisabled={submitted || !started}
                            >
                              {(provided, snapshot) => (
                                <Paper
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  sx={{
                                    p: 1.5,
                                    minWidth: 240,
                                    textAlign: "center",
                                    fontSize: "1rem",
                                    fontWeight: 400,
                                    fontFamily: "Arial, Helvetica, sans-serif",
                                    bgcolor: submitted
                                      ? isCorrect
                                        ? "#c8e6c9"
                                        : "#ffcdd2"
                                      : snapshot.isDragging
                                      ? "#e3f2fd"
                                      : "#fafafa",
                                    border: "1px solid #90caf9",
                                    cursor: submitted || !started ? "default" : "grab",
                                  }}
                                >
                                  {currentQuestion.rightOptions[optIdx]}
                                </Paper>
                              )}
                            </Draggable>
                          );
                        }
                      )}
                      {provided.placeholder}
                    </Stack>
                  )}
                </Droppable>
              </Stack>
            </DragDropContext>
          )}

          {/* 1. Single */}
          {currentQuestion.type === "single" && (
            <Stack spacing={2}>
              {currentQuestion.displayOrder.map((optIdx) => {
                const selected = answers[currentQuestion.id] === optIdx;

                const correctArray = Array.isArray(currentQuestion.correct)
                  ? currentQuestion.correct
                  : [currentQuestion.correct];

                const isCorrect = submitted && correctArray.includes(optIdx);
                const isWrong = submitted && selected && !correctArray.includes(optIdx);

                return (
                  <Paper
                    key={optIdx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 1,
                      bgcolor: submitted
                        ? isCorrect
                          ? "#c8e6c9"
                          : isWrong
                          ? "#ffcdd2"
                          : "#fafafa"
                        : "#fafafa",
                      border: "1px solid #90caf9",
                      minHeight: 30,
                    }}
                  >
                    <Radio
                      checked={selected}
                      onChange={() => {
                        if (submitted || !started) return;
                        // Lưu index gốc của option
                        handleSingleSelect(currentQuestion.id, optIdx);
                      }}
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body1">
                      {currentQuestion.options[optIdx]}
                    </Typography>
                  </Paper>
                );
              })}
            </Stack>
          )}

          {/* 2. Multiple */}
          {currentQuestion.type === "multiple" && (
            <Stack spacing={2}>
              {currentQuestion.displayOrder.map((optIdx) => {
                const userAns = answers[currentQuestion.id] || [];
                const checked = userAns.includes(optIdx);

                const isCorrect = submitted && currentQuestion.correct.includes(optIdx);
                const isWrong = submitted && checked && !currentQuestion.correct.includes(optIdx);

                return (
                  <Paper
                    key={optIdx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 1,
                      bgcolor: submitted
                        ? isCorrect
                          ? "#c8e6c9"
                          : isWrong
                          ? "#ffcdd2"
                          : "#fafafa"
                        : "#fafafa",
                      border: "1px solid #90caf9",
                      minHeight: 30,
                    }}
                  >
                    <Checkbox
                      checked={checked}
                      onChange={() => {
                        if (submitted || !started) return;
                        // Lưu index gốc của option
                        handleMultipleSelect(currentQuestion.id, optIdx, !checked);
                      }}
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body1">
                      {currentQuestion.options[optIdx]}
                    </Typography>
                  </Paper>
                );
              })}
            </Stack>
          )}

        </>
      )}

      {/* Nút điều hướng và bắt đầu/nộp bài */}
      <Stack direction="column" sx={{ width: "100%", mt: 3 }} spacing={0}>
        {!started && !loading ? (
          <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setStarted(true)}
              sx={{ width: { xs: "150px", sm: "150px" } }}
            >
              Bắt đầu
            </Button>
          </Box>
        ) : null}

        {started && !loading && (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%" }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handlePrev}
              disabled={currentIndex === 0}
              sx={{
                width: { xs: "150px", sm: "150px" },
                bgcolor: currentIndex === 0 ? "#e0e0e0" : "#bbdefb",
                borderRadius: 1,
                color: "#0d47a1",
                "&:hover": { bgcolor: currentIndex === 0 ? "#e0e0e0" : "#90caf9" },
              }}
            >
              Câu trước
            </Button>

            {!loading && submitted && (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  color: "#1976d2",
                  textAlign: "center",
                  bgcolor: "#e3f2fd",
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  boxShadow: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontSize: { xs: "1rem", sm: "1.2rem" },
                }}
              >
                {convertPercentToScore(
                  Math.round((score / questions.reduce((sum, q) => sum + (q.score ?? 1), 0)) * 100)
                ) >= 5 ? (
                  <CheckCircleIcon sx={{ color: "#4caf50" }} />
                ) : (
                  <HighlightOffIcon sx={{ color: "#f44336" }} />
                )}
                Điểm:{" "}
                {convertPercentToScore(
                  Math.round((score / questions.reduce((sum, q) => sum + (q.score ?? 1), 0)) * 100)
                )}
              </Typography>
            )}

            {currentIndex < questions.length - 1 ? (
              <Button
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                onClick={handleNext}
                sx={{
                  width: { xs: "150px", sm: "150px" },
                  bgcolor: "#bbdefb",
                  borderRadius: 1,
                  color: "#0d47a1",
                  "&:hover": { bgcolor: "#90caf9" },
                }}
              >
                Câu sau
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={submitted || isEmptyQuestion}
                sx={{ width: { xs: "120px", sm: "150px" }, borderRadius: 1 }}
              >
                Nộp bài
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>

    {/* Dialog cảnh báo chưa làm hết */}
    <Dialog
      open={openAlertDialog}
      onClose={() => setOpenAlertDialog(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 3,
          bgcolor: "#e3f2fd",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: "#ffc107",
            color: "#fff",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1.5,
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          ⚠️
        </Box>
        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#ff6f00" }}>
          Chưa hoàn thành
        </DialogTitle>
      </Box>

      <DialogContent>
        <Typography sx={{ fontSize: 16, color: "#6b4c00" }}>
          Bạn chưa chọn đáp án cho câu: {unansweredQuestions.join(", ")}.<br />
          Vui lòng trả lời tất cả câu hỏi trước khi nộp.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        <Button
          variant="contained"
          color="warning"
          onClick={() => setOpenAlertDialog(false)}
          sx={{ borderRadius: 2, px: 4 }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>

    {/* Dialog xác nhận thoát */}
    <Dialog
      open={openExitConfirm}
      onClose={() => setOpenExitConfirm(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 3,
          bgcolor: "#e3f2fd",
          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.15)",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: "#42a5f5",
            color: "#fff",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1.5,
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          ℹ️
        </Box>
        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0" }}>
          Xác nhận thoát
        </DialogTitle>
      </Box>

      <DialogContent>
        <Typography sx={{ fontSize: 16, color: "#0d47a1" }}>
          Bạn có chắc chắn muốn thoát khỏi bài trắc nghiệm?<br />
          Mọi tiến trình chưa nộp sẽ bị mất.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        <Button
          variant="outlined"
          onClick={() => setOpenExitConfirm(false)}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Hủy
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => navigate(-1)}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Thoát
        </Button>
      </DialogActions>
    </Dialog>

    {/* Snackbar */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={handleCloseSnackbar}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        onClose={handleCloseSnackbar}
        severity={snackbar.severity}
        sx={{ width: "100%" }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  </Box>
);

}
