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
} from "@mui/material";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useContext } from "react";
import { ConfigContext } from "../context/ConfigContext";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";


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

  // đầu component
  const location = useLocation();
  const { studentId, studentName, studentClass, selectedWeek, mon } = location.state || {};
  const navigate = useNavigate(); // dùng để điều hướng về trang trước

  // dùng studentName và studentClass thay cho studentInfo cứng
  const studentInfo = {
    name: studentName || "Nguyễn Văn A",
    class: studentClass || "5A"
  };


  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        let prog = 0;
        const configRef = doc(db, "CONFIG", "config");
        const configSnap = await getDoc(configRef);
        prog += 50;
        setProgress(prog);

        if (!configSnap.exists()) return;

        const configData = configSnap.data();
        const docId = configData.deTracNghiem;
        if (!docId) return;

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
          loadedQuestions = saved.map(q => {
            if (!q.options) q.options = ["", "", "", ""];
            const sortType = q.sortType || data.sortType || "default";
            const indexedOptions = q.options.map((opt, idx) => ({ opt, idx }));
            const processedOptions = sortType === "shuffle" ? shuffleArray(indexedOptions) : indexedOptions;
            let newCorrect;
            if (q.type === "single") {
              newCorrect = processedOptions.findIndex(item => item.idx === q.correct);
            } else if (q.type === "multiple") {
              newCorrect = processedOptions
                .map((item, i) => (q.correct.includes(item.idx) ? i : null))
                .filter(x => x !== null);
            }
            return {
              ...q,
              options: processedOptions.map(item => item.opt),
              correct: newCorrect ?? null,
            };
          });
        }

        setQuestions(loadedQuestions);
        prog = 100;
        setProgress(prog);
      } catch (err) {
        console.error(err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const currentQuestion = questions[currentIndex] || null;
  const isEmptyQuestion = currentQuestion?.question === "";

  const handleSingleSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleMultipleSelect = (questionId, optionIndex, checked) => {
    setAnswers(prev => {
      const prevArr = prev[questionId] || [];
      const newArr = checked
        ? [...prevArr, optionIndex]
        : prevArr.filter(x => x !== optionIndex);
      return { ...prev, [questionId]: newArr };
    });
  };


  const handleSubmit = async () => {
    if (!studentId || !studentClass || !selectedWeek) {
      console.warn("⚠️ Thiếu thông tin: studentId, studentClass hoặc selectedWeek");
      return;
    }

    // 🔹 Kiểm tra câu hỏi chưa trả lời
    const unanswered = questions.filter(q => {
      const userAnswer = answers[q.id];
      if (q.type === "single") return userAnswer === undefined || userAnswer === null;
      if (q.type === "multiple") return !Array.isArray(userAnswer) || userAnswer.length === 0;
      return false;
    });

    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered.map((q, i) => i + 1));
      setOpenAlertDialog(true);
      return; // ⚠️ dừng nộp bài nếu còn câu chưa trả lời
    }

    try {
      setSaving(true);

      // 🔹 Tính điểm
      let total = 0;
      const maxScore = questions.reduce((sum, q) => sum + (q.score ?? 1), 0);

      questions.forEach(q => {
        const userAnswer = answers[q.id];
        if (q.type === "single" && userAnswer === q.correct) total += q.score ?? 1;
        else if (q.type === "multiple") {
          const correctSet = new Set(q.correct);
          const userSet = new Set(userAnswer || []);
          if (userSet.size === correctSet.size && [...userSet].every(x => correctSet.has(x))) {
            total += q.score ?? 1;
          }
        }
      });

      const percent = maxScore > 0 ? Math.round((total / maxScore) * 100) : 0;
      setScore(total);
      setSubmitted(true);

      // 🔹 Lưu điểm vào Firestore
      const classKey = config?.mon === "Công nghệ" ? `${studentClass}_CN` : studentClass;
      const tuanRef = doc(db, `DGTX/${classKey}/tuan/tuan_${selectedWeek}`);

      await updateDoc(tuanRef, {
        [`${studentId}.hoVaTen`]: studentName,
        [`${studentId}.status`]: "",
        [`${studentId}.diemTracNghiem`]: percent,
      }).catch(async (err) => {
        if (err.code === "not-found") {
          await setDoc(tuanRef, {
            [studentId]: { hoVaTen: studentName, status: "", diemTracNghiem: percent },
          });
        } else throw err;
      });

      console.log(`✅ Đã lưu diemTracNghiem: ${percent}% cho học sinh ${studentId}`);
    } catch (err) {
      console.error("❌ Lỗi khi lưu diemTracNghiem:", err);
    } finally {
      setSaving(false);
    }
  };


  const handleSubmit1 = () => {
    const unanswered = questions.filter(q => {
      const userAnswer = answers[q.id];
      if (q.type === "single") return userAnswer === undefined || userAnswer === null;
      if (q.type === "multiple") return !Array.isArray(userAnswer) || userAnswer.length === 0;
      return false;
    });

    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered.map((q, i) => i + 1));
      setOpenAlertDialog(true);
      return;
    }

    let total = 0;
    questions.forEach(q => {
      const userAnswer = answers[q.id];
      if (q.type === "single" && userAnswer === q.correct) {
        total += q.score ?? 1;
      } else if (q.type === "multiple") {
        const correctSet = new Set(q.correct);
        const userSet = new Set(userAnswer || []);
        if (userSet.size === correctSet.size && [...userSet].every(x => correctSet.has(x))) {
          total += q.score ?? 1;
        }
      }
    });

    setScore(total);
    setSubmitted(true);
  };

  const handleNext = () => currentIndex < questions.length - 1 && setCurrentIndex(currentIndex + 1);
  const handlePrev = () => currentIndex > 0 && setCurrentIndex(currentIndex - 1);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "linear-gradient(to bottom, #e3f2fd, #bbdefb)",
        pt: 3,
        px: 2,
      }}
    >
      <Paper
        sx={{
          p: 4,
          borderRadius: 3,
          width: "100%",
          maxWidth: 1000,
          minWidth: 1000,
          minHeight: 500,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          position: "relative"
        }}
      >
        <Tooltip title="Thoát trắc nghiệm" arrow>
          <IconButton
            onClick={() => navigate(-1)} // trở về trang Học sinh
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

        <Box
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            p: 1.5,
            border: "2px solid #1976d2", // viền nổi bật
            borderRadius: 2,
            color: "#1976d2",             // chữ cùng tông với viền
          }}
        >
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            sx={{ lineHeight: 1.4 }}
          >
            {studentInfo.name}
          </Typography>
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            sx={{ lineHeight: 1.4 }}
          >
            Lớp: {studentInfo.class}
          </Typography>
        </Box>

        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ color: "#1976d2", mb: 2, textAlign: "center" }}
        >
          LUYỆN TẬP{quizClass ? ` - ${quizClass.toUpperCase()}` : ""}
        </Typography>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 1, width: "100%" }}>
            <Box sx={{ width: "25%" }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ height: 3, borderRadius: 3 }} // giảm độ cao thanh tiến trình
              />
              <Typography 
                variant="body2" 
                sx={{ mt: 0.5, textAlign: "center", fontSize: "0.85rem" }} // giảm khoảng cách và font nhỏ hơn
              >
                🔄 Đang tải... {progress}%
              </Typography>
            </Box>
          </Box>
        )}

        {!loading && currentQuestion && (
          <>
            <div style={{ borderBottom: "1px solid #ccc", width: "100%", marginTop: 4 }} />

            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Câu {currentIndex + 1}: {currentQuestion.question}
            </Typography>

            {currentQuestion.type === "single" ? (
              <RadioGroup
                value={answers[currentQuestion.id] ?? ""}
                onChange={e => handleSingleSelect(currentQuestion.id, parseInt(e.target.value))}
              >
                {currentQuestion.options.map((opt, i) => {
                  const isCorrect = submitted && i === currentQuestion.correct;
                  const isWrong = submitted && answers[currentQuestion.id] === i && i !== currentQuestion.correct;
                  return (
                    <FormControlLabel
                      key={i}
                      value={i}
                      control={<Radio />}
                      label={opt}
                      sx={{
                        mb: 2,
                        bgcolor: isCorrect ? "#c8e6c9" : isWrong ? "#ffcdd2" : "transparent",
                        borderRadius: 1,
                        px: 1,
                        "& .MuiFormControlLabel-label": { fontSize: "1.1rem", lineHeight: 1.5 }
                      }}
                      disabled={submitted}
                    />
                  );
                })}
              </RadioGroup>
            ) : (
              <Stack>
                {currentQuestion.options.map((opt, i) => {
                  const checked = answers[currentQuestion.id]?.includes(i) ?? false;
                  const isCorrect = submitted && currentQuestion.correct.includes(i);
                  const isWrong = submitted && checked && !currentQuestion.correct.includes(i);
                  return (
                    <FormControlLabel
                      key={i}
                      control={
                        <Checkbox
                          checked={checked}
                          onChange={e => handleMultipleSelect(currentQuestion.id, i, e.target.checked)}
                          disabled={submitted}
                        />
                      }
                      label={opt}
                      sx={{
                        mb: 2,
                        bgcolor: isCorrect ? "#c8e6c9" : isWrong ? "#ffcdd2" : "transparent",
                        borderRadius: 1,
                        px: 1,
                        "& .MuiFormControlLabel-label": { fontSize: "1.1rem", lineHeight: 1.5 }
                      }}
                    />
                  );
                })}
              </Stack>
            )}
          </>
        )}

        <Stack direction="row" spacing={2} justifyContent="space-between" mt={3}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handlePrev}
            disabled={currentIndex === 0}
            sx={{
              bgcolor: currentIndex === 0 ? "#e0e0e0" : "#bbdefb",
              borderRadius: 2,
              color: "#0d47a1",
              "&:hover": {
                bgcolor: currentIndex === 0 ? "#e0e0e0" : "#90caf9",
              },
            }}
          >
            Câu trước
          </Button>

          {currentIndex < questions.length - 1 ? (
            <Button
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              onClick={handleNext}
              sx={{
                bgcolor: "#bbdefb",
                borderRadius: 2,
                color: "#0d47a1",
                "&:hover": {
                  bgcolor: "#90caf9",
                },
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
              sx={{ borderRadius: 2, px: 4 }}
            >
              Nộp bài
            </Button>
          )}
        </Stack>

        {submitted && (
          <Typography
            variant="h6"
            sx={{ color: "#1976d2", fontWeight: "bold", mt: 2, textAlign: "center" }}
          >
            ✅ Tổng điểm: {score}/{questions.reduce((sum, q) => sum + (q.score ?? 1), 0)}
          </Typography>
        )}
      </Paper>

      {/* Dialog cảnh báo nếu chưa chọn câu */}
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
          }
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
    </Box>
  );
}
