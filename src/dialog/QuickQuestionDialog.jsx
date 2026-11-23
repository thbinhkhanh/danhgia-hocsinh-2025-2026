
import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, IconButton, TextField,
  Paper, Stack, Chip, Fade, Divider,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

const createQuestion = () => ({
  id: Date.now() + Math.random(),
  question: "",
  answer: "",
});

export default function QuickQuestionDialog({ open, onClose }) {
  const [questions, setQuestions] = useState([createQuestion()]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const current = questions[currentIndex];

  const updateQuestion = (id, field, value) => {
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createQuestion()]);
    setCurrentIndex(questions.length);
    setShowAnswer(false);
  };

  const deleteQuestion = (id) => {
    setQuestions((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.length ? next : [createQuestion()];
    });
    setCurrentIndex(0);
    setShowAnswer(false);
  };

  const randomQuestion = () => {
    if (!questions.length) return;
    const available = questions
      .map((_, index) => index)
      .filter((index) => index !== currentIndex);

    const pool = available.length ? available : [currentIndex];
    setCurrentIndex(pool[Math.floor(Math.random() * pool.length)]);
    setShowAnswer(false);
  };

  const nextQuestion = () => {
    setCurrentIndex((prev) => (prev + 1) % questions.length);
    setShowAnswer(false);
  };

  const handleClose = () => {
    setShowAnswer(false);
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      TransitionComponent={Fade}
      PaperProps={{
        sx: { borderRadius: 3, overflow: "hidden" },
      }}
    >
      <DialogTitle sx={{ px: 2.5, py: 2, bgcolor: "#eff6ff" }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{
            width: 42, height: 42, borderRadius: 2,
            bgcolor: "#dbeafe", color: "#2563eb",
            display: "grid", placeItems: "center",
            fontSize: 23,
          }}>
            ❓
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={800} color="#1e3a8a">
              THẺ CÂU HỎI NHANH
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tạo câu hỏi, rút thăm và khám phá đáp án
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={1}
          >
            <Chip
              label={`Câu hỏi ${currentIndex + 1}/${questions.length}`}
              color="primary"
              variant="outlined"
            />
            <Button
              variant="outlined"
              startIcon={<ShuffleRoundedIcon />}
              onClick={randomQuestion}
            >
              Rút thăm ngẫu nhiên
            </Button>
          </Stack>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              minHeight: 230,
              borderRadius: 3,
              border: "2px dashed #93c5fd",
              bgcolor: "#f8fbff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <Typography
              variant="overline"
              textAlign="center"
              color="primary"
              fontWeight={800}
            >
              CÂU HỎI
            </Typography>
            <Typography
              variant="h5"
              textAlign="center"
              fontWeight={800}
              sx={{ overflowWrap: "anywhere" }}
            >
              {current?.question || "Hãy nhập nội dung câu hỏi bên dưới"}
            </Typography>

            {showAnswer && (
              <Fade in>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2, borderRadius: 2,
                    bgcolor: "#ecfdf5",
                    border: "1px solid #86efac",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="success.dark"
                    fontWeight={800}
                  >
                    ĐÁP ÁN
                  </Typography>
                  <Typography
                    textAlign="center"
                    fontWeight={700}
                    color="#166534"
                    sx={{ mt: 0.5, overflowWrap: "anywhere" }}
                  >
                    {current?.answer || "Chưa nhập đáp án"}
                  </Typography>
                </Paper>
              </Fade>
            )}
          </Paper>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              fullWidth
              variant="contained"
              color={showAnswer ? "success" : "primary"}
              startIcon={<VisibilityRoundedIcon />}
              onClick={() => setShowAnswer((prev) => !prev)}
            >
              {showAnswer ? "Ẩn đáp án" : "Hiện đáp án"}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              endIcon={<NavigateNextRoundedIcon />}
              onClick={nextQuestion}
              disabled={questions.length < 2}
            >
              Câu tiếp theo
            </Button>
          </Stack>

          <Divider />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={800}>NGÂN HÀNG CÂU HỎI</Typography>
            <Button
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={addQuestion}
            >
              Thêm câu
            </Button>
          </Stack>

          {questions.map((item, index) => (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 2 }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip size="small" label={`Câu ${index + 1}`} />
                <Box sx={{ flex: 1 }} />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => deleteQuestion(item.id)}
                  disabled={questions.length === 1}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack spacing={1.2} sx={{ mt: 1.2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nội dung câu hỏi"
                  value={item.question}
                  onChange={(e) =>
                    updateQuestion(item.id, "question", e.target.value)
                  }
                  multiline
                  maxRows={3}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Đáp án"
                  value={item.answer}
                  onChange={(e) =>
                    updateQuestion(item.id, "answer", e.target.value)
                  }
                  multiline
                  maxRows={3}
                />
              </Stack>
            </Paper>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={handleClose} variant="contained">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
