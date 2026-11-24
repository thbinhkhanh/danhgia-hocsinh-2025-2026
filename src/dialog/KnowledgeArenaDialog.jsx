import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Chip,
  Fade,
  LinearProgress,
} from "@mui/material";

import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";

import DialogHeader from "../dialog/DialogHeader";
import ArenaConfigDialog from "../dialog/ArenaConfigDialog";
import QuestionEditorDialog from "../dialog/QuestionEditorDialog";

const createQuestion = () => ({
  id: Date.now() + Math.random(),
  question: "",
  options: ["", "", "", ""],
  answerIndex: 0,
});

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
  "&:hover": {
    background: "linear-gradient(90deg,#1d4ed8,#0284c7)",
  },
  "&.Mui-disabled": {
    color: "#fff",
    opacity: 0.45,
  },
};

export default function KnowledgeArenaDialog({ open, onClose }) {
  const [questions, setQuestions] = useState([createQuestion()]);
  const [duration, setDuration] = useState(20);

  const [phase, setPhase] = useState("setup");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seconds, setSeconds] = useState(20);

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const [configOpen, setConfigOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const current = questions[currentIndex];

  const validQuestionCount = questions.filter(
    (item) =>
      item.question.trim() &&
      item.options.every((option) => option.trim())
  ).length;

  const progress = questions.length
    ? ((currentIndex + 1) / questions.length) * 100
    : 0;

  /* ĐẾM NGƯỢC */
  useEffect(() => {
    if (!open || phase !== "playing" || answered) return;

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAnswered(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, phase, currentIndex, answered]);

  /* BẮT ĐẦU */
  const startGame = () => {
    const validQuestions = questions.filter(
      (item) =>
        item.question.trim() &&
        item.options.every((option) => option.trim())
    );

    if (!validQuestions.length) {
      setEditorOpen(true);
      return;
    }

    setQuestions(validQuestions);
    setCurrentIndex(0);
    setSeconds(duration);
    setSelectedAnswer(null);
    setAnswered(false);
    setScore(0);
    setCorrectCount(0);
    setPhase("playing");
  };

  /* CHỌN ĐÁP ÁN */
  const chooseAnswer = (index) => {
    if (answered || !current) return;

    setSelectedAnswer(index);
    setAnswered(true);

    if (index === current.answerIndex) {
      setScore((prev) => prev + 10);
      setCorrectCount((prev) => prev + 1);
    }
  };

  /* CÂU TIẾP THEO */
  const nextQuestion = () => {
    if (currentIndex >= questions.length - 1) {
      setPhase("result");
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSeconds(duration);
    setSelectedAnswer(null);
    setAnswered(false);
  };

  /* CHƠI LẠI */
  const restartGame = () => {
    setPhase("setup");
    setCurrentIndex(0);
    setSeconds(duration);
    setSelectedAnswer(null);
    setAnswered(false);
    setScore(0);
    setCorrectCount(0);
  };

  /* ĐÓNG */
  const handleClose = (event, reason) => {
    // Không đóng khi bấm ra ngoài Dialog
    if (reason === "backdropClick") return;

    setPhase("setup");
    setCurrentIndex(0);
    setSeconds(duration);
    setSelectedAnswer(null);
    setAnswered(false);
    setScore(0);
    setCorrectCount(0);
    setConfigOpen(false);
    setEditorOpen(false);
    onClose?.();
    };

  return (
    <>
      <Dialog
        open={open}
        onClose={(event, reason) => {
            if (
            reason === "backdropClick" ||
            reason === "escapeKeyDown"
            ) {
            return;
            }
            handleClose();
        }}
        disableEscapeKeyDown
        fullWidth
        maxWidth="md"
        TransitionComponent={Fade}
        PaperProps={{
            sx: {
            width: "100%",
            height: "94dvh",
            maxHeight: "94dvh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 3,
            bgcolor: "#fff",
            boxShadow: "0 25px 80px rgba(15,23,42,.25)",
            },
        }}
        >
        {/* HEADER CỐ ĐỊNH */}
        <DialogHeader
          title="ĐẤU TRƯỜNG KIẾN THỨC"
          subtitle="Thử thách kiến thức – chinh phục điểm số"
          icon={<EmojiEventsRoundedIcon sx={{ fontSize: 27 }} />}
          onClose={handleClose}
        >
          {phase === "setup" && (
            <Stack
              direction="row"
              spacing={0.7}
              sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}
            >
              <Chip
                icon={<SettingsRoundedIcon />}
                label="Cấu hình"
                size="small"
                onClick={() => setConfigOpen(true)}
                sx={{
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,.13)",
                  border: "1px solid rgba(255,255,255,.2)",
                  fontWeight: 700,
                  "& .MuiChip-icon": { color: "#bfdbfe" },
                }}
              />
              <Chip
                icon={<EditNoteRoundedIcon />}
                label="Soạn đề"
                size="small"
                onClick={() => setEditorOpen(true)}
                sx={{
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,.13)",
                  border: "1px solid rgba(255,255,255,.2)",
                  fontWeight: 700,
                  "& .MuiChip-icon": { color: "#bfdbfe" },
                }}
              />
            </Stack>
          )}
        </DialogHeader>

        {/* CHỈ VÙNG NÀY ĐƯỢC CUỘN */}
        <DialogContent
            sx={{
                p: { xs: 1.5, sm: 2 },
                flex: "1 1 0",
                minHeight: 0,
                overflow: "hidden",
                bgcolor: "#f8fbff",
                display: "flex",
                flexDirection: "column",
            }}
        >
          {/* MÀN HÌNH CHỜ */}
          {phase === "setup" && (
            <Stack
              spacing={2}
              sx={{
                minHeight: "100%",
                justifyContent: "center",
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 3,
                  border: "1px solid #dbeafe",
                  background:
                    "linear-gradient(135deg,#eff6ff 0%,#f5f3ff 100%)",
                  textAlign: "center",
                }}
              >
                <Box
                  sx={{
                    width: 68,
                    height: 68,
                    mx: "auto",
                    mb: 1.5,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    color: "#fff",
                    background:
                      "linear-gradient(145deg,#fbbf24,#ea580c)",
                    boxShadow: "0 7px 20px rgba(245,158,11,.25)",
                  }}
                >
                  <EmojiEventsRoundedIcon sx={{ fontSize: 38 }} />
                </Box>

                <Typography
                  sx={{
                    fontSize: { xs: 18, sm: 23 },
                    fontWeight: 900,
                    color: "#172554",
                  }}
                >
                  SẴN SÀNG CHINH PHỤC?
                </Typography>

                <Typography
                  sx={{
                    mt: 0.8,
                    fontSize: 12,
                    color: "#64748b",
                    lineHeight: 1.6,
                  }}
                >
                  Hãy chuẩn bị và bắt đầu thử thách kiến thức của bạn.
                </Typography>
              </Paper>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                  gap: 1,
                }}
              >
                {[
                  {
                    label: "CÂU HỎI",
                    value: validQuestionCount,
                    icon: <QuizRoundedIcon />,
                    color: "#2563eb",
                    bg: "#eff6ff",
                  },
                  {
                    label: "THỜI GIAN",
                    value: `${duration}s`,
                    icon: <TimerRoundedIcon />,
                    color: "#d97706",
                    bg: "#fffbeb",
                  },
                  {
                    label: "ĐIỂM ĐÚNG",
                    value: "+10",
                    icon: <EmojiEventsRoundedIcon />,
                    color: "#059669",
                    bg: "#ecfdf5",
                  },
                ].map((item) => (
                  <Paper
                    key={item.label}
                    elevation={0}
                    sx={{
                      ...paperSx,
                      p: { xs: 1, sm: 1.5 },
                      textAlign: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        mx: "auto",
                        mb: 0.7,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 2,
                        color: item.color,
                        bgcolor: item.bg,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: { xs: 17, sm: 21 },
                        fontWeight: 900,
                        color: item.color,
                      }}
                    >
                      {item.value}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.2,
                        fontSize: { xs: 8, sm: 9 },
                        fontWeight: 800,
                        color: "#94a3b8",
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Paper>
                ))}
              </Box>

              <Paper
                elevation={0}
                sx={{
                  ...paperSx,
                  p: 1.5,
                  bgcolor: "#fff",
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.2}
                >
                  <AutoAwesomeRoundedIcon sx={{ color: "#2563eb" }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#172554",
                      }}
                    >
                      HƯỚNG DẪN THAM GIA
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.4,
                        fontSize: 11,
                        lineHeight: 1.6,
                        color: "#64748b",
                      }}
                    >
                      Mỗi câu có 4 phương án. Chọn một đáp án đúng trong
                      thời gian quy định để nhận 10 điểm.
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {validQuestionCount === 0 && (
                <Typography
                  sx={{
                    textAlign: "center",
                    fontSize: 11,
                    color: "#dc2626",
                  }}
                >
                  Chưa có câu hỏi hợp lệ. Hãy chọn chip Soạn đề để nhập câu hỏi.
                </Typography>
              )}
            </Stack>
          )}

          {/* MÀN HÌNH ĐANG THI */}
          {phase === "playing" && current && (
            <Stack spacing={{ xs: 1.5, sm: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                  gap: 1,
                }}
              >
                {[
                  {
                    label: "CÂU HỎI",
                    value: `${currentIndex + 1}/${questions.length}`,
                    color: "#2563eb",
                    bg: "#eff6ff",
                    icon: <QuizRoundedIcon />,
                  },
                  {
                    label: "THỜI GIAN",
                    value: `${seconds}s`,
                    color: seconds <= 5 ? "#dc2626" : "#d97706",
                    bg: seconds <= 5 ? "#fef2f2" : "#fffbeb",
                    icon: <TimerRoundedIcon />,
                  },
                  {
                    label: "ĐIỂM SỐ",
                    value: score,
                    color: "#059669",
                    bg: "#ecfdf5",
                    icon: <EmojiEventsRoundedIcon />,
                  },
                ].map((item) => (
                  <Paper
                    key={item.label}
                    elevation={0}
                    sx={{ ...paperSx, p: { xs: 1, sm: 1.3 } }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="center"
                      spacing={0.8}
                    >
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 2,
                          bgcolor: item.bg,
                          color: item.color,
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: 8,
                            fontWeight: 800,
                            color: "#94a3b8",
                          }}
                        >
                          {item.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: { xs: 15, sm: 18 },
                            fontWeight: 900,
                            color: item.color,
                            lineHeight: 1.3,
                          }}
                        >
                          {item.value}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Box>

              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ mb: 0.6 }}
                >
                  <Typography
                    sx={{ fontSize: 10, fontWeight: 800, color: "#64748b" }}
                  >
                    TIẾN TRÌNH
                  </Typography>
                  <Typography
                    sx={{ fontSize: 10, fontWeight: 900, color: "#2563eb" }}
                  >
                    {Math.round(progress)}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 7,
                    borderRadius: 5,
                    bgcolor: "#dbeafe",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      background:
                        "linear-gradient(90deg,#2563eb,#0ea5e9)",
                    },
                  }}
                />
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  border: "1px solid #dbeafe",
                  background:
                    "linear-gradient(135deg,#eff6ff 0%,#f5f3ff 100%)",
                  textAlign: "center",
                }}
              >
                <Typography
                  sx={{
                    mb: 1,
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    color: "#2563eb",
                  }}
                >
                  THỬ THÁCH KIẾN THỨC
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: 16, sm: 21 },
                    fontWeight: 900,
                    color: "#172554",
                    lineHeight: 1.5,
                    overflowWrap: "anywhere",
                  }}
                >
                  {current.question}
                </Typography>
              </Paper>

              <Box>
                <Typography
                  sx={{
                    mb: 1,
                    fontSize: 10,
                    fontWeight: 900,
                    color: "#64748b",
                  }}
                >
                  CHỌN MỘT ĐÁP ÁN
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2,minmax(0,1fr))",
                    },
                    gap: 1,
                  }}
                >
                  {current.options.map((option, index) => {
                    const isCorrect = index === current.answerIndex;
                    const isSelected = index === selectedAnswer;
                    const isWrong = answered && isSelected && !isCorrect;
                    const success = answered && isCorrect;

                    return (
                      <Button
                        key={index}
                        variant="outlined"
                        disabled={answered}
                        onClick={() => chooseAnswer(index)}
                        sx={{
                          minHeight: { xs: 56, sm: 66 },
                          p: 1.2,
                          justifyContent: "flex-start",
                          textAlign: "left",
                          whiteSpace: "normal",
                          borderRadius: 2.5,
                          borderWidth: 1.5,
                          borderColor: success
                            ? "#22c55e"
                            : isWrong
                            ? "#ef4444"
                            : "#cbd5e1",
                          bgcolor: success
                            ? "#ecfdf5"
                            : isWrong
                            ? "#fef2f2"
                            : "#fff",
                          "&:hover": {
                            borderWidth: 1.5,
                            borderColor: "#2563eb",
                            bgcolor: "#eff6ff",
                          },
                          "&.Mui-disabled": {
                            opacity: 1,
                            color: "#1e293b",
                            borderColor: success
                              ? "#22c55e"
                              : isWrong
                              ? "#ef4444"
                              : "#cbd5e1",
                            bgcolor: success
                              ? "#ecfdf5"
                              : isWrong
                              ? "#fef2f2"
                              : "#f8fafc",
                          },
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{ width: "100%" }}
                        >
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              flexShrink: 0,
                              borderRadius: 2,
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 900,
                              color: success || isWrong ? "#fff" : "#2563eb",
                              bgcolor: success
                                ? "#16a34a"
                                : isWrong
                                ? "#dc2626"
                                : "#eff6ff",
                            }}
                          >
                            {success ? (
                              <CheckCircleRoundedIcon fontSize="small" />
                            ) : isWrong ? (
                              <CancelRoundedIcon fontSize="small" />
                            ) : (
                              OPTION_LABELS[index]
                            )}
                          </Box>
                          <Typography
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: 12,
                              fontWeight: 700,
                              lineHeight: 1.45,
                              textTransform: "none",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {option}
                          </Typography>
                        </Stack>
                      </Button>
                    );
                  })}
                </Box>
              </Box>

              {answered && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor:
                      selectedAnswer === current.answerIndex
                        ? "#ecfdf5"
                        : "#fff7ed",
                    border: "1px solid",
                    borderColor:
                      selectedAnswer === current.answerIndex
                        ? "#86efac"
                        : "#fdba74",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {selectedAnswer === current.answerIndex ? (
                      <CheckCircleRoundedIcon sx={{ color: "#059669" }} />
                    ) : (
                      <CancelRoundedIcon sx={{ color: "#ea580c" }} />
                    )}
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 900,
                        color:
                          selectedAnswer === current.answerIndex
                            ? "#047857"
                            : "#c2410c",
                      }}
                    >
                      {selectedAnswer === null
                        ? "HẾT THỜI GIAN!"
                        : selectedAnswer === current.answerIndex
                        ? "CHÍNH XÁC! +10 ĐIỂM"
                        : "CHƯA CHÍNH XÁC!"}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Typography
                    sx={{ fontSize: 11, color: "#475569", lineHeight: 1.6 }}
                  >
                    Đáp án đúng:{" "}
                    <strong>
                      {OPTION_LABELS[current.answerIndex]}.{" "}
                      {current.options[current.answerIndex]}
                    </strong>
                  </Typography>
                </Paper>
              )}
            </Stack>
          )}

          {/* MÀN HÌNH KẾT QUẢ */}
          {phase === "result" && (
            <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
              <Box
                sx={{
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  bgcolor: "#fef3c7",
                  color: "#d97706",
                  display: "grid",
                  placeItems: "center",
                  border: "5px solid #fffbeb",
                }}
              >
                <EmojiEventsRoundedIcon sx={{ fontSize: 45 }} />
              </Box>

              <Box sx={{ textAlign: "center" }}>
                <Typography
                  sx={{
                    fontSize: { xs: 19, sm: 23 },
                    fontWeight: 900,
                    color: "#172554",
                  }}
                >
                  HOÀN THÀNH CUỘC THI!
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: 11, color: "#64748b" }}>
                  Bạn đã chinh phục toàn bộ thử thách kiến thức.
                </Typography>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  ...paperSx,
                  width: "100%",
                  p: 2.5,
                  textAlign: "center",
                  borderColor: "#ddd6fe",
                  background:
                    "linear-gradient(135deg,#f5f3ff,#eff6ff)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    color: "#64748b",
                  }}
                >
                  TỔNG ĐIỂM ĐẠT ĐƯỢC
                </Typography>

                <Typography
                  sx={{
                    fontSize: { xs: 52, sm: 64 },
                    fontWeight: 900,
                    color: "#6d28d9",
                    lineHeight: 1.25,
                  }}
                >
                  {score}
                </Typography>

                <Chip
                  icon={<EmojiEventsRoundedIcon />}
                  label={`${correctCount}/${questions.length} câu trả lời đúng`}
                  sx={{
                    mt: 0.5,
                    bgcolor: "#ede9fe",
                    color: "#5b21b6",
                    fontWeight: 800,
                  }}
                />

                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                    gap: 1,
                  }}
                >
                  <Box sx={{ p: 1.3, borderRadius: 2, bgcolor: "#ecfdf5" }}>
                    <Typography
                      sx={{ fontSize: 25, fontWeight: 900, color: "#059669" }}
                    >
                      {correctCount}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 10, fontWeight: 800, color: "#047857" }}
                    >
                      CÂU ĐÚNG
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.3, borderRadius: 2, bgcolor: "#fef2f2" }}>
                    <Typography
                      sx={{ fontSize: 25, fontWeight: 900, color: "#dc2626" }}
                    >
                      {questions.length - correctCount}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 10, fontWeight: 800, color: "#b91c1c" }}
                    >
                      CÂU CHƯA ĐÚNG
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Box sx={{ width: "100%" }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ mb: 0.7 }}
                >
                  <Typography
                    sx={{ fontSize: 10, fontWeight: 800, color: "#64748b" }}
                  >
                    TỈ LỆ TRẢ LỜI ĐÚNG
                  </Typography>
                  <Typography
                    sx={{ fontSize: 11, fontWeight: 900, color: "#059669" }}
                  >
                    {questions.length
                      ? Math.round((correctCount / questions.length) * 100)
                      : 0}
                    %
                  </Typography>
                </Stack>

                <LinearProgress
                  variant="determinate"
                  value={
                    questions.length
                      ? (correctCount / questions.length) * 100
                      : 0
                  }
                  sx={{
                    height: 9,
                    borderRadius: 5,
                    bgcolor: "#dcfce7",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      bgcolor: "#10b981",
                    },
                  }}
                />
              </Box>
            </Stack>
          )}

          <Typography
            sx={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 9,
              mt: 2,
            }}
          >
            HỆ THỐNG HỖ TRỢ GIÁO VIÊN · BÌNH KHÁNH
          </Typography>
        </DialogContent>

        {/* FOOTER CỐ ĐỊNH – KHÔNG CUỘN */}
        <DialogActions
          sx={{
            px: { xs: 1.5, sm: 2.5 },
            py: 1.2,
            borderTop: "1px solid #e2e8f0",
            bgcolor: "#fff",
            flexShrink: 0,
            justifyContent: "center",
          }}
        >
          {phase === "setup" && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ width: "100%", justifyContent: "center" }}
            >
              <Button
                onClick={handleClose}
                variant="outlined"
                sx={{
                  minWidth: 100,
                  borderRadius: 2.5,
                  fontWeight: 800,
                  textTransform: "none",
                  borderColor: "#cbd5e1",
                  color: "#475569",
                }}
              >
                Đóng
              </Button>

              <Button
                variant="contained"
                startIcon={<PlayArrowRoundedIcon />}
                onClick={startGame}
                disabled={validQuestionCount === 0}
                sx={{ ...primaryButtonSx, minWidth: 150, py: 1 }}
              >
                BẮT ĐẦU
              </Button>
            </Stack>
          )}

          {phase === "playing" && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ width: "100%", justifyContent: "center" }}
            >
              <Button
                onClick={handleClose}
                variant="outlined"
                sx={{
                  minWidth: 100,
                  borderRadius: 2.5,
                  fontWeight: 800,
                  textTransform: "none",
                  borderColor: "#cbd5e1",
                  color: "#475569",
                }}
              >
                Thoát
              </Button>

              <Button
                fullWidth
                variant="contained"
                disabled={!answered}
                onClick={nextQuestion}
                sx={{ ...primaryButtonSx, maxWidth: 320, py: 1 }}
              >
                {currentIndex === questions.length - 1
                  ? "HOÀN THÀNH CUỘC THI"
                  : "CÂU TIẾP THEO"}
              </Button>
            </Stack>
          )}

          {phase === "result" && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ width: "100%", justifyContent: "center" }}
            >
              <Button
                onClick={handleClose}
                variant="outlined"
                sx={{
                  minWidth: 100,
                  borderRadius: 2.5,
                  fontWeight: 800,
                  textTransform: "none",
                  borderColor: "#cbd5e1",
                  color: "#475569",
                }}
              >
                Đóng
              </Button>

              <Button
                variant="contained"
                startIcon={<RestartAltRoundedIcon />}
                onClick={restartGame}
                sx={{ ...primaryButtonSx, minWidth: 180, py: 1 }}
              >
                CHƠI LẠI
              </Button>
            </Stack>
          )}
        </DialogActions>
      </Dialog>

      {/* CÁC DIALOG CHỨC NĂNG ĐỘC LẬP */}
      <ArenaConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        duration={duration}
        setDuration={setDuration}
      />

      <QuestionEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        questions={questions}
        setQuestions={setQuestions}
      />
    </>
  );
}
