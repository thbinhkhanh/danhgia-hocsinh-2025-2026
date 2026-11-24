
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Paper,
  Stack,
  Chip,
  Fade,
  Tooltip,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import DialogHeader from "./DialogHeader";

const OPTION_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const getOptionLabel = (index) => {
  if (index < OPTION_LABELS.length) {
    return OPTION_LABELS[index];
  }

  return `PA${index + 1}`;
};

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
  "&:hover": {
    background: "linear-gradient(90deg,#1d4ed8,#0284c7)",
  },
  "&.Mui-disabled": {
    color: "#fff",
    opacity: 0.45,
  },
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
      item.question?.trim() &&
      Array.isArray(item.options) &&
      item.options.length >= 2 &&
      item.options.every((option) => option?.trim()) &&
      item.answerIndex >= 0 &&
      item.answerIndex < item.options.length
  ).length;

  // Cập nhật thông tin câu hỏi
  const updateQuestion = (id, field, value) => {
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  // Cập nhật nội dung phương án
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

  // Thêm câu hỏi
  const addQuestion = () => {
    setQuestions((prev) => [...prev, createQuestion()]);
  };

  // Xóa câu hỏi
  const deleteQuestion = (id) => {
    setQuestions((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.length ? next : [createQuestion()];
    });
  };

  // Thêm phương án trả lời
  const addOption = (id) => {
    setQuestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        return {
          ...item,
          options: [...item.options, ""],
        };
      })
    );
  };

  // Xóa phương án trả lời và điều chỉnh đáp án đúng
  const deleteOption = (id, optionIndex) => {
    setQuestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        // Không cho xóa nếu chỉ còn 2 phương án
        if (item.options.length <= 2) return item;

        const nextOptions = item.options.filter(
          (_, index) => index !== optionIndex
        );

        let nextAnswerIndex = item.answerIndex;

        if (optionIndex === item.answerIndex) {
          // Nếu xóa đáp án đúng, chọn phương án đầu tiên
          nextAnswerIndex = 0;
        } else if (optionIndex < item.answerIndex) {
          // Nếu xóa phương án đứng trước đáp án đúng
          nextAnswerIndex -= 1;
        }

        return {
          ...item,
          options: nextOptions,
          answerIndex: nextAnswerIndex,
        };
      })
    );
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
        width: "100%",
        maxWidth: 900,
        height: "94dvh",
        maxHeight: "94dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 4,
        bgcolor: "#fff",
        boxShadow: "0 25px 80px rgba(15,23,42,.25)",
      },
    }}
  >
    {/* HEADER CỐ ĐỊNH */}
    <DialogHeader
      title="SOẠN ĐỀ THI"
      subtitle="Quản lý câu hỏi và đáp án"
      icon={<EditNoteRoundedIcon />}
      onClose={onClose}
    >
      <Chip
        size="medium"
        label={`${validCount}/${safeQuestions.length} câu hợp lệ`}
        sx={{
          color: "#fff",
          bgcolor: "rgba(255,255,255,.14)",
          border: "1px solid rgba(255,255,255,.2)",
          fontWeight: 800,
          fontSize: 13,
          height: 32,
          "& .MuiChip-label": {
            px: 1.5,
          },
        }}
      />
    </DialogHeader>

    {/* NỘI DUNG CUỘN */}
    <DialogContent
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: 0,
        flex: "1 1 0",
        bgcolor: "#f8fbff",
      }}
    >
      <Stack spacing={2}>
        {/* TIÊU ĐỀ VÀ NÚT THÊM CÂU */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1.5}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 900,
                color: "#172554",
              }}
            >
              NGÂN HÀNG CÂU HỎI
            </Typography>

            <Typography
              sx={{
                fontSize: 13,
                color: "#64748b",
                mt: 0.3,
              }}
            >
              Chọn chữ cái để đặt đáp án đúng.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={addQuestion}
            sx={{
              ...primaryButtonSx,
              minHeight: 42,
              px: 2,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            Thêm câu
          </Button>
        </Stack>

        {/* DANH SÁCH CÂU HỎI */}
        {safeQuestions.map((item, index) => {
          const options = Array.isArray(item.options)
            ? item.options
            : [];

          const isValid =
            item.question?.trim() &&
            options.length >= 2 &&
            options.every((option) =>
              String(option ?? "").trim()
            ) &&
            item.answerIndex >= 0 &&
            item.answerIndex < options.length;

          return (
            <Paper
              key={item.id}
              sx={{
                ...paperSx,
                p: { xs: 1.5, sm: 2.5 },
                borderColor: isValid ? "#bfdbfe" : "#e2e8f0",
              }}
            >
              {/* TIÊU ĐỀ CÂU HỎI */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ mb: 2 }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "#eff6ff",
                    color: "#2563eb",
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  {index + 1}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 900,
                      color: "#172554",
                    }}
                  >
                    CÂU HỎI {index + 1}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 12,
                      color: isValid ? "#059669" : "#94a3b8",
                      mt: 0.3,
                    }}
                  >
                    {isValid
                      ? "Đã hoàn thành"
                      : "Chưa nhập đầy đủ"}
                  </Typography>
                </Box>

                <Tooltip title="Xóa câu hỏi">
                  <span>
                    <IconButton
                      size="medium"
                      color="error"
                      disabled={safeQuestions.length === 1}
                      onClick={() => deleteQuestion(item.id)}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2.5,
                        border: "1px solid #fee2e2",
                      }}
                    >
                      <DeleteOutlineRoundedIcon fontSize="medium" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

              {/* NỘI DUNG CÂU HỎI */}
              <TextField
                fullWidth
                size="medium"
                label="Nội dung câu hỏi"
                placeholder="Nhập nội dung câu hỏi..."
                value={item.question}
                onChange={(e) =>
                  updateQuestion(
                    item.id,
                    "question",
                    e.target.value
                  )
                }
                multiline
                minRows={2}
                maxRows={4}
                sx={{
                  "& .MuiInputLabel-root": {
                    fontSize: 15,
                    fontWeight: 600,
                  },
                  "& .MuiInputBase-root": {
                    fontSize: 15,
                    lineHeight: 1.6,
                    borderRadius: 2.5,
                    bgcolor: "#fff",
                  },
                  "& .MuiInputBase-input": {
                    p: 1.5,
                  },
                }}
              />

              {/* TIÊU ĐỀ PHƯƠNG ÁN */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                gap={1}
                sx={{ mt: 2, mb: 1.5 }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: "#475569",
                    }}
                  >
                    CÁC PHƯƠNG ÁN
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#94a3b8",
                      mt: 0.3,
                    }}
                  >
                    {options.length} phương án
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                >
                  <Chip
                    size="medium"
                    color="success"
                    variant="outlined"
                    label={`Đáp án ${getOptionLabel(
                      item.answerIndex
                    )}`}
                    sx={{
                      height: 34,
                      fontSize: 13,
                      fontWeight: 800,
                      "& .MuiChip-label": {
                        px: 1.3,
                      },
                    }}
                  />

                  <Button
                    size="medium"
                    variant="outlined"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => addOption(item.id)}
                    sx={{
                      borderRadius: 2.5,
                      minHeight: 40,
                      px: 1.8,
                      fontSize: 13,
                      fontWeight: 800,
                      textTransform: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Thêm ô
                  </Button>
                </Stack>
              </Stack>

              {/* DANH SÁCH PHƯƠNG ÁN */}
              <Stack spacing={1.3}>
                {options.map((option, optionIndex) => {
                  const isCorrect =
                    item.answerIndex === optionIndex;

                  return (
                    <Stack
                      key={optionIndex}
                      direction="row"
                      alignItems="center"
                      spacing={1.2}
                    >
                      {/* CHỌN ĐÁP ÁN ĐÚNG */}
                      <Tooltip
                        title={
                          isCorrect
                            ? "Đáp án đúng"
                            : "Chọn làm đáp án đúng"
                        }
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
                            minWidth: 46,
                            width: 46,
                            height: 46,
                            p: 0,
                            flexShrink: 0,
                            borderRadius: 2.5,
                            fontSize: 16,
                            fontWeight: 900,
                            color: isCorrect
                              ? "#fff"
                              : "#64748b",
                            bgcolor: isCorrect
                              ? "#059669"
                              : "#f1f5f9",
                            "&:hover": {
                              bgcolor: isCorrect
                                ? "#047857"
                                : "#e2e8f0",
                            },
                          }}
                        >
                          {getOptionLabel(optionIndex)}
                        </Button>
                      </Tooltip>

                      {/* Ô NHẬP PHƯƠNG ÁN */}
                      <TextField
                        fullWidth
                        size="medium"
                        placeholder={`Nhập phương án ${getOptionLabel(
                          optionIndex
                        )}...`}
                        value={option}
                        onChange={(e) =>
                          updateOption(
                            item.id,
                            optionIndex,
                            e.target.value
                          )
                        }
                        sx={{
                          "& .MuiInputBase-root": {
                            minHeight: 48,
                            fontSize: 15,
                            borderRadius: 2.5,
                            bgcolor: isCorrect
                              ? "#f0fdf4"
                              : "#fff",
                          },
                          "& .MuiInputBase-input": {
                            px: 1.8,
                            py: 1.2,
                          },
                          "& .MuiInputBase-input::placeholder": {
                            fontSize: 14,
                            opacity: 0.7,
                          },
                        }}
                      />

                      {/* NÚT XÓA PHƯƠNG ÁN */}
                      <Tooltip
                        title={
                          options.length <= 2
                            ? "Cần ít nhất 2 phương án"
                            : "Xóa phương án này"
                        }
                      >
                        <span>
                          <IconButton
                            size="medium"
                            color="error"
                            disabled={options.length <= 2}
                            onClick={() =>
                              deleteOption(
                                item.id,
                                optionIndex
                              )
                            }
                            sx={{
                              width: 42,
                              height: 42,
                              flexShrink: 0,
                              border: "1px solid #fee2e2",
                              borderRadius: 2.5,
                            }}
                          >
                            <DeleteOutlineRoundedIcon fontSize="medium" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  );
                })}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </DialogContent>

    {/* FOOTER CỐ ĐỊNH */}
    <DialogActions
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderTop: "1px solid #e2e8f0",
        flexShrink: 0,
        justifyContent: "space-between",
        bgcolor: "#fff",
      }}
    >
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 600,
          color: "#64748b",
        }}
      >
        {validCount} câu có thể đưa vào cuộc thi
      </Typography>

      <Button
        onClick={onClose}
        variant="contained"
        sx={{
          ...primaryButtonSx,
          minHeight: 42,
          px: 2.5,
          fontSize: 14,
        }}
      >
        Hoàn tất
      </Button>
    </DialogActions>
  </Dialog>
);
}
