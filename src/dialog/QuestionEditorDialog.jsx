import React from "react";
import {
  Dialog, DialogContent, DialogActions, Box, Typography, Button,
  IconButton, TextField, Paper, Stack, Chip, Fade, Tooltip
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import DialogHeader from "./DialogHeader";

const OPTION_LABELS = ["A", "B", "C", "D"];
const paperSx = {
  borderRadius: 3,
  border: "1px solid #e2e8f0",
  bgcolor: "#fff",
  boxShadow: "none",
};
const primaryButtonSx = {
  borderRadius: 2.5,
  fontWeight: 900,
  textTransform: "none",
  background: "linear-gradient(90deg,#2563eb,#0ea5e9)",
  boxShadow: "0 5px 14px rgba(37,99,235,.18)",
  "&:hover": { background: "linear-gradient(90deg,#1d4ed8,#0284c7)" },
  "&.Mui-disabled": { color: "#fff", opacity: 0.45 },
};
const createQuestion = () => ({
  id: Date.now() + Math.random(),
  question: "",
  options: ["", "", "", ""],
  answerIndex: 0,
});

export default function QuestionEditorDialog({
  open,
  onClose,
  questions = [],
  setQuestions,
}) {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const validCount = safeQuestions.filter(
    (item) =>
      item.question.trim() &&
      item.options.every((option) => option.trim())
  ).length;

  const updateQuestion = (id, field, value) => {
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const updateOption = (id, optionIndex, value) => {
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              options: item.options.map((option, index) =>
                index === optionIndex ? value : option
              ),
            }
          : item
      )
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createQuestion()]);
  };

  const deleteQuestion = (id) => {
    setQuestions((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.length ? next : [createQuestion()];
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionComponent={Fade}
      PaperProps={{
        sx: {
          display: "flex",
          flexDirection: "column",
          height: "min(820px, 90vh)",
          maxHeight: "90vh",
          overflow: "hidden",
          borderRadius: 3,
        },
      }}
    >
      <DialogHeader
        title="SOẠN ĐỀ THI"
        subtitle="Quản lý câu hỏi và đáp án"
        icon={<EditNoteRoundedIcon />}
        onClose={onClose}
      >
        <Chip
          size="small"
          label={`${validCount}/${safeQuestions.length} câu hợp lệ`}
          sx={{
            color: "#fff",
            bgcolor: "rgba(255,255,255,.14)",
            border: "1px solid rgba(255,255,255,.2)",
            fontWeight: 800,
          }}
        />
      </DialogHeader>

      <DialogContent
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          overflowY: "auto",
          minHeight: 0,
          flex: 1,
          bgcolor: "#f8fbff",
        }}
      >
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
          >
            <Box>
              <Typography
                sx={{ fontSize: 14, fontWeight: 900, color: "#172554" }}
              >
                NGÂN HÀNG CÂU HỎI
              </Typography>
              <Typography sx={{ fontSize: 11, color: "#64748b" }}>
                Chọn chữ A, B, C hoặc D để đặt đáp án đúng.
              </Typography>
            </Box>

            <Button
              size="small"
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={addQuestion}
              sx={primaryButtonSx}
            >
              Thêm câu
            </Button>
          </Stack>

          {safeQuestions.map((item, index) => {
            const isValid =
              item.question.trim() &&
              item.options.every((option) => option.trim());

            return (
              <Paper
                key={item.id}
                sx={{
                  ...paperSx,
                  p: { xs: 1.5, sm: 2 },
                  borderColor: isValid ? "#bfdbfe" : "#e2e8f0",
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "#eff6ff",
                      color: "#2563eb",
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{ fontSize: 12, fontWeight: 900, color: "#172554" }}
                    >
                      CÂU HỎI {index + 1}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: isValid ? "#059669" : "#94a3b8",
                      }}
                    >
                      {isValid ? "Đã hoàn thành" : "Chưa nhập đầy đủ"}
                    </Typography>
                  </Box>

                  <Tooltip title="Xóa câu hỏi">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={safeQuestions.length === 1}
                        onClick={() => deleteQuestion(item.id)}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>

                <TextField
                  fullWidth
                  size="small"
                  label="Nội dung câu hỏi"
                  placeholder="Nhập nội dung câu hỏi..."
                  value={item.question}
                  onChange={(e) =>
                    updateQuestion(item.id, "question", e.target.value)
                  }
                  multiline
                  maxRows={3}
                />

                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mt: 1.5, mb: 1 }}
                >
                  <Typography
                    sx={{ fontSize: 11, fontWeight: 900, color: "#64748b" }}
                  >
                    CÁC PHƯƠNG ÁN
                  </Typography>

                  <Chip
                    size="small"
                    color="success"
                    variant="outlined"
                    label={`Đáp án ${OPTION_LABELS[item.answerIndex]}`}
                  />
                </Stack>

                <Stack spacing={1}>
                  {item.options.map((option, optionIndex) => {
                    const isCorrect = item.answerIndex === optionIndex;

                    return (
                      <Stack
                        key={optionIndex}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                      >
                        <Button
                          onClick={() =>
                            updateQuestion(
                              item.id,
                              "answerIndex",
                              optionIndex
                            )
                          }
                          sx={{
                            minWidth: 38,
                            width: 38,
                            height: 38,
                            p: 0,
                            borderRadius: 2,
                            fontWeight: 900,
                            color: isCorrect ? "#fff" : "#64748b",
                            bgcolor: isCorrect ? "#059669" : "#f1f5f9",
                            "&:hover": {
                              bgcolor: isCorrect ? "#047857" : "#e2e8f0",
                            },
                          }}
                        >
                          {OPTION_LABELS[optionIndex]}
                        </Button>

                        <TextField
                          fullWidth
                          size="small"
                          placeholder={`Nhập phương án ${OPTION_LABELS[optionIndex]}...`}
                          value={option}
                          onChange={(e) =>
                            updateOption(item.id, optionIndex, e.target.value)
                          }
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              bgcolor: isCorrect ? "#f0fdf4" : "#fff",
                            },
                          }}
                        />
                      </Stack>
                    );
                  })}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          p: 1.5,
          borderTop: "1px solid #e2e8f0",
          flexShrink: 0,
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ fontSize: 11, color: "#64748b" }}>
          {validCount} câu có thể đưa vào cuộc thi
        </Typography>
        <Button onClick={onClose} variant="contained" sx={primaryButtonSx}>
          Hoàn tất
        </Button>
      </DialogActions>
    </Dialog>
  );
}
