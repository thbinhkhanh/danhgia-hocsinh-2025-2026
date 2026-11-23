
import React from "react";
import {
  Divider,
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Tooltip,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";

import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";

export default function QuestionBankSection({
  draftMode,

  draftGrade,
  setDraftGrade,
  draftSubject,
  setDraftSubject,
  draftWeek,
  setDraftWeek,

  GRADE_OPTIONS,
  SUBJECT_OPTIONS,
  WEEK_OPTIONS,

  fieldSx,
  questionBankName,

  loadingQuestions,
  savingQuestions,
  handleReloadQuestions,
  hasExistingQuestions,

  currentStage,
  currentQuestion,
  draftStageCount,
  draftQuestions,

  handleSelectStage,
  updateQuestion,
  optionLabels,
  updateOption,
  updateCorrectAnswer,
  handlePreviousStage,
  handleNextStage,
}) {
  return (
    <>
      {draftMode === "quiz" && (
        <>
          <Divider sx={{ mb: 2.5 }} />

          <Box mb={1.5}>
            <Box display="flex" alignItems="center" gap={1} mb={1.2}>
              <MenuBookRoundedIcon color="primary" />

              <Typography fontWeight={800} fontSize={15}>
                4. NGÂN HÀNG CÂU HỎI
              </Typography>
            </Box>

            {/* BỘ LỌC LỚP / MÔN / TUẦN */}

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                mb: 1.5,
              }}
            >
              <Typography
                fontSize={14}
                fontWeight={700}
                mb={1.2}
                color="#334155"
              >
                Chọn bộ câu hỏi cần mở hoặc tạo mới
              </Typography>

              <Box
                display="grid"
                gridTemplateColumns={{
                  xs: "1fr 1fr",
                  sm: "1fr 1.4fr 1fr",
                }}
                gap={1.2}
              >
                <TextField
                  select
                  fullWidth
                  size="medium"
                  label="Lớp"
                  value={draftGrade}
                  onChange={(e) => setDraftGrade(e.target.value)}
                  sx={fieldSx}
                >
                  {GRADE_OPTIONS.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  size="medium"
                  label="Môn học"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  sx={fieldSx}
                >
                  {SUBJECT_OPTIONS.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  size="medium"
                  label="Tuần"
                  value={draftWeek}
                  onChange={(e) =>
                    setDraftWeek(Number(e.target.value))
                  }
                  sx={fieldSx}
                >
                  {WEEK_OPTIONS.map((item) => (
                    <MenuItem key={item} value={item}>
                      Tuần {item}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={1}
                mt={1.5}
              >
                <Box minWidth={0}>
                  <Typography
                    fontSize={12}
                    color="text.secondary"
                  >
                    Bộ câu hỏi:
                  </Typography>

                  <Typography
                    fontSize={12}
                    fontWeight={700}
                    color="#0369a1"
                    sx={{ overflowWrap: "anywhere" }}
                  >
                    {questionBankName}
                  </Typography>
                </Box>

                <Tooltip title="Tải lại bộ câu hỏi hiện tại">
                  <span>
                    <Button
                      size="medium"
                      variant="outlined"
                      startIcon={
                        loadingQuestions ? (
                          <CircularProgress size={16} />
                        ) : (
                          <RefreshRoundedIcon />
                        )
                      }
                      disabled={loadingQuestions || savingQuestions}
                      onClick={handleReloadQuestions}
                      sx={{
                        fontSize: 13,
                        minHeight: 40,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Tải lại
                    </Button>
                  </span>
                </Tooltip>
              </Box>

              <Box mt={1}>
                {loadingQuestions ? (
                  <Alert
                    severity="info"
                    icon={<CircularProgress size={18} />}
                    sx={{ fontSize: 13, py: 0 }}
                  >
                    Đang mở câu hỏi từ Firestore...
                  </Alert>
                ) : hasExistingQuestions ? (
                  <Alert
                    severity="success"
                    sx={{ fontSize: 13, py: 0 }}
                  >
                    Đã tìm thấy bộ câu hỏi. Bạn có thể chỉnh sửa và lưu cập nhật.
                  </Alert>
                ) : (
                  <Alert
                    severity="error"
                    sx={{ fontSize: 13, py: 0 }}
                  >
                    Chưa có bộ câu hỏi. Bạn có thể nhập câu hỏi mới và lưu.
                  </Alert>
                )}
              </Box>
            </Paper>

            {/* ========================================== */}
            {/* CÂU HỎI TỪNG CHẶNG */}
            {/* ========================================== */}

            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                border: "1px solid #bfdbfe",
                backgroundColor: "#fff",
              }}
            >
              {/* TIÊU ĐỀ CHẶNG */}

              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap={1}
                mb={1.2}
              >
                <Box>
                  <Typography
                    fontSize={16}
                    fontWeight={900}
                    color="#1e40af"
                  >
                    CÂU HỎI CHẶNG {currentStage + 1}
                  </Typography>

                  <Typography
                    mt={0.3}
                    fontSize={12}
                    color="#64748b"
                  >
                    {Boolean(
                      currentQuestion.question?.trim() &&
                      currentQuestion.options?.every((option) =>
                        option.trim()
                      )
                    )
                      ? "Đã nhập đầy đủ câu hỏi và đáp án"
                      : "Đang nhập nội dung câu hỏi"}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={`${currentStage + 1}/${draftStageCount}`}
                  sx={{
                    height: 29,
                    bgcolor: "#dbeafe",
                    color: "#1d4ed8",
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                />
              </Box>

              {/* THANH TIẾN ĐỘ TỪNG CHẶNG */}

              <Box
                display="flex"
                gap={0.7}
                mb={2.2}
              >
                {draftQuestions.map((item, index) => {
                  const completed = Boolean(
                    item.question?.trim() &&
                    item.options?.every((option) => option.trim())
                  );

                  const active = currentStage === index;

                  return (
                    <Box
                      key={index}
                      onClick={() => handleSelectStage(index)}
                      sx={{
                        flex: 1,
                        height: 10,
                        borderRadius: 5,
                        cursor: "pointer",
                        bgcolor: active
                          ? "#2563eb"
                          : completed
                            ? "#22c55e"
                            : "#e2e8f0",
                        outline: active
                          ? "2px solid #93c5fd"
                          : "none",
                        outlineOffset: 2,
                        transition: "all .2s",
                      }}
                    />
                  );
                })}
              </Box>

              {/* NỘI DUNG CÂU HỎI */}

              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Nội dung câu hỏi"
                placeholder="Nhập câu hỏi cho học sinh..."
                value={currentQuestion.question}
                onChange={(e) => updateQuestion(e.target.value)}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: "#f8fafc",
                    fontSize: 15,
                    alignItems: "flex-start",
                  },
                  "& .MuiOutlinedInput-input": {
                    fontSize: 15,
                    lineHeight: 1.5,
                    py: 0.5,
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14,
                  },
                }}
              />

              {/* CÁC PHƯƠNG ÁN */}

              <Typography
                fontSize={14}
                fontWeight={900}
                color="#475569"
                mb={1.2}
              >
                CÁC PHƯƠNG ÁN TRẢ LỜI
              </Typography>

              <Box
                display="flex"
                flexDirection="column"
                gap={1.2}
              >
                {currentQuestion.options.map((option, index) => {
                  const selected =
                    currentQuestion.correctIndex === index;

                  return (
                    <Box
                      key={index}
                      display="flex"
                      alignItems="center"
                      gap={1}
                    >
                      {/* KÝ HIỆU ĐÁP ÁN */}

                      <Box
                        sx={{
                          width: 38,
                          height: 42,
                          flexShrink: 0,
                          borderRadius: 1.8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: selected ? "#dcfce7" : "#f1f5f9",
                          color: selected ? "#15803d" : "#64748b",
                          fontSize: 15,
                          fontWeight: 900,
                        }}
                      >
                        {optionLabels[index]}
                      </Box>

                      {/* Ô NHẬP ĐÁP ÁN */}

                      <TextField
                        fullWidth
                        size="small"
                        placeholder={`Nhập đáp án ${optionLabels[index]}`}
                        value={option}
                        onChange={(e) =>
                          updateOption(index, e.target.value)
                        }
                        sx={{
                          ...fieldSx,
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "#f8fafc",
                            fontSize: 14,
                          },
                        }}
                      />

                      {/* CHỌN ĐÁP ÁN ĐÚNG */}

                      <Button
                        size="small"
                        variant={selected ? "contained" : "outlined"}
                        onClick={() => updateCorrectAnswer(index)}
                        sx={{
                          minWidth: { xs: 43, sm: 82 },
                          height: 46,
                          px: { xs: 0.5, sm: 1 },
                          borderRadius: 2,
                          fontSize: 13,
                          fontWeight: 900,
                          borderColor: selected ? "#16a34a" : "#cbd5e1",
                          bgcolor: selected ? "#16a34a" : "#fff",
                          color: selected ? "#fff" : "#64748b",
                          "&:hover": {
                            bgcolor: selected ? "#15803d" : "#dcfce7",
                            borderColor: "#16a34a",
                          },
                        }}
                      >
                        {selected ? (
                          <CheckCircleRoundedIcon sx={{ fontSize: 21 }} />
                        ) : (
                          "Chọn"
                        )}
                      </Button>
                    </Box>
                  );
                })}
              </Box>

              {/* ĐÁP ÁN ĐÚNG */}

              <Box
                mt={1.8}
                p={1.4}
                borderRadius={2}
                sx={{
                  bgcolor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <Typography
                  fontSize={14}
                  fontWeight={900}
                  color="#15803d"
                >
                  <CheckCircleRoundedIcon
                    sx={{
                      fontSize: 19,
                      verticalAlign: "middle",
                      mr: 0.6,
                    }}
                  />

                  ĐÁP ÁN ĐÚNG: {optionLabels[currentQuestion.correctIndex]}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* ĐIỀU HƯỚNG CHẶNG */}

              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap={1}
              >
                <Button
                  variant="outlined"
                  color="inherit"
                  disabled={currentStage === 0}
                  onClick={handlePreviousStage}
                  startIcon={<ArrowBackIosNewRoundedIcon />}
                  sx={{
                    minHeight: 42,
                    borderRadius: 2,
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#475569",
                    borderColor: "#cbd5e1",
                  }}
                >
                  LÙI
                </Button>

                <Typography
                  fontSize={13}
                  fontWeight={900}
                  color="#64748b"
                  whiteSpace="nowrap"
                >
                  CHẶNG {currentStage + 1}/{draftStageCount}
                </Typography>

                <Button
                  variant="contained"
                  disabled={currentStage === draftStageCount - 1}
                  onClick={handleNextStage}
                  endIcon={<ArrowForwardIosRoundedIcon />}
                  sx={{
                    minHeight: 42,
                    borderRadius: 2,
                    fontSize: 13,
                    fontWeight: 900,
                    bgcolor: "#2563eb",
                  }}
                >
                  CHẶNG TIẾP
                </Button>
              </Box>

              {/* DANH SÁCH CHẶNG */}

              <Box
                display="flex"
                flexWrap="wrap"
                gap={0.8}
                mt={1.8}
              >
                {draftQuestions.map((item, index) => {
                  const completed = Boolean(
                    item.question?.trim() &&
                    item.options?.every((option) => option.trim())
                  );

                  return (
                    <Chip
                      key={index}
                      size="medium"
                      clickable
                      onClick={() => handleSelectStage(index)}
                      icon={
                        completed ? (
                          <CheckCircleRoundedIcon
                            sx={{ fontSize: "17px !important" }}
                          />
                        ) : undefined
                      }
                      label={`Chặng ${index + 1}`}
                      sx={{
                        height: 32,
                        fontSize: 12,
                        fontWeight: 800,
                        bgcolor:
                          currentStage === index
                            ? "#dbeafe"
                            : completed
                              ? "#dcfce7"
                              : "#f1f5f9",
                        color:
                          currentStage === index
                            ? "#1d4ed8"
                            : completed
                              ? "#15803d"
                              : "#64748b",
                        border:
                          currentStage === index
                            ? "1px solid #93c5fd"
                            : "1px solid transparent",
                      }}
                    />
                  );
                })}
              </Box>
            </Paper>
          </Box>
        </>
      )}
    </>
  );
}
