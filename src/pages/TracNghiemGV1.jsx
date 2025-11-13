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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function TracNghiemGV() {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("teacherQuiz") || "[]");
      if (Array.isArray(saved) && saved.length) setQuestions(saved);
    } catch (err) {
      console.error("Không thể load teacherQuiz:", err);
    }
  }, []);

  const createEmptyQuestion = () => ({
    id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    question: "",
    options: ["", "", "", ""],
    type: "single",
    correct: null,
  });

  const handleAddQuestion = () => {
    const newQ = createEmptyQuestion();
    setQuestions((prev) => [...prev, newQ]);
  };

  const updateQuestionAt = (index, patch) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleQuestionTextChange = (index, text) => {
    updateQuestionAt(index, { question: text });
  };

  const handleOptionChange = (qIndex, optIndex, text) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      const opts = [...q.options];
      opts[optIndex] = text;
      q.options = opts;
      next[qIndex] = q;
      return next;
    });
  };

  const handleTypeChange = (qIndex, newType) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      q.type = newType;
      q.correct = newType === "single" ? null : [];
      next[qIndex] = q;
      return next;
    });
  };

  const handleSelectCorrect = (qIndex, optIndex) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };

      if (q.type === "single") {
        q.correct = optIndex;
      } else {
        const prevArr = Array.isArray(q.correct) ? [...q.correct] : [];
        if (prevArr.includes(optIndex)) {
          q.correct = prevArr.filter((x) => x !== optIndex);
        } else {
          q.correct = [...prevArr, optIndex];
        }
      }

      next[qIndex] = q;
      return next;
    });
  };

  const handleDeleteQuestion = (index) => {
    if (!window.confirm("Xóa câu hỏi này?")) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = () => {
    // Kiểm tra toàn bộ câu hỏi
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question || !q.question.trim()) {
        alert(`Câu ${i + 1} chưa có nội dung.`);
        return;
        }

        const nonEmptyOpts = (q.options || []).filter(o => o && o.trim());
        if (nonEmptyOpts.length < 2) {
        alert(`Câu ${i + 1} cần ít nhất 2 phương án.`);
        return;
        }

        if (q.type === "single" && typeof q.correct !== "number") {
        alert(`Câu ${i + 1} chưa chọn đáp án đúng.`);
        return;
        }

        if (q.type === "multiple" && (!Array.isArray(q.correct) || q.correct.length === 0)) {
        alert(`Câu ${i + 1} chưa chọn đáp án đúng.`);
        return;
        }

        if (!q.score || q.score <= 0) {
        alert(`Câu ${i + 1} chưa đặt điểm hoặc điểm <= 0.`);
        return;
        }
    }

    // Nếu tất cả hợp lệ, lưu vào localStorage
    localStorage.setItem("teacherQuiz", JSON.stringify(questions));
    alert("Đã lưu đề vào trình duyệt (localStorage).");
    };


  const isQuestionValid = (q) => {
    if (!q.question || !q.question.trim()) return false;
    const nonEmptyOpts = (q.options || []).filter((o) => o && o.trim());
    if (nonEmptyOpts.length < 2) return false;
    if (q.type === "single") return typeof q.correct === "number";
    if (q.type === "multiple") return Array.isArray(q.correct) && q.correct.length > 0;
    return false;
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
    <Typography variant="h4" fontWeight="bold" sx={{ mb: 2, color: "#1976d2" }}>
      Soạn đề trắc nghiệm
    </Typography>

    <Stack spacing={2} sx={{ width: "100%", maxWidth: 1200 }}>
      {questions.map((q, qi) => (
        <Paper key={q.id} sx={{ p: 3, borderRadius: 2 }} elevation={2}>
          <Stack spacing={1}>
            {/* Câu 1 + chọn dạng câu hỏi + điểm + shuffle + trạng thái */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h6" fontWeight="bold">
                  Câu {qi + 1}
                </Typography>
                <Select
                  value={q.type}
                  onChange={(e) => handleTypeChange(qi, e.target.value)}
                  size="small"
                  sx={{ width: 150 }}
                >
                  <MenuItem value="single">1 đáp án</MenuItem>
                  <MenuItem value="multiple">Nhiều đáp án</MenuItem>
                </Select>

                <TextField
                  label="Điểm"
                  type="number"
                  size="small"
                  value={q.score || ""}
                  onChange={(e) => updateQuestionAt(qi, { score: parseFloat(e.target.value) || 0 })}
                  sx={{ width: 80 }}
                  inputProps={{ min: 0 }}
                />

                <Select
                  value={q.shuffle ? "shuffle" : "fixed"}
                  onChange={(e) =>
                    updateQuestionAt(qi, { shuffle: e.target.value === "shuffle" })
                  }
                  size="small"
                  sx={{ width: 120 }}
                >
                  <MenuItem value="fixed">Cố định</MenuItem>
                  <MenuItem value="shuffle">Đảo câu</MenuItem>
                </Select>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                    sx={{
                    color: isQuestionValid(q) ? "green" : "red",
                    fontSize: '0.875rem', // cỡ chữ giống dropdown
                    fontWeight: 500
                    }}
                >
                    {isQuestionValid(q) ? "Hợp lệ" : "Chưa hợp lệ"}
                </Typography>
                <IconButton size="small" color="error" onClick={() => handleDeleteQuestion(qi)}>
                    <DeleteIcon />
                </IconButton>
                </Stack>

            </Stack>

            <TextField
              fullWidth
              placeholder="Nhập nội dung câu hỏi..."
              multiline
              minRows={2}
              value={q.question}
              onChange={(e) => handleQuestionTextChange(qi, e.target.value)}
            />

            {/* Phương án */}
            <Stack spacing={1}>
              {(q.options || ["", "", "", ""]).map((opt, oi) => (
                <Stack key={oi} direction="row" spacing={2} alignItems="flex-start">
                  {q.type === "single" ? (
                    <Radio
                      checked={q.correct === oi}
                      onChange={() => handleSelectCorrect(qi, oi)}
                      sx={{ mt: 1 }}
                    />
                  ) : (
                    <Checkbox
                      checked={Array.isArray(q.correct) && q.correct.includes(oi)}
                      onChange={() => handleSelectCorrect(qi, oi)}
                      sx={{ mt: 1 }}
                    />
                  )}

                  <TextField
                    fullWidth
                    placeholder={`Nhập phương án ${oi + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(qi, oi, e.target.value)}
                    multiline
                    minRows={1}
                    maxRows={5}
                    sx={{ '& textarea': { lineHeight: 1.4 } }}
                  />
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Paper>
      ))}

      {/* Nút duy nhất sau tất cả card */}
      <Stack direction="row" spacing={2}>
        <Button variant="contained" color="primary" onClick={handleAddQuestion}>
          Thêm câu hỏi
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleSaveAll}
          disabled={questions.length === 0}
        >
          Lưu đề
        </Button>
      </Stack>
    </Stack>
  </Box>
);


}
