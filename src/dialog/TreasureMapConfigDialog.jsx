
import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Chip,
  Fade,
  TextField,
  MenuItem,
  CircularProgress,
  Stack,
  Divider,
  Alert,
  Snackbar,
  Tooltip,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import ThemePreviewDialog from "../dialog/ThemePreviewDialog";
import QuestionBankSection from "./QuestionBankSection";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// ======================================================
// LƯU Ý: Điều chỉnh đường dẫn này theo cấu trúc dự án.
// Ví dụ: import { db } from "../firebase";
// ======================================================
import { db } from "../firebase";

// ======================================================
// DANH SÁCH CẤU HÌNH
// ======================================================

const MAP_THEMES = {
  tropical: {
    name: "Đảo Nhiệt Đới",
    emoji: "🏝️",
    description: "Khám phá hòn đảo xanh",
    color: "#0ea5e9",
    light: "#e0f2fe",
  },
  arctic: {
    name: "Vương Quốc Băng Giá",
    emoji: "❄️",
    description: "Chinh phục miền băng tuyết",
    color: "#6366f1",
    light: "#eef2ff",
  },
  desert: {
    name: "Sa Mạc Kim Tự Tháp",
    emoji: "🏜️",
    description: "Tìm kho báu giữa sa mạc",
    color: "#d97706",
    light: "#fef3c7",
  },
  volcano: {
    name: "Đảo Núi Lửa Thần",
    emoji: "🌋",
    description: "Vượt thử thách núi lửa",
    color: "#e11d48",
    light: "#ffe4e6",
  },
};

const THEME_KEYS = Object.keys(MAP_THEMES);

const GRADE_OPTIONS = [
  "Lớp 1",
  "Lớp 2",
  "Lớp 3",
  "Lớp 4",
  "Lớp 5",
];

const SUBJECT_OPTIONS = [
  "Âm nhạc",
  "Công nghệ",
  "Đạo đức",
  "Giáo dục thể chất",
  "Hoạt động trải nghiệm",
  "Khoa học",
  "Lịch sử và Địa lí",
  "Mĩ thuật",
  "Tiếng Anh",
  "Tiếng dân tộc",
  "Tiếng Việt",
  "Tin học",
  "Toán",
  "Tự nhiên và Xã hội",
];

const WEEK_OPTIONS = Array.from(
  { length: 35 },
  (_, index) => index + 1
);

// ======================================================
// HÀM TẠO DỮ LIỆU CÂU HỎI
// ======================================================

const createEmptyQuestion = (question = {}) => ({
  question: question.question || "",
  options: Array.from({ length: 4 }, (_, index) =>
    question.options?.[index] || ""
  ),
  correctIndex: Number(question.correctIndex ?? 0),
});

const createEmptyQuestions = (count, source = []) => {
  return Array.from({ length: count }, (_, index) =>
    createEmptyQuestion(source[index])
  );
};

// ======================================================
// FIRESTORE
// Collection: GAME
// Document: quiz_Lớp 4_Tin học_10
// ======================================================

const createQuizDocId = (lop, mon, tuan) => {
  return `quiz_${lop}_${mon}_${tuan}`;
};

// Tải câu hỏi từ Firestore
const loadQuizFromFirestore = async ({ lop, mon, tuan }) => {
  const docId = createQuizDocId(lop, mon, tuan);

  const docRef = doc(db, "GAME", docId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return {
      exists: false,
      docId,
      questions: [],
    };
  }

  const data = snapshot.data();

  return {
    exists: true,
    docId,
    questions: Array.isArray(data.questions)
      ? data.questions.map(createEmptyQuestion)
      : [],
    data,
  };
};

// Lưu hoặc cập nhật câu hỏi
const saveQuizToFirestore = async ({
  lop,
  mon,
  tuan,
  questions,
}) => {
  const docId = createQuizDocId(lop, mon, tuan);

  const docRef = doc(db, "GAME", docId);

  await setDoc(
    docRef,
    {
      lop,
      mon,
      tuan: Number(tuan),
      questions: questions.map(createEmptyQuestion),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return docId;
};

// ======================================================
// COMPONENT
// ======================================================

export default function TreasureMapConfigDialog({
  open,
  onClose,
  themeId = "tropical",
  stageCount = 4,
  mode = "teacher",
  questions = [],
  onApply,
}) {
  // --------------------------------------------------
  // STATE CẤU HÌNH TRÒ CHƠI
  // --------------------------------------------------

  const [draftThemeId, setDraftThemeId] = useState(themeId);
  const [draftStageCount, setDraftStageCount] = useState(stageCount);
  const [draftMode, setDraftMode] = useState(mode);

  // --------------------------------------------------
  // STATE CHỌN BỘ CÂU HỎI
  // --------------------------------------------------

  const [draftGrade, setDraftGrade] = useState("Lớp 4");
  const [draftSubject, setDraftSubject] = useState("Tin học");
  const [draftWeek, setDraftWeek] = useState(10);

  // --------------------------------------------------
  // STATE CÂU HỎI
  // --------------------------------------------------

  const [draftQuestions, setDraftQuestions] = useState(
    createEmptyQuestions(stageCount, questions)
  );

  const [currentStage, setCurrentStage] = useState(0);

  // --------------------------------------------------
  // STATE FIRESTORE
  // --------------------------------------------------

  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [hasExistingQuestions, setHasExistingQuestions] = useState(false);
  const [loadedDocId, setLoadedDocId] = useState("");

  const [previewThemeId, setPreviewThemeId] = useState(null);
  const [questionBankOpen, setQuestionBankOpen] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Dùng để tránh kết quả tải cũ ghi đè dữ liệu mới
  const requestIdRef = useRef(0);

  // Tránh tự động tải nhiều lần khi vừa mở dialog
  const initializedRef = useRef(false);

  const currentTheme = MAP_THEMES[draftThemeId] || MAP_THEMES.tropical;

  const currentQuestion =
    draftQuestions[currentStage] || createEmptyQuestion();

  const currentDocId = useMemo(
    () =>
      createQuizDocId(
        draftGrade,
        draftSubject,
        draftWeek
      ),
    [draftGrade, draftSubject, draftWeek]
  );

  const questionBankName = `Câu hỏi ${draftGrade} - ${draftSubject} - Tuần ${draftWeek}`;

  // --------------------------------------------------
  // THÔNG BÁO
  // --------------------------------------------------

  const showMessage = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const closeSnackbar = () => {
    setSnackbar((prev) => ({
      ...prev,
      open: false,
    }));
  };

  // --------------------------------------------------
  // KHỞI TẠO KHI MỞ DIALOG
  // --------------------------------------------------

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }

    setDraftThemeId(themeId);
    setDraftStageCount(stageCount);
    setDraftMode(mode);

    setDraftQuestions(
      createEmptyQuestions(stageCount, questions)
    );

    setCurrentStage(0);
    initializedRef.current = true;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, themeId, stageCount, mode]);

  // --------------------------------------------------
  // TẢI CÂU HỎI TỰ ĐỘNG KHI ĐỔI LỚP / MÔN / TUẦN
  // --------------------------------------------------

  useEffect(() => {
    if (!open || !initializedRef.current) return;

    let active = true;
    const requestId = ++requestIdRef.current;

    const loadQuestions = async () => {
      setLoadingQuestions(true);

      try {
        const result = await loadQuizFromFirestore({
          lop: draftGrade,
          mon: draftSubject,
          tuan: draftWeek,
        });

        if (!active || requestId !== requestIdRef.current) {
          return;
        }

        if (result.exists) {
          const loadedQuestions = createEmptyQuestions(
            Math.max(3, Math.min(8, draftStageCount)),
            result.questions
          );

          setDraftQuestions(loadedQuestions);
          setHasExistingQuestions(true);
          setLoadedDocId(result.docId);

          /*showMessage(
            `Đã mở bộ câu hỏi ${result.docId}`,
            "success"
          );*/
        } else {
          setDraftQuestions(
            createEmptyQuestions(draftStageCount)
          );

          setHasExistingQuestions(false);
          setLoadedDocId("");

          if (draftMode === "quiz") {
            showMessage(
              `Chưa có câu hỏi cho ${draftGrade} - ${draftSubject} - Tuần ${draftWeek}. Bạn có thể tạo mới.`,
              "info"
            );
          }
        }

        setCurrentStage(0);
      } catch (error) {
        console.error("Lỗi tải câu hỏi:", error);

        if (active && requestId === requestIdRef.current) {
          setDraftQuestions(
            createEmptyQuestions(draftStageCount)
          );

          setHasExistingQuestions(false);
          setLoadedDocId("");

          showMessage(
            "Không thể tải câu hỏi từ Firestore.",
            "error"
          );
        }
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoadingQuestions(false);
        }
      }
    };

    loadQuestions();

    return () => {
      active = false;
    };
  }, [
    open,
    draftGrade,
    draftSubject,
    draftWeek,
    draftStageCount,
  ]);

  // Kiểm tra các form câu hỏi trong state có nội dung hay chưa
  const hasDraftQuestionContent = draftQuestions.some((item) => {
    const hasQuestion = Boolean(item.question?.trim());

    const hasOptions = item.options?.some((option) =>
      option?.trim()
    );

    return hasQuestion || hasOptions;
  });

  // HS trả lời chỉ được áp dụng khi Firestore đã có bộ câu hỏi
  const canApplyConfig =
    draftMode !== "quiz" ||
    (hasExistingQuestions && !loadingQuestions);

  // --------------------------------------------------
  // THAY ĐỔI SỐ CHẶNG
  // --------------------------------------------------

  const handleStageCountChange = (nextCount) => {
    const count = Math.min(8, Math.max(3, nextCount));

    setDraftStageCount(count);

    setDraftQuestions((prev) =>
      createEmptyQuestions(count, prev)
    );

    setCurrentStage((prev) =>
      Math.min(prev, count - 1)
    );
  };

  // --------------------------------------------------
  // CẬP NHẬT CÂU HỎI
  // --------------------------------------------------

  const updateQuestion = (value) => {
    setDraftQuestions((prev) =>
      prev.map((item, index) =>
        index === currentStage
          ? { ...item, question: value }
          : item
      )
    );
  };

  const updateOption = (optionIndex, value) => {
    setDraftQuestions((prev) =>
      prev.map((item, index) =>
        index === currentStage
          ? {
              ...item,
              options: item.options.map((option, i) =>
                i === optionIndex ? value : option
              ),
            }
          : item
      )
    );
  };

  const updateCorrectAnswer = (correctIndex) => {
    setDraftQuestions((prev) =>
      prev.map((item, index) =>
        index === currentStage
          ? {
              ...item,
              correctIndex: Number(correctIndex),
            }
          : item
      )
    );
  };

  // --------------------------------------------------
  // CHUYỂN CHẶNG
  // --------------------------------------------------

  const handlePreviousStage = () => {
    setCurrentStage((prev) => Math.max(0, prev - 1));
  };

  const handleNextStage = () => {
    setCurrentStage((prev) =>
      Math.min(draftStageCount - 1, prev + 1)
    );
  };

  const handleSelectStage = (index) => {
    setCurrentStage(index);
  };

  // --------------------------------------------------
  // LƯU FIRESTORE
  // --------------------------------------------------

  const handleSaveQuestions = async () => {
    if (loadingQuestions || savingQuestions) return;

    if (
      !draftGrade ||
      !draftSubject ||
      !draftWeek
    ) {
      showMessage("Vui lòng chọn đầy đủ Lớp, Môn và Tuần.", "warning");
      return;
    }

    const normalizedQuestions = createEmptyQuestions(
      draftStageCount,
      draftQuestions
    );

    const hasEmptyQuestion = normalizedQuestions.some(
      (item) => !item.question.trim()
    );

    if (hasEmptyQuestion) {
      showMessage(
        "Vui lòng nhập nội dung câu hỏi cho tất cả các chặng.",
        "warning"
      );
      return;
    }

    const hasEmptyOption = normalizedQuestions.some(
      (item) => item.options.some((option) => !option.trim())
    );

    if (hasEmptyOption) {
      showMessage(
        "Vui lòng nhập đầy đủ 4 phương án trả lời cho tất cả các chặng.",
        "warning"
      );
      return;
    }

    setSavingQuestions(true);

    try {
      const docId = await saveQuizToFirestore({
        lop: draftGrade,
        mon: draftSubject,
        tuan: draftWeek,
        questions: normalizedQuestions,
      });

      setHasExistingQuestions(true);
      setLoadedDocId(docId);

      showMessage(
        `Đã lưu thành công: ${docId}`,
        "success"
      );
    } catch (error) {
      console.error("Lỗi lưu câu hỏi:", error);

      showMessage(
        "Lưu câu hỏi thất bại. Vui lòng kiểm tra kết nối Firestore.",
        "error"
      );
    } finally {
      setSavingQuestions(false);
    }
  };

  // --------------------------------------------------
  // TẢI LẠI CÂU HỎI HIỆN TẠI
  // --------------------------------------------------

  const handleReloadQuestions = async () => {
    if (loadingQuestions || savingQuestions) return;

    const requestId = ++requestIdRef.current;

    setLoadingQuestions(true);

    try {
      const result = await loadQuizFromFirestore({
        lop: draftGrade,
        mon: draftSubject,
        tuan: draftWeek,
      });

      if (requestId !== requestIdRef.current) return;

      if (result.exists) {
        setDraftQuestions(
          createEmptyQuestions(
            draftStageCount,
            result.questions
          )
        );

        setHasExistingQuestions(true);
        setLoadedDocId(result.docId);

        showMessage("Đã tải lại câu hỏi.", "success");
      } else {
        setDraftQuestions(
          createEmptyQuestions(draftStageCount)
        );

        setHasExistingQuestions(false);
        setLoadedDocId("");

        showMessage("Bộ câu hỏi này chưa được lưu.", "info");
      }

      setCurrentStage(0);
    } catch (error) {
      console.error(error);
      showMessage("Không thể tải câu hỏi.", "error");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingQuestions(false);
      }
    }
  };

  // --------------------------------------------------
  // ÁP DỤNG CẤU HÌNH VÀO TRÒ CHƠI
  // --------------------------------------------------

  const handleApply = () => {
    onApply?.({
      themeId: draftThemeId,
      stageCount: draftStageCount,
      mode: draftMode,
      questions: createEmptyQuestions(
        draftStageCount,
        draftQuestions
      ),
      grade: draftGrade,
      subject: draftSubject,
      week: draftWeek,
    });
  };

  // --------------------------------------------------
  // STYLE CHUNG
  // --------------------------------------------------

  const fieldSx = {
    "& .MuiInputBase-root": {
      minHeight: 48,
      borderRadius: 2,
      fontSize: 15,
      backgroundColor: "#fff",
    },
    "& .MuiInputBase-input": {
      fontSize: 15,
      py: 1.3,
    },
    "& .MuiInputLabel-root": {
      fontSize: 14,
    },
    "& .MuiSelect-select": {
      fontSize: 15,
      display: "flex",
      alignItems: "center",
    },
  };

  const optionLabels = ["A", "B", "C", "D"];
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ======================================================
  // RENDER
  // ======================================================

  
return (
  <>
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionComponent={Fade}
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          maxHeight: "94vh",
        },
      }}
    >
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}

      <DialogTitle
        sx={{
          p: 2,
          color: "#fff",
          background: "linear-gradient(120deg, #075985, #2563eb)",
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
        >
          <Box display="flex" alignItems="center" gap={1.2}>
            <SettingsRoundedIcon sx={{ fontSize: 27 }} />

            <Box>
              <Typography
                fontWeight={800}
                fontSize={18}
                lineHeight={1.3}
              >
                CẤU HÌNH BẢN ĐỒ KHO BÁU
              </Typography>

              <Typography fontSize={12} sx={{ opacity: 0.9 }}>
                Thiết lập trò chơi và ngân hàng câu hỏi
              </Typography>
            </Box>
          </Box>

          <IconButton
            onClick={onClose}
            sx={{ color: "#fff" }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* ============================================ */}
      {/* CONTENT */}
      {/* ============================================ */}

      <DialogContent
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          backgroundColor: "#f8fafc",
        }}
      >
        {/* ------------------------------------------ */}
        {/* 1. CHỌN BẢN ĐỒ */}
        {/* ------------------------------------------ */}

        <Box mb={2.5}>
          <Box display="flex" alignItems="center" gap={1} mb={1.2}>
            <PublicRoundedIcon color="primary" />

            <Typography fontWeight={800} fontSize={15} mt={2}>
              1. CHỌN BẢN ĐỒ
            </Typography>
          </Box>

          <Box
            display="grid"
            gridTemplateColumns="repeat(4, minmax(0, 1fr))"
            gap={1}
          >
            {THEME_KEYS.map((key) => {
              const theme = MAP_THEMES[key];
              const selected = draftThemeId === key;

              return (
                <Paper
                  key={key}
                  onClick={() => {
                    setDraftThemeId(key);
                    setPreviewThemeId(key);
                  }}
                  elevation={0}
                  sx={{
                    p: { xs: 0.8, sm: 1.2 },
                    textAlign: "center",
                    cursor: "pointer",
                    borderRadius: 2,
                    border: selected
                      ? `2px solid ${theme.color}`
                      : "1px solid #e2e8f0",
                    backgroundColor: selected
                      ? theme.light
                      : "#fff",
                    transition: "0.2s",
                    minWidth: 0,
                    "&:hover": {
                      borderColor: theme.color,
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Typography fontSize={{ xs: 24, sm: 30 }}>
                    {theme.emoji}
                  </Typography>

                  <Typography
                    fontSize={{ xs: 10, sm: 12 }}
                    fontWeight={800}
                    sx={{
                      lineHeight: 1.35,
                      mt: 0.5,
                    }}
                  >
                    {theme.name}
                  </Typography>

                  {selected && (
                    <CheckCircleRoundedIcon
                      sx={{
                        color: theme.color,
                        fontSize: 17,
                        mt: 0.4,
                      }}
                    />
                  )}
                </Paper>
              );
            })}
          </Box>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* ------------------------------------------ */}
        {/* 2. SỐ LƯỢNG CHẶNG */}
        {/* ------------------------------------------ */}

        <Box mb={2.5}>
          <Box
            display="flex"
            alignItems="center"
            gap={0.8}
            mb={1.3}
          >
            <SettingsRoundedIcon
              sx={{ fontSize: 22, color: "#2563eb" }}
            />

            <Typography
              fontSize={14}
              fontWeight={900}
              color="#172554"
              letterSpacing={0.4}
            >
              SỐ LƯỢNG CHẶNG
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 3,
              border: "1px solid #dbeafe",
              background:
                "linear-gradient(110deg,#eff6ff 0%,#fff 65%,#f0f9ff 100%)",
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap={1}
            >
              <Box minWidth={0}>
                <Typography
                  fontSize={14}
                  fontWeight={800}
                  color="#334155"
                >
                  Hành trình khám phá
                </Typography>

                <Typography
                  mt={0.35}
                  fontSize={12}
                  color="#64748b"
                >
                  Từ 3 đến 8 chặng
                </Typography>
              </Box>

              <Box
                display="flex"
                alignItems="center"
                gap={1}
                flexShrink={0}
              >
                <IconButton
                  size="small"
                  disabled={draftStageCount <= 3}
                  onClick={() =>
                    handleStageCountChange(draftStageCount - 1)
                  }
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    color: "#2563eb",
                    border: "1px solid #bfdbfe",
                    bgcolor: "#fff",
                  }}
                >
                  <Typography fontSize={22} lineHeight={1}>
                    −
                  </Typography>
                </IconButton>

                <Box minWidth={65} textAlign="center">
                  <Typography
                    fontSize={24}
                    lineHeight={1.1}
                    fontWeight={900}
                    color="#1d4ed8"
                  >
                    {draftStageCount}
                  </Typography>

                  <Typography
                    fontSize={11}
                    fontWeight={800}
                    color="#64748b"
                  >
                    CHẶNG
                  </Typography>
                </Box>

                <IconButton
                  size="small"
                  disabled={draftStageCount >= 8}
                  onClick={() =>
                    handleStageCountChange(draftStageCount + 1)
                  }
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    color: "#fff",
                    bgcolor: "#2563eb",
                    "&:hover": {
                      bgcolor: "#1d4ed8",
                    },
                    "&.Mui-disabled": {
                      bgcolor: "#e2e8f0",
                      color: "#94a3b8",
                    },
                  }}
                >
                  <AddRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* THANH TIẾN ĐỘ SỐ CHẶNG */}

            <Box
              display="flex"
              alignItems="center"
              gap={0.5}
              mt={1.6}
            >
              {Array.from({ length: 8 }, (_, index) => (
                <Box
                  key={index}
                  flex={1}
                  height={7}
                  borderRadius={5}
                  bgcolor={
                    index < draftStageCount
                      ? "#3b82f6"
                      : "#e2e8f0"
                  }
                />
              ))}
            </Box>
          </Paper>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* ------------------------------------------ */}
        {/* 3. CHẾ ĐỘ CHƠI */}
        {/* ------------------------------------------ */}

        <Box mb={2.5}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <SchoolRoundedIcon color="primary" />

            <Typography fontWeight={800} fontSize={15}>
              3. CHẾ ĐỘ CHƠI
            </Typography>
          </Box>

          <Box
            display="grid"
            gridTemplateColumns="repeat(2, minmax(0, 1fr))"
            gap={1.2}
          >
            <Paper
              onClick={() => setDraftMode("teacher")}
              elevation={0}
              sx={{
                p: 1.5,
                cursor: "pointer",
                borderRadius: 2,
                border:
                  draftMode === "teacher"
                    ? "2px solid #0284c7"
                    : "1px solid #e2e8f0",
                background:
                  draftMode === "teacher" ? "#e0f2fe" : "#fff",
              }}
            >
              <Typography fontSize={25} textAlign="center">
                👩‍🏫
              </Typography>

              <Typography
                fontWeight={800}
                fontSize={14}
                textAlign="center"
              >
                GV điều khiển
              </Typography>

              <Typography
                fontSize={12}
                color="text.secondary"
                textAlign="center"
              >
                Giáo viên điều khiển trò chơi
              </Typography>
            </Paper>

            <Paper
              onClick={() => setDraftMode("quiz")}
              elevation={0}
              sx={{
                p: 1.5,
                cursor: "pointer",
                borderRadius: 2,
                border:
                  draftMode === "quiz"
                    ? "2px solid #0284c7"
                    : "1px solid #e2e8f0",
                background:
                  draftMode === "quiz" ? "#e0f2fe" : "#fff",
              }}
            >
              <Typography fontSize={25} textAlign="center">
                🧑‍🎓
              </Typography>

              <Typography
                fontWeight={800}
                fontSize={14}
                textAlign="center"
              >
                HS trả lời
              </Typography>

              <Typography
                fontSize={12}
                color="text.secondary"
                textAlign="center"
              >
                Học sinh chọn đáp án
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* ========================================== */}
        {/* 4. NGÂN HÀNG CÂU HỎI */}
        {/* ========================================== */}

        <QuestionBankSection
          draftMode={draftMode}
          draftGrade={draftGrade}
          setDraftGrade={setDraftGrade}
          draftSubject={draftSubject}
          setDraftSubject={setDraftSubject}
          draftWeek={draftWeek}
          setDraftWeek={setDraftWeek}
          GRADE_OPTIONS={GRADE_OPTIONS}
          SUBJECT_OPTIONS={SUBJECT_OPTIONS}
          WEEK_OPTIONS={WEEK_OPTIONS}
          fieldSx={fieldSx}
          questionBankName={questionBankName}
          loadingQuestions={loadingQuestions}
          savingQuestions={savingQuestions}
          handleReloadQuestions={handleReloadQuestions}
          hasExistingQuestions={hasExistingQuestions}
          currentStage={currentStage}
          currentQuestion={currentQuestion}
          draftStageCount={draftStageCount}
          draftQuestions={draftQuestions}
          handleSelectStage={handleSelectStage}
          updateQuestion={updateQuestion}
          optionLabels={optionLabels}
          updateOption={updateOption}
          updateCorrectAnswer={updateCorrectAnswer}
          handlePreviousStage={handlePreviousStage}
          handleNextStage={handleNextStage}
        />

        {/* ------------------------------------------ */}
        {/* THÔNG TIN TỔNG HỢP - LUÔN HIỂN THỊ */}
        {/* ------------------------------------------ */}

        <Paper
          elevation={0}
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 2,
            border: "1px solid #bae6fd",
            backgroundColor: "#f0f9ff",
          }}
        >
          <Typography
            fontSize={14}
            fontWeight={800}
            color="#075985"
            mb={1}
          >
            TỔNG QUAN CẤU HÌNH
          </Typography>

          <Box
            display="flex"
            flexDirection="column"
            gap={0.6}
          >
            <Typography fontSize={13} color="#334155">
              <strong>Bản đồ:</strong> {currentTheme.emoji} {currentTheme.name}
            </Typography>

            <Typography fontSize={13} color="#334155">
              <strong>Số chặng:</strong> {draftStageCount} chặng
            </Typography>

            <Typography fontSize={13} color="#334155">
              <strong>Chế độ:</strong>{" "}
              {draftMode === "quiz" ? "HS trả lời" : "GV điều khiển"}
            </Typography>
          </Box>
        </Paper>
      </DialogContent>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}

      <DialogActions
        sx={{
          p: 1.5,
          px: { xs: 1.5, sm: 2.5 },
          borderTop: "1px solid #e2e8f0",
          backgroundColor: "#fff",
          display: "flex",
          justifyContent: "center",
          gap: 1.5,
        }}
      >
        {draftMode === "quiz" && (
          <Button
            variant="contained"
            size="large"
            startIcon={
              savingQuestions ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveRoundedIcon />
              )
            }
            disabled={
              savingQuestions ||
              loadingQuestions ||
              !hasDraftQuestionContent
            }
            onClick={handleSaveQuestions}
            sx={{
              minWidth: { xs: 145, sm: 165 },
              height: 44,
              minHeight: 44,
              boxSizing: "border-box",
              whiteSpace: "nowrap",
              px: 2,
              borderRadius: 3,
              fontWeight: 800,
              fontSize: 14,
              textTransform: "none",
              background: "linear-gradient(90deg, #16a34a, #059669)",
              boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
              "&:hover": {
                background: "linear-gradient(90deg, #15803d, #047857)",
                boxShadow: "0 6px 16px rgba(22,163,74,0.35)",
              },
              "&.Mui-disabled": {
                color: "#fff",
                background: "#94a3b8",
              },
            }}
          >
            {savingQuestions ? "Đang lưu..." : "Lưu câu hỏi"}
          </Button>
        )}

        <Button
          variant="contained"
          size="large"
          startIcon={<CheckCircleRoundedIcon />}
          disabled={
            loadingQuestions ||
            savingQuestions ||
            !canApplyConfig
          }
          onClick={handleApply}
          sx={{
            minWidth: { xs: 125, sm: 190 },
            height: 44,
            minHeight: 44,
            boxSizing: "border-box",
            whiteSpace: "nowrap",
            px: 2.5,
            borderRadius: 3,
            fontWeight: 800,
            fontSize: 14,
            textTransform: "none",
            background: "linear-gradient(90deg, #2563EB, #0EA5E9)",
            boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            "&:hover": {
              background: "linear-gradient(90deg, #1D4ED8, #0284C7)",
              boxShadow: "0 6px 16px rgba(37,99,235,0.4)",
            },
            "&.Mui-disabled": {
              color: "#fff",
              background: "#94A3B8",
            },
          }}
        >
          {isMobile ? "Áp dụng" : "Áp dụng cấu hình"}
        </Button>
      </DialogActions>
    </Dialog>

    {/* ============================================ */}
    {/* SNACKBAR */}
    {/* ============================================ */}

    <Snackbar
      open={snackbar.open}
      autoHideDuration={3500}
      onClose={closeSnackbar}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
    >
      <Alert
        onClose={closeSnackbar}
        severity={snackbar.severity}
        variant="filled"
        sx={{
          width: "100%",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>

    <ThemePreviewDialog
      open={Boolean(previewThemeId)}
      themeId={previewThemeId}
      theme={MAP_THEMES[previewThemeId]}
      onClose={() => setPreviewThemeId(null)}
      onSelect={() => {
        setDraftThemeId(previewThemeId);
        setPreviewThemeId(null);
      }}
    />
  </>
  
);

}
