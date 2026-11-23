
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Chip,
  Fade,
  TextField,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

import CloseIcon from "@mui/icons-material/Close";
import ExploreIcon from "@mui/icons-material/Explore";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EditIcon from "@mui/icons-material/Edit";
import ReplayIcon from "@mui/icons-material/Replay";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TreasureMapIllustration from "../components/TreasureMapIllustration";
import TreasureMapConfigDialog from "../dialog/TreasureMapConfigDialog";
import SettingsIcon from "@mui/icons-material/Settings";
import { useConfig } from "../context/ConfigContext";

const MAP_THEMES = {
  tropical: {
    id: "tropical",
    name: "Đảo Nhiệt Đới",
    badge: "Bản đồ đảo kho báu",
    explorerEmoji: "🧭",
    goalEmoji: "🏴‍☠️",
    skyTop: "#bae6fd",
    skyBottom: "#e0f2fe",
    sea: "#38bdf8",
    seaWave: "#7dd3fc",
    sand: "#fde68a",
    sandEdge: "#f59e0b",
    landMain: "#86efac",
    landAccent: "#4ade80",
    pathColor: "#92400e",
    pathDash: "#fef08a",
    headerGradient:
      "linear-gradient(115deg, #0f766e 0%, #173b82 55%, #0284c7 100%)",
    decorEmojis: ["🌴", "🐚", "🌺", "⛵"],
    pathStyle: "wave",
    landmarks: [
      "Cửa Rừng Bí Mật",
      "Cầu Tre Qua Suối",
      "Hang Đá Pha Lê",
      "Đỉnh Kho Báu",
      "Thác Cầu Vồng",
      "Bãi San Hô Vàng",
      "Đền Thờ Cổ",
      "Hải Đăng Bình Minh",
    ],
    rewards: [
      "La bàn đồng",
      "Bản đồ cổ",
      "Chìa khóa vàng",
      "Vương miện biển",
      "Ngọc trai xanh",
      "Kính viễn vọng",
      "Đuốc lửa thiêng",
      "Rương Kho Báu Tri Thức",
    ],
  },
  arctic: {
    id: "arctic",
    name: "Vương Quốc Băng Giá",
    badge: "Bản đồ cực bắc",
    explorerEmoji: "🎿",
    goalEmoji: "👑",
    skyTop: "#cffafe",
    skyBottom: "#eff6ff",
    sea: "#0284c7",
    seaWave: "#38bdf8",
    sand: "#e2e8f0",
    sandEdge: "#94a3b8",
    landMain: "#f8fafc",
    landAccent: "#dbeafe",
    pathColor: "#1d4ed8",
    pathDash: "#bae6fd",
    headerGradient:
      "linear-gradient(115deg, #101b3c 0%, #1d4ed8 55%, #0284c7 100%)",
    decorEmojis: ["❄️", "☃️", "🧊", "🌲"],
    pathStyle: "zigzag",
    landmarks: [
      "Cổng Băng Pha Lê",
      "Cầu Tuyết Trắng",
      "Hang Gấu Bắc Cực",
      "Tháp Gió Lạnh",
      "Hồ Gương Băng",
      "Đỉnh Cực Quang",
      "Lâu Đài Tuyết",
      "Kho Báu Pha Lê",
    ],
    rewards: [
      "Áo choàng băng",
      "Mảnh pha lê xanh",
      "Khiên tuyết trắng",
      "Đèn cực quang",
      "Gậy băng cổ",
      "Huy hiệu bắc cực",
      "Chìa khóa sao",
      "Rương Băng Vương",
    ],
  },
  desert: {
    id: "desert",
    name: "Sa Mạc Kim Tự Tháp",
    badge: "Bản đồ cổ đại",
    explorerEmoji: "🐪",
    goalEmoji: "🏺",
    skyTop: "#fef3c7",
    skyBottom: "#ffedd5",
    sea: "#f59e0b",
    seaWave: "#fbbf24",
    sand: "#fcd34d",
    sandEdge: "#d97706",
    landMain: "#fde047",
    landAccent: "#facc15",
    pathColor: "#78350f",
    pathDash: "#fef9c3",
    headerGradient:
      "linear-gradient(115deg, #78350f 0%, #b45309 55%, #d97706 100%)",
    decorEmojis: ["🌵", "☀️", "🏛️", "✨"],
    pathStyle: "dunes",
    landmarks: [
      "Ốc Đảo Xanh",
      "Đụn Cát Vàng",
      "Cổng Mặt Trời",
      "Hành Lang Cổ",
      "Tượng Nhân Sư",
      "Giếng Nước Thiêng",
      "Kim Tự Tháp Đôi",
      "Mật Thất Pharaoh",
    ],
    rewards: [
      "Bình nước ốc đảo",
      "Bùa hộ mệnh cát",
      "Cuộn giấy cổ",
      "Bọ hung vàng",
      "Đồng xu Pharaoh",
      "Vòng tay mặt trời",
      "Chìa khóa cổ đại",
      "Rương Kho Báu Ai Cập",
    ],
  },
  volcano: {
    id: "volcano",
    name: "Đảo Núi Lửa Thần",
    badge: "Bản đồ hỏa sơn",
    explorerEmoji: "🧗",
    goalEmoji: "💎",
    skyTop: "#fee2e2",
    skyBottom: "#ffedd5",
    sea: "#0369a1",
    seaWave: "#38bdf8",
    sand: "#fdba74",
    sandEdge: "#c2410c",
    landMain: "#fca5a5",
    landAccent: "#fb923c",
    pathColor: "#7c2d12",
    pathDash: "#fde047",
    headerGradient:
      "linear-gradient(115deg, #7f1d1d 0%, #c2410c 55%, #ea580c 100%)",
    decorEmojis: ["🌋", "🔥", "🪨", "⚡"],
    pathStyle: "loop",
    landmarks: [
      "Chân Núi Lửa",
      "Khe Đá Nóng",
      "Cầu Đá Bazan",
      "Hang Dung Nham",
      "Mỏm Đá Đỏ",
      "Suối Khoáng Nóng",
      "Miệng Núi Lửa",
      "Kho Báu Hỏa Thần",
    ],
    rewards: [
      "Đá obsidian",
      "Khiên dung nham",
      "Ngọn đuốc đỏ",
      "Mặt nạ cổ",
      "Nhẫn lửa thần",
      "Bùa bình yên",
      "Chìa khóa núi lửa",
      "Rương Kho Báu Hỏa Thần",
    ],
  },
};

const THEME_KEYS = Object.keys(MAP_THEMES);

const CONFETTI_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

// Nhận câu hỏi từ Firestore thay vì SAMPLE_QUIZZES
function buildStages(themeId, count, questions = []) {
  const theme = MAP_THEMES[themeId] || MAP_THEMES.tropical;

  return Array.from({ length: count }, (_, idx) => {
    const quiz = questions[idx] || null;

    const landmark =
      theme.landmarks[idx] || `Địa danh chặng ${idx + 1}`;

    const reward =
      theme.rewards[idx] || `Phần thưởng chặng ${idx + 1}`;

    return {
      id: idx + 1,
      landmark,
      activityTitle: `Hoạt động ${idx + 1}: Khám phá ${landmark}`,
      clue:
        idx === count - 1
          ? "Chặng cuối cùng! Hoàn thành để mở rương kho báu."
          : "Hoàn thành thử thách tại địa danh này để tiến bước tiếp.",

      question: quiz?.question || "",
      options: quiz?.options || [],
      correctIndex: quiz?.correctIndex ?? -1,

      reward,
    };
  });
}

function buildConfettiPieces(count = 64) {
  return Array.from({ length: count }, (_, i) => {
    const left = ((i * 29) % 97) + 1.5;
    const delay = ((i * 17) % 16) * 0.1;
    const duration = 2.4 + ((i * 23) % 14) * 0.14;
    const size = 7 + (i % 6);
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const rotate = (i * 53) % 360;

    return { id: i, left, delay, duration, size, color, rotate };
  });
}

export default function TreasureMapGame({
  open,
  onClose,
  initialStageCount = 4,
  initialMode = "teacher",
}) {
  const { config } = useConfig();

  const selectedClass = config?.lop || "";
  const subject = config?.mon || "Tin học";
  const week = config?.tuan ?? 1;
  const [themeId, setThemeId] = useState("tropical");

  const [stageCount, setStageCount] = useState(
    Math.min(8, Math.max(3, initialStageCount))
  );

  const [mode, setMode] = useState(initialMode);

  const [stages, setStages] = useState(() =>
    buildStages(
      "tropical",
      Math.min(8, Math.max(3, initialStageCount))
    )
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [wrongChoice, setWrongChoice] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [inspectedStage, setInspectedStage] = useState(null);

  const [configOpen, setConfigOpen] = useState(false);

  // Trạng thái tải câu hỏi từ Firestore
  const [loadedQuestions, setLoadedQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionLoadError, setQuestionLoadError] = useState("");

  const audioCtxRef = useRef(null);
  const fanfarePlayedRef = useRef(false);

  const theme = MAP_THEMES[themeId] || MAP_THEMES.tropical;
  const totalSteps = stages.length;
  const currentStage = stages[stepIndex] || stages[0];

  const confettiPieces = useMemo(
    () => buildConfettiPieces(64),
    []
  );

  // Xác định lớp, tuần và document ID Firestore
  const grade =
    String(selectedClass).match(/\d+/)?.[0] || "";

  const weekNumber =
    String(week).match(/\d+/)?.[0] || "";

  const className = grade ? `Lớp ${grade}` : "";

  const documentId =
    grade && subject && weekNumber
      ? `quiz_${className}_${subject}_${weekNumber}`
      : "";

  const getAudioContext = () => {
    try {
      const AudioCtx =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioCtx) return null;

      if (
        !audioCtxRef.current ||
        audioCtxRef.current.state === "closed"
      ) {
        audioCtxRef.current = new AudioCtx();
      }

      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }

      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  const playTone = (
    freq,
    endFreq,
    duration,
    type = "sine",
    peakGain = 0.22
  ) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    if (endFreq && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(
        endFreq,
        now + duration
      );
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(
      peakGain,
      now + 0.025
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  };

  const playStepSound = () => {
    try {
      playTone(587.33, 880, 0.16, "triangle", 0.24);

      setTimeout(
        () => playTone(880, 1046.5, 0.14, "sine", 0.18),
        90
      );
    } catch {
      // Bỏ qua nếu trình duyệt chặn âm thanh
    }
  };

  const playWrongSound = () => {
    try {
      playTone(233.08, 155.56, 0.24, "sawtooth", 0.14);
    } catch {
      // Bỏ qua nếu trình duyệt chặn âm thanh
    }
  };

  const playVictorySound = () => {
    if (fanfarePlayedRef.current) return;

    fanfarePlayedRef.current = true;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [
        { f: 523.25, t: 0, d: 0.16 },
        { f: 659.25, t: 0.16, d: 0.16 },
        { f: 783.99, t: 0.32, d: 0.16 },
        { f: 1046.5, t: 0.48, d: 0.55 },
        { f: 783.99, t: 1.08, d: 0.15 },
        { f: 1046.5, t: 1.25, d: 0.65 },
      ];

      const now = ctx.currentTime;

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(n.f, now + n.t);

        gain.gain.setValueAtTime(0.001, now + n.t);
        gain.gain.exponentialRampToValueAtTime(
          0.28,
          now + n.t + 0.03
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + n.t + n.d
        );

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.02);
      });
    } catch {
      // Bỏ qua nếu trình duyệt chặn âm thanh
    }
  };

  useEffect(() => {
    return () => {
      if (
        audioCtxRef.current &&
        audioCtxRef.current.state !== "closed"
      ) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleClose = () => {
    onClose?.();
  };

  const resetProgress = (nextStages = stages) => {
    setStepIndex(0);
    setCompleted(false);
    setFeedback(null);
    setWrongChoice(null);
    setRewards([]);
    setEditingTitle(false);
    setInspectedStage(null);

    fanfarePlayedRef.current = false;

    if (nextStages.length > 0) {
      setDraftTitle(nextStages[0].activityTitle);
    }
  };

  // Tải câu hỏi từ Firestore khi chọn chế độ HS
  useEffect(() => {
    if (!open || mode !== "quiz") return;

    let cancelled = false;

    const fetchQuestions = async () => {
      setLoadedQuestions([]);
      setQuestionLoadError("");
      setLoadingQuestions(true);

      try {
        if (!grade || !subject || !weekNumber) {
          throw new Error(
            "Không xác định được lớp, môn học hoặc tuần."
          );
        }

        console.log(
          "Đang tải câu hỏi từ Firestore:",
          documentId
        );

        const gameRef = doc(db, "GAME", documentId);
        const snapshot = await getDoc(gameRef);

        if (cancelled) return;

        if (!snapshot.exists()) {
          throw new Error(
            `Không tìm thấy bộ câu hỏi: ${subject} - Lớp ${grade} - Tuần ${weekNumber}`
          );
        }

        const data = snapshot.data();

        // Kiểm tra thông tin document
        console.log("Dữ liệu GAME:", data);

        // Đọc mảng questions từ Firestore
        const questions = Array.isArray(data.questions)
          ? data.questions
              .map((item) => ({
                question: String(item.question || "").trim(),

                options: Array.isArray(item.options)
                  ? item.options.map((option) =>
                      String(option)
                    )
                  : [],

                correctIndex: Number(item.correctIndex),
              }))
              .filter(
                (item) =>
                  item.question &&
                  item.options.length >= 2 &&
                  Number.isInteger(item.correctIndex) &&
                  item.correctIndex >= 0 &&
                  item.correctIndex < item.options.length
              )
          : [];

        if (questions.length === 0) {
          throw new Error(
            "Không có câu hỏi hợp lệ trong document GAME."
          );
        }

        if (cancelled) return;

        // Số chặng lấy theo số câu hỏi thực tế,
        // nhưng không vượt quá số chặng đã cấu hình.
        const count = Math.min(
          stageCount,
          questions.length
        );

        const nextStages = buildStages(
          themeId,
          count,
          questions
        );

        setLoadedQuestions(questions);
        setStageCount(count);
        setStages(nextStages);
        resetProgress(nextStages);
      } catch (error) {
        console.error("Lỗi tải câu hỏi GAME:", error);

        if (!cancelled) {
          setQuestionLoadError(
            error.message || "Không thể tải câu hỏi."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingQuestions(false);
        }
      }
    };

    fetchQuestions();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    mode,
    documentId,
    grade,
    subject,
    weekNumber,
    themeId,
    stageCount,
  ]);

  const handleSelectTheme = (nextThemeId) => {
    setThemeId(nextThemeId);

    const nextStages =
      mode === "quiz"
        ? buildStages(
            nextThemeId,
            Math.min(stageCount, loadedQuestions.length),
            loadedQuestions
          )
        : buildStages(nextThemeId, stageCount);

    setStages(nextStages);
    resetProgress(nextStages);
  };

  const handleRandomTheme = () => {
    const candidates = THEME_KEYS.filter(
      (k) => k !== themeId
    );

    const pick =
      candidates[
        Math.floor(Math.random() * candidates.length)
      ] || "tropical";

    handleSelectTheme(pick);
  };

  const handleChangeStageCount = (nextCount) => {
    const clamped = Math.min(
      8,
      Math.max(3, nextCount)
    );

    setStageCount(clamped);

    const count =
      mode === "quiz"
        ? Math.min(clamped, loadedQuestions.length)
        : clamped;

    const nextStages =
      mode === "quiz"
        ? buildStages(themeId, count, loadedQuestions)
        : buildStages(themeId, count);

    setStages(nextStages);
    resetProgress(nextStages);
  };

  const handleChangeMode = (nextMode) => {
    setMode(nextMode);
    resetProgress(stages);
  };

  const advanceOrFinish = () => {
    const stageReward = currentStage.reward;

    setRewards((prev) =>
      prev.includes(stageReward)
        ? prev
        : [...prev, stageReward]
    );

    if (stepIndex + 1 < totalSteps) {
      const nextIdx = stepIndex + 1;

      playStepSound();

      setStepIndex(nextIdx);
      setFeedback(null);
      setWrongChoice(null);
      setEditingTitle(false);
      setDraftTitle(stages[nextIdx].activityTitle);
    } else {
      setCompleted(true);
      setFeedback(null);
      setWrongChoice(null);
      playVictorySound();
    }
  };

  const handleTeacherCompleteStep = () => {
    if (completed) return;
    advanceOrFinish();
  };

  const handleSelectQuizOption = (optIdx) => {
    if (feedback === "correct" || completed) return;

    if (optIdx === currentStage.correctIndex) {
      playStepSound();

      setFeedback("correct");
      setWrongChoice(null);

      const stageReward = currentStage.reward;

      setRewards((prev) =>
        prev.includes(stageReward)
          ? prev
          : [...prev, stageReward]
      );
    } else {
      playWrongSound();

      setFeedback("wrong");
      setWrongChoice(optIdx);
    }
  };

  const handleSaveTitle = (e) => {
    e.preventDefault();

    const trimmed = draftTitle.trim();
    if (!trimmed) return;

    setStages((prev) =>
      prev.map((st, i) =>
        i === stepIndex
          ? { ...st, activityTitle: trimmed }
          : st
      )
    );

    setEditingTitle(false);
  };

  const handleOpenConfig = () => {
    setConfigOpen(true);
  };

  const handleApplyConfig = ({
    themeId,
    stageCount,
    mode,
    questions,
  }) => {
    const nextCount = Math.min(
      8,
      Math.max(3, stageCount)
    );

    setThemeId(themeId);
    setStageCount(nextCount);
    setMode(mode);

    // Chế độ GV giữ nguyên cách tạo chặng.
    // Chế độ HS sẽ được nạp câu hỏi từ Firestore.
    if (mode === "teacher") {
      const nextStages = buildStages(
        themeId,
        nextCount
      );

      setStages(nextStages);
      resetProgress(nextStages);
    } else {
      const nextStages = buildStages(
        themeId,
        nextCount,
        []
      );

      setStages(nextStages);
      setLoadedQuestions([]);
      setQuestionLoadError("");
      resetProgress(nextStages);
    }

    setConfigOpen(false);
  };

  const progressPct = completed
    ? 100
    : Math.round(
        ((stepIndex +
          (mode === "quiz" && feedback === "correct"
            ? 1
            : 0)) /
          totalSteps) *
          100
      );

  const activeStageForInfo =
    inspectedStage !== null
      ? stages[inspectedStage]
      : currentStage;

  
return (
  <>
    <Dialog
      open={open}
      onClose={(event, reason) => {
        // Không đóng khi bấm ra ngoài hoặc nhấn ESC
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
          borderRadius: 4,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 25px 80px rgba(15,23,42,.25)",
          position: "relative",

          height: "94dvh",
          maxHeight: "94dvh",

          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* PHÁO GIẤY CHÚC MỪNG KHI HOÀN THÀNH */}
      {completed && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            pointerEvents: "none",
            overflow: "hidden",
            "@keyframes tmgConfettiFall": {
              "0%": {
                transform: "translateY(-20px) rotate(0deg)",
                opacity: 1,
              },
              "100%": {
                transform: "translateY(820px) rotate(720deg)",
                opacity: 0.15,
              },
            },
          }}
        >
          {confettiPieces.map((piece) => (
            <Box
              key={piece.id}
              component="span"
              sx={{
                position: "absolute",
                top: -18,
                left: `${piece.left}%`,
                width: `${piece.size}px`,
                height: `${Math.max(5, piece.size * 0.6)}px`,
                backgroundColor: piece.color,
                borderRadius: "2px",
                opacity: 0.95,
                transform: `rotate(${piece.rotate}deg)`,
                animation: `tmgConfettiFall ${piece.duration}s linear ${piece.delay}s infinite`,
              }}
            />
          ))}
        </Box>
      )}

      {/* HEADER */}
      <Box
        sx={{
          position: "relative",
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          color: "#fff",
          background: completed
            ? "linear-gradient(115deg, #d97706 0%, #f59e0b 55%, #ea580c 100%)"
            : theme.headerGradient,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            right: -100,
            top: -150,
            background:
              "radial-gradient(circle, rgba(56,189,248,.25), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: "50%",
            left: "35%",
            bottom: -155,
            background:
              "radial-gradient(circle, rgba(99,102,241,.2), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <IconButton
          onClick={handleClose}
          size="small"
          aria-label="Đóng"
          sx={{
            position: "absolute",
            top: 12,
            right: 14,
            zIndex: 3,
            color: "rgba(255,255,255,.9)",
            bgcolor: "rgba(255,255,255,.10)",
            border: "1px solid rgba(255,255,255,.16)",
            "&:hover": {
              bgcolor: "rgba(255,255,255,.2)",
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: {
              xs: "36px minmax(0, 1fr)",
              sm: "44px minmax(0, 1fr) auto",
            },
            alignItems: "start",
            columnGap: { xs: 0.8, sm: 1.5 },
            rowGap: { xs: 0.8, sm: 0 },
            pr: { xs: 4, sm: 5 },
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              gridColumn: 1,
              gridRow: 1,
              width: { xs: 36, sm: 44 },
              height: { xs: 36, sm: 44 },
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 2.5,
              color: "#fff",
              background:
                "linear-gradient(145deg, #fbbf24 0%, #f59e0b 45%, #ea580c 100%)",
              boxShadow:
                "0 4px 14px rgba(245,158,11,.35), inset 0 1px 2px rgba(255,255,255,.4)",
              border: "1px solid rgba(255,255,255,.35)",
            }}
          >
            {completed ? (
              <EmojiEventsIcon
                sx={{ fontSize: { xs: 22, sm: 27 } }}
              />
            ) : (
              <ExploreIcon
                sx={{ fontSize: { xs: 22, sm: 27 } }}
              />
            )}
          </Box>

          <Box
            sx={{
              gridColumn: 2,
              gridRow: 1,
              minWidth: 0,
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 14, sm: 21 },
                fontWeight: 900,
                letterSpacing: { xs: 0, sm: 0.6 },
                lineHeight: 1.25,
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {completed
                ? "CHINH PHỤC KHO BÁU THÀNH CÔNG!"
                : `${theme.name.toUpperCase()} — ĐI TÌM KHO BÁU`}
            </Typography>

            <Typography
              sx={{
                mt: 0.45,
                fontSize: { xs: 10, sm: 12 },
                fontWeight: 500,
                color: "rgba(219,234,254,.85)",
                lineHeight: 1.4,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {completed
                ? `Đã hoàn thành ${totalSteps}/${totalSteps} chặng hoạt động`
                : `Chặng ${stepIndex + 1}/${totalSteps}: ${currentStage?.landmark || ""}`}
            </Typography>
          </Box>

          <Chip
            label="Cấu hình trò chơi"
            onClick={handleOpenConfig}
            size="small"
            sx={{
              gridColumn: { xs: 2, sm: 3 },
              gridRow: { xs: 2, sm: 1 },
              justifySelf: "start",
              height: 30,
              color: "#fff",
              bgcolor: "rgba(255,255,255,.10)",
              border: "1px solid rgba(255,255,255,.2)",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              "&:hover": {
                bgcolor: "rgba(255,255,255,.2)",
              },
            }}
          />
        </Box>

        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, #38bdf8, #818cf8, transparent)",
            opacity: 0.8,
          }}
        />
      </Box>

      {/* NỘI DUNG CHÍNH */}
      <DialogContent
        sx={{
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1, sm: 1.5 },
          background:
            "linear-gradient(180deg,#f8fbff 0%,#ffffff 100%)",

          display: "flex",
          flexDirection: "column",
          gap: { xs: 1, sm: 1.5 },

          flex: "1 1 0",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* VÙNG BẢN ĐỒ VÀ TIẾN ĐỘ */}
        <Box
          sx={{
            flex: "0 0 auto",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          {/* THU NHỎ BẢN ĐỒ */}
          <Box
            sx={{
              width: {
                xs: "100%",
                sm: "85%",
                md: "70%",
              },
              maxWidth: 800,
              mx: "auto",
              flexShrink: 0,

              "& img": {
                display: "block",
                width: "100%",
                height: "auto",
                objectFit: "contain",
              },
            }}
          >
            <TreasureMapIllustration
              themeId={themeId}
              stages={stages}
              stepIndex={stepIndex}
              completed={completed}
              inspectedStage={inspectedStage}
              onInspect={setInspectedStage}
              explorerEmoji={theme.explorerEmoji}
              goalEmoji={theme.goalEmoji}
            />
          </Box>

          {/* TIẾN ĐỘ */}
          {/*<Box sx={{ width: "100%", flexShrink: 0 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 0.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 1.2,
                  color: "#64748b",
                }}
              >
                TIẾN ĐỘ HÀNH TRÌNH
              </Typography>

              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#2563eb",
                }}
              >
                {progressPct}%
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"
              value={progressPct}
              sx={{
                height: 8,
                borderRadius: 999,
                bgcolor: "#e2e8f0",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 999,
                  background: completed
                    ? "linear-gradient(90deg, #f59e0b, #ea580c)"
                    : "linear-gradient(90deg, #0ea5e9, #2563eb)",
                },
              }}
            />
          </Box>*/}
        </Box>

        {/* VÙNG NỘI DUNG CHẶNG */}
        <Box
          sx={{
            flex: "1 1 0",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* MÀN HÌNH HOÀN THÀNH HOẶC NỘI DUNG CHẶNG */}
          {completed ? (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                textAlign: "center",
                border: "2px solid #fbbf24",
                background:
                  "linear-gradient(135deg,#fffbeb,#fff7d6)",
              }}
            >
              <EmojiEventsIcon
                sx={{ fontSize: 48, color: "#f59e0b" }}
              />

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#92400e",
                }}
              >
                CHÚC MỪNG CẢ LỚP ĐÃ CHINH PHỤC KHO BÁU!
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 13.5,
                  color: "#78350f",
                }}
              >
                Hành trình trên <strong>{theme.name}</strong> đã
                hoàn tất{" "}
                <strong>
                  {totalSteps}/{totalSteps} chặng
                </strong>
                .
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 1,
                  mt: 2,
                }}
              >
                {rewards.map((item) => (
                  <Chip
                    key={item}
                    label={`🎁 ${item}`}
                    size="small"
                    sx={{
                      bgcolor: "#fff",
                      color: "#92400e",
                      fontWeight: 800,
                      border: "1px solid #fcd34d",
                    }}
                  />
                ))}
              </Box>

              <Box sx={{ display: "flex", gap: 1.5, mt: 2.5 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<ReplayIcon />}
                  onClick={() => resetProgress(stages)}
                  sx={{
                    borderRadius: 2.5,
                    textTransform: "none",
                    fontWeight: 800,
                    py: 1.2,
                    background:
                      "linear-gradient(135deg, #f59e0b, #ea580c)",
                  }}
                >
                  Đặt lại
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleClose}
                  sx={{
                    borderRadius: 2.5,
                    textTransform: "none",
                    fontWeight: 800,
                    py: 1.2,
                    borderColor: "#cbd5e1",
                    color: "#0f172a",
                    bgcolor: "#fff",
                  }}
                >
                  Đóng
                </Button>
              </Box>
            </Paper>
          ) : mode === "teacher" ? (
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                bgcolor: "#f8fafc",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#0284c7",
                    letterSpacing: 0.6,
                  }}
                >
                  📍 CHẶNG {stepIndex + 1}/{totalSteps} ·{" "}
                  {currentStage.landmark.toUpperCase()}
                </Typography>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                  onClick={() => {
                    setDraftTitle(currentStage.activityTitle);
                    setEditingTitle((prev) => !prev);
                  }}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 12,
                    bgcolor: "#fff",
                  }}
                >
                  {editingTitle ? "Hủy sửa" : "Sửa tên hoạt động"}
                </Button>
              </Box>

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 13,
                  color: "#64748b",
                }}
              >
                {currentStage.clue}
              </Typography>

              {editingTitle ? (
                <Box
                  component="form"
                  onSubmit={handleSaveTitle}
                  sx={{
                    display: "flex",
                    gap: 1,
                    mt: 1.5,
                  }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    value={draftTitle}
                    onChange={(e) =>
                      setDraftTitle(e.target.value)
                    }
                    placeholder="Nhập tên hoạt động cho chặng này..."
                    autoFocus
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 800,
                      px: 2.5,
                    }}
                  >
                    Lưu
                  </Button>
                </Box>
              ) : (
                <Typography
                  sx={{
                    mt: 1.25,
                    fontSize: 17,
                    fontWeight: 900,
                    color: "#0f172a",
                  }}
                >
                  {currentStage.activityTitle}
                </Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                endIcon={<CheckCircleIcon />}
                onClick={handleTeacherCompleteStep}
                sx={{
                  mt: 2,
                  py: 1.3,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 800,
                  fontSize: 14,
                  background:
                    "linear-gradient(135deg, #16a34a, #059669)",
                  boxShadow:
                    "0 8px 18px rgba(22, 163, 74, 0.24)",
                }}
              >
                {stepIndex + 1 < totalSteps
                  ? "Sang chặng tiếp theo"
                  : "Mở rương kho báu"}
              </Button>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid #e2e8f0",
                bgcolor: "#f8fafc",
              }}
            >
              {loadingQuestions ? (
                <Box sx={{ py: 2, textAlign: "center" }}>
                  <LinearProgress sx={{ mb: 1.5 }} />
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    Đang tải câu hỏi...
                  </Typography>
                </Box>
              ) : questionLoadError ? (
                <Typography
                  sx={{
                    color: "#dc2626",
                    fontWeight: 700,
                    fontSize: 13,
                    textAlign: "center",
                    py: 2,
                  }}
                >
                  {questionLoadError}
                </Typography>
              ) : currentStage ? (
                <>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#0284c7",
                      letterSpacing: 0.6,
                    }}
                  >
                    📍 CHẶNG {stepIndex + 1}/{totalSteps} ·{" "}
                    {currentStage.landmark.toUpperCase()}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 13,
                      color: "#64748b",
                    }}
                  >
                    {currentStage.clue}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1.25,
                      fontSize: 17,
                      fontWeight: 900,
                      color: "#0f172a",
                    }}
                  >
                    {currentStage.question}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      mt: 1.5,
                    }}
                  >
                    {currentStage.options.map((opt, idx) => {
                      const isCorrectOpt =
                        feedback === "correct" &&
                        idx === currentStage.correctIndex;

                      const isWrongOpt =
                        feedback === "wrong" &&
                        idx === wrongChoice;

                      return (
                        <Button
                          key={`${idx}-${opt}`}
                          fullWidth
                          variant="outlined"
                          disabled={feedback === "correct"}
                          onClick={() =>
                            handleSelectQuizOption(idx)
                          }
                          sx={{
                            justifyContent: "flex-start",
                            textAlign: "left",
                            py: 1.3,
                            px: 2,
                            borderRadius: 2.5,
                            textTransform: "none",
                            fontWeight: 700,
                            fontSize: 14,
                            bgcolor: isCorrectOpt
                              ? "#dcfce7"
                              : isWrongOpt
                                ? "#fee2e2"
                                : "#fff",
                            borderColor: isCorrectOpt
                              ? "#22c55e"
                              : isWrongOpt
                                ? "#ef4444"
                                : "#cbd5e1",
                            color: isCorrectOpt
                              ? "#166534"
                              : isWrongOpt
                                ? "#991b1b"
                                : "#0f172a",
                          }}
                        >
                          {String.fromCharCode(65 + idx)}. {opt}
                        </Button>
                      );
                    })}
                  </Box>

                  {feedback === "wrong" && (
                    <Typography
                      sx={{
                        mt: 1.25,
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#dc2626",
                      }}
                    >
                      Chưa chính xác! Hãy thử chọn lại đáp án
                      khác nhé.
                    </Typography>
                  )}

                  {feedback === "correct" && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography
                        sx={{
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: "#15803d",
                        }}
                      >
                        ✨ Chính xác! Bạn nhận được:{" "}
                        {currentStage.reward}
                      </Typography>

                      <Button
                        fullWidth
                        variant="contained"
                        onClick={advanceOrFinish}
                        sx={{
                          mt: 1.5,
                          py: 1.3,
                          borderRadius: 2.5,
                          textTransform: "none",
                          fontWeight: 800,
                          background:
                            "linear-gradient(135deg, #16a34a, #059669)",
                        }}
                      >
                        {stepIndex + 1 < totalSteps
                          ? "Đi tới chặng tiếp theo →"
                          : "🎉 Mở rương kho báu (Hoàn thành)!"}
                      </Button>
                    </Box>
                  )}
                </>
              ) : null}
            </Paper>
          )}
        </Box>
      </DialogContent>
    </Dialog>

    <TreasureMapConfigDialog
      open={configOpen}
      onClose={() => setConfigOpen(false)}
      themeId={themeId}
      stageCount={stageCount}
      mode={mode}
      questions={stages.map((stage) => ({
        question: stage.question || "",
        options: stage.options || ["", "", "", ""],
        correctIndex: stage.correctIndex ?? 0,
      }))}
      onApply={handleApplyConfig}
    />
  </>
);

}
