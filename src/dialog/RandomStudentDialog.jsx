
import React, { useEffect, useRef, useState } from "react";

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
  Popover,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  Divider,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import CasinoIcon from "@mui/icons-material/Casino";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GroupsIcon from "@mui/icons-material/Groups";
import ReplayIcon from "@mui/icons-material/Replay";
import confetti from "canvas-confetti";

const COLORS = [
  "#38BDF8",
  "#818CF8",
  "#A78BFA",
  "#F472B6",
  "#FB7185",
  "#FBBF24",
  "#34D399",
  "#2DD4BF",
  "#60A5FA",
  "#C084FC",
  "#F97316",
];

const WINDOW_SIZE = 11;
const HALF_WINDOW = Math.floor(WINDOW_SIZE / 2);

export default function RandomStudentDialog({
  open,
  onClose,
  students = [],
}) {
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [hasPicked, setHasPicked] = useState(false);
  const [virtualIndex, setVirtualIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Danh sách học sinh được tham gia bốc thăm
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Danh sách đã xáo trộn dùng trong lượt quay
  const [spinStudents, setSpinStudents] = useState([]);

  // Vị trí Popover danh sách học sinh
  const [studentListAnchor, setStudentListAnchor] = useState(null);

  const timeoutRef = useRef(null);
  const celebrationTimerRef = useRef(null);
  const confettiIntervalRef = useRef(null);

  const virtualIndexRef = useRef(0);
  const spinningRef = useRef(false);

  const audioContextRef = useRef(null);
  const spinAudioRef = useRef(null);

  // =========================================
  // NHẬN DIỆN HỌC SINH
  // =========================================

  const getStudentId = (student, index) =>
    String(student.maDinhDanh || student.stt || index);

  // =========================================
  // KHỞI TẠO DANH SÁCH HỌC SINH
  // =========================================

  useEffect(() => {
    if (open) {
      const allIds = students.map((student, index) =>
        getStudentId(student, index)
      );

      setSelectedStudentIds(allIds);
      setSpinStudents([...students]);
    } else {
      setStudentListAnchor(null);
    }
  }, [open]);

  // Danh sách học sinh được chọn
  const eligibleStudents = students.filter((student, index) =>
    selectedStudentIds.includes(getStudentId(student, index))
  );

  // Khi không quay, hiển thị danh sách học sinh hiện được chọn.
  // Khi đang quay, giữ nguyên danh sách đã xáo trộn của lượt đó.
  const displayStudents = spinning ? spinStudents : (
    spinStudents.length === eligibleStudents.length
      ? spinStudents
      : eligibleStudents
  );

  // =========================================
  // XÁO TRỘN NGẪU NHIÊN FISHER-YATES
  // =========================================

  const shuffleStudents = (list) => {
    const shuffled = [...list];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[j]] = [
        shuffled[j],
        shuffled[i],
      ];
    }

    return shuffled;
  };

  // Mở danh sách học sinh
  const handleOpenStudentList = (event) => {
    if (spinning) return;
    setStudentListAnchor(event.currentTarget);
  };

  // Đóng danh sách học sinh
  const handleCloseStudentList = () => {
    setStudentListAnchor(null);
  };

  // Tick / bỏ tick một học sinh
  const handleToggleStudent = (student, index) => {
    if (spinningRef.current) return;

    const id = getStudentId(student, index);

    setSelectedStudentIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];

      const nextStudents = students.filter((item, i) =>
        next.includes(getStudentId(item, i))
      );

      setSpinStudents(nextStudents);

      return next;
    });

    // Xóa kết quả cũ khi thay đổi danh sách
    setWinner(null);
    setHasPicked(false);
    setShowCelebration(false);
  };

  // Chọn tất cả học sinh
  const handleSelectAllStudents = () => {
    if (spinningRef.current) return;

    const allIds = students.map((student, index) =>
      getStudentId(student, index)
    );

    setSelectedStudentIds(allIds);
    setSpinStudents([...students]);

    setWinner(null);
    setHasPicked(false);
    setShowCelebration(false);
  };

  // Bỏ chọn tất cả học sinh
  const handleDeselectAllStudents = () => {
    if (spinningRef.current) return;

    setSelectedStudentIds([]);
    setSpinStudents([]);

    setWinner(null);
    setHasPicked(false);
    setShowCelebration(false);
  };

  // =========================================
  // ÂM THANH CHIẾC NÓN KỲ DIỆU
  // =========================================

  const playSpinAudio = () => {
    const audio = spinAudioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0.75;

    audio.play().catch((error) => {
      console.warn("Không thể phát âm thanh vòng quay:", error);
    });
  };

  const stopSpinAudio = () => {
    const audio = spinAudioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
  };

  // =========================================
  // ÂM THANH CHIẾN THẮNG
  // =========================================

  const getAudioContext = () => {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const audioContext = audioContextRef.current;

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return audioContext;
  };

  const playTone = (
    frequency,
    duration = 0.07,
    volume = 0.045,
    type = "sine",
    delay = 0
  ) => {
    const audioContext = audioContextRef.current;

    if (!audioContext || audioContext.state !== "running") return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    const startTime = audioContext.currentTime + delay;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(
      volume,
      startTime + 0.012
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);

    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  };

  // Nhạc chiến thắng vui nhộn
  const playWinnerSound = () => {
    const notes = [
      { frequency: 659.25, delay: 0, duration: 0.16 },
      { frequency: 783.99, delay: 0.14, duration: 0.16 },
      { frequency: 987.77, delay: 0.28, duration: 0.2 },
      { frequency: 783.99, delay: 0.48, duration: 0.16 },
      { frequency: 1046.5, delay: 0.65, duration: 0.35 },
      { frequency: 1318.5, delay: 0.85, duration: 0.55 },
    ];

    notes.forEach(({ frequency, delay, duration }) => {
      playTone(frequency, duration, 0.055, "triangle", delay);
    });

    [523.25, 659.25, 783.99, 1046.5].forEach((frequency) => {
      playTone(frequency, 0.65, 0.025, "sine", 1.05);
    });
  };

  // =========================================
  // TIMER
  // =========================================

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (celebrationTimerRef.current) {
      clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }

    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
      confettiIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      clearTimers();
      stopSpinAudio();

      spinningRef.current = false;

      setSpinning(false);
      setWinner(null);
      setHasPicked(false);
      setVirtualIndex(0);
      setShowCelebration(false);
      setStudentListAnchor(null);
      setSpinStudents([]);

      virtualIndexRef.current = 0;
    }

    return () => {
      clearTimers();
      stopSpinAudio();
      spinningRef.current = false;
    };
  }, [open]);

  // Giải phóng AudioContext khi component bị hủy
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  // =========================================
  // DỮ LIỆU HỌC SINH
  // =========================================

  const getStudentAt = (index, list = displayStudents) => {
    if (!list.length) return null;

    const realIndex =
      ((index % list.length) + list.length) % list.length;

    return list[realIndex];
  };

  // Tên rút gọn ở các ô xa tâm
  const getShortName = (name = "") => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return words.slice(-2).join(" ");
  };

  // Các ô học sinh đang hiển thị
  const visibleStudents = Array.from(
    { length: WINDOW_SIZE },
    (_, i) => {
      const offset = i - HALF_WINDOW;
      const student = getStudentAt(virtualIndex + offset);

      return {
        offset,
        student,
        distance: Math.abs(offset),
        key: `${virtualIndex + offset}-${
          student?.maDinhDanh || i
        }`,
      };
    }
  );

  // =========================================
  // PHÁO GIẤY CHÚC MỪNG
  // =========================================

  // =========================================
// PHÁO GIẤY CHÚC MỪNG
// =========================================

const launchCelebration = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;

  const defaults = {
    startVelocity: 35,
    spread: 360,
    ticks: 60,
    zIndex: 9999,
  };

  const randomInRange = (min, max) =>
    Math.random() * (max - min) + min;

  // Dọn hiệu ứng cũ trước khi chạy
  if (confettiIntervalRef.current) {
    clearInterval(confettiIntervalRef.current);
    confettiIntervalRef.current = null;
  }

  // Bắn pháo giấy ngay khi có kết quả
  confetti({
    particleCount: 120,
    spread: 100,
    origin: { y: 0.6 },
    zIndex: 9999,
  });

  confettiIntervalRef.current = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(confettiIntervalRef.current);
      confettiIntervalRef.current = null;
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: {
        x: randomInRange(0.1, 0.3),
        y: Math.random() - 0.2,
      },
    });

    confetti({
      ...defaults,
      particleCount,
      origin: {
        x: randomInRange(0.7, 0.9),
        y: Math.random() - 0.2,
      },
    });
  }, 250);
};

  // =========================================
  // BẮT ĐẦU QUAY
  // =========================================

  const handleRandom = () => {
    if (spinningRef.current || !eligibleStudents.length) return;

    clearTimers();

    // Xáo trộn toàn bộ học sinh trước mỗi lượt quay
    const randomizedStudents = shuffleStudents(eligibleStudents);

    // Chọn ngẫu nhiên một vị trí trong danh sách đã xáo trộn.
    // Không loại học sinh vừa trúng ở lượt trước.
    const selectedIndex = Math.floor(
      Math.random() * randomizedStudents.length
    );

    // Lưu danh sách đã xáo trộn để vòng quay sử dụng xuyên suốt
    setSpinStudents(randomizedStudents);

    // Khởi tạo âm thanh và phát nhạc Chiếc nón kỳ diệu
    getAudioContext();
    playSpinAudio();

    spinningRef.current = true;

    setSpinning(true);
    setWinner(null);
    setHasPicked(false);
    setShowCelebration(false);

    const startIndex = virtualIndexRef.current;

    // Ít nhất 2 vòng quay hoặc 25 bước
    const minimumSteps = Math.max(
      randomizedStudents.length * 2,
      25
    );

    const currentTargetIndex =
      (startIndex + minimumSteps) % randomizedStudents.length;

    const extraSteps =
      (
        selectedIndex -
        currentTargetIndex +
        randomizedStudents.length
      ) % randomizedStudents.length;

    const totalSteps = minimumSteps + extraSteps;

    let step = 0;

    const moveNext = () => {
      step += 1;

      const nextIndex = startIndex + step;

      virtualIndexRef.current = nextIndex;
      setVirtualIndex(nextIndex);

      const progress = step / totalSteps;

      if (step >= totalSteps) {
        // Lấy kết quả từ chính danh sách đã xáo trộn
        const selected = randomizedStudents[selectedIndex];

        // Dừng nhạc Chiếc nón kỳ diệu
        stopSpinAudio();

        setWinner(selected);
        setHasPicked(true);
        setSpinning(false);
        setShowCelebration(true);

        spinningRef.current = false;

        // Âm thanh chiến thắng
        playWinnerSound();

        // Pháo giấy chúc mừng
        launchCelebration();

        timeoutRef.current = null;

        celebrationTimerRef.current = setTimeout(() => {
          setShowCelebration(false);
          celebrationTimerRef.current = null;
        }, 3500);

        return;
      }

      // Giảm tốc dần
      const delay = 55 + 280 * Math.pow(progress, 2.8);

      timeoutRef.current = setTimeout(moveNext, delay);
    };

    timeoutRef.current = setTimeout(moveNext, 70);
  };

  // =========================================
  // ĐÓNG DIALOG
  // =========================================

  const handleClose = () => {
    if (spinningRef.current) return;

    stopSpinAudio();
    setStudentListAnchor(null);
    onClose?.();
  };

  // =========================================
  // GIAO DIỆN
  // =========================================

  
return (
  <Dialog
    open={open}
    onClose={handleClose}
    fullWidth
    maxWidth="md"
    TransitionComponent={Fade}
    PaperProps={{
      sx: {
        borderRadius: 4,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 25px 80px rgba(15,23,42,.25)",
      },
    }}
  >
    {/* ÂM THANH VÒNG QUAY CHIẾC NÓN KỲ DIỆU */}
    <audio
      ref={spinAudioRef}
      src="/sounds/chiec-non-ky-dieu.mp3"
      preload="auto"
      loop
    />

    {/* HEADER */}
    <Box
      sx={{
        position: "relative",
        px: { xs: 2, sm: 3 },
        py: { xs: 1.5, sm: 2 },
        color: "#fff",
        background:
          "linear-gradient(115deg, #101b3c 0%, #173b82 55%, #087db5 100%)",
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

      {/* NÚT ĐÓNG */}
      <IconButton
        onClick={handleClose}
        disabled={spinning}
        size="small"
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

      {/* TIÊU ĐỀ */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: { xs: 0.8, sm: 1.5 },
          pr: { xs: 4, sm: 5 },
          minWidth: 0,
        }}
      >
        <Box
          sx={{
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
          <AutoAwesomeIcon sx={{ fontSize: { xs: 22, sm: 27 } }} />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: { xs: 14, sm: 21 },
              fontWeight: 900,
              letterSpacing: { xs: 0, sm: 0.6 },
              lineHeight: 1.25,
              color: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            BỐC THĂM NGẪU NHIÊN
          </Typography>

          <Typography
            sx={{
              mt: 0.45,
              fontSize: { xs: 10, sm: 12 },
              fontWeight: 500,
              color: "rgba(219,234,254,.85)",
              lineHeight: 1.4,
              whiteSpace: "nowrap",
            }}
          >
            Hôm nay ai sẽ được gọi tên?
          </Typography>

          {/* CHIP SĨ SỐ - CHỈ HIỆN TRÊN ĐIỆN THOẠI */}
          <Box
            sx={{
              display: { xs: "block", sm: "none" },
              mt: 0.6,
            }}
          >
            <Chip
              icon={<GroupsIcon />}
              label={`${eligibleStudents.length}/${students.length} HS`}
              size="small"
              onClick={handleOpenStudentList}
              disabled={spinning}
              sx={{
                flexShrink: 0,
                height: 26,
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                bgcolor: "rgba(255,255,255,.11)",
                border: "1px solid rgba(255,255,255,.25)",
                "& .MuiChip-icon": {
                  color: "#bae6fd",
                  fontSize: 20,
                  width: 20,
                  height: 20,
                  ml: 0.7,
                  mr: -0.2,
                },
                "& .MuiChip-label": {
                  px: 0.7,
                },
              }}
            />
          </Box>
        </Box>

        {/* CHIP SĨ SỐ - CHỈ HIỆN TRÊN MÁY TÍNH */}
        <Box
          sx={{
            display: { xs: "none", sm: "block" },
            flexShrink: 0,
          }}
        >
          <Chip
            icon={<GroupsIcon />}
            label={`${eligibleStudents.length}/${students.length} HS`}
            size="small"
            onClick={handleOpenStudentList}
            disabled={spinning}
            sx={{
              flexShrink: 0,
              height: 32,
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              bgcolor: "rgba(255,255,255,.11)",
              border: "1px solid rgba(255,255,255,.25)",
              "& .MuiChip-icon": {
                color: "#bae6fd",
                fontSize: 24,
                width: 24,
                height: 24,
                ml: 0.7,
                mr: -0.2,
              },
              "& .MuiChip-label": {
                px: 0.7,
              },
            }}
          />
        </Box>
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

    {/* POPOVER DANH SÁCH HỌC SINH */}
    <Popover
      open={Boolean(studentListAnchor)}
      anchorEl={studentListAnchor}
      onClose={handleCloseStudentList}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      PaperProps={{
        sx: {
          mt: 1,
          width: 320,
          maxWidth: "90vw",
          borderRadius: 3,
          boxShadow: "0 12px 35px rgba(15,23,42,.2)",
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: 15,
            color: "#172554",
          }}
        >
          DANH SÁCH HỌC SINH
        </Typography>

        <Typography
          sx={{
            mt: 0.5,
            fontSize: 12,
            color: "#64748b",
          }}
        >
          Đã chọn {eligibleStudents.length}/{students.length} học sinh tham gia
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            mt: 1.5,
          }}
        >
          <Button
            size="small"
            variant="outlined"
            onClick={handleSelectAllStudents}
            sx={{
              flex: 1,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Chọn tất cả
          </Button>

          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={handleDeselectAllStudents}
            sx={{
              flex: 1,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Bỏ chọn tất cả
          </Button>
        </Box>
      </Box>

      <Divider />

      <List
        dense
        sx={{
          maxHeight: 350,
          overflowY: "auto",
          py: 0.5,
        }}
      >
        {students.map((student, index) => {
          const id = getStudentId(student, index);
          const checked = selectedStudentIds.includes(id);

          return (
            <ListItem
              key={id}
              disablePadding
              sx={{
                px: 1.5,
                "&:hover": {
                  bgcolor: "#f1f5f9",
                },
              }}
            >
              <FormControlLabel
                sx={{
                  width: "100%",
                  m: 0,
                  py: 0.25,
                  cursor: "pointer",
                }}
                control={
                  <Checkbox
                    size="small"
                    checked={checked}
                    onChange={() =>
                      handleToggleStudent(student, index)
                    }
                    sx={{
                      color: "#94a3b8",
                      "&.Mui-checked": {
                        color: "#2563eb",
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: checked ? "#1e293b" : "#94a3b8",
                    }}
                  >
                    {student.stt ?? index + 1}. {student.hoVaTen}
                  </Typography>
                }
              />
            </ListItem>
          );
        })}

        {students.length === 0 && (
          <Typography
            sx={{
              p: 2,
              textAlign: "center",
              fontSize: 13,
              color: "#94a3b8",
            }}
          >
            Chưa có học sinh.
          </Typography>
        )}
      </List>

      <Divider />

      <Box sx={{ p: 1.5 }}>
        <Box
          sx={{
            px: 1,
            py: 0.25,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button
            size="small"
            onClick={handleClose}
          >
            Đóng
          </Button>
        </Box>
      </Box>
    </Popover>

    {/* NỘI DUNG VÒNG QUAY */}
    <DialogContent
      sx={{
        px: { xs: 1.5, sm: 3 },
        py: 3.5,
        background:
          "linear-gradient(180deg,#f8fbff 0%,#ffffff 100%)",
        overflow: "hidden",
      }}
    >
      <Box sx={{ textAlign: "center", mb: 2 }}>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 2,
            color: "#64748b",
          }}
        >
          {spinning
            ? "ĐANG QUAY TÌM KIẾM..."
            : winner
            ? "ĐÃ TÌM THẤY CHỦ NHÂN MAY MẮN"
            : "VÒNG QUAY HỌC SINH"}
        </Typography>
      </Box>

      {/* DYNAMIC FOCUS WHEEL */}
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          py: 3,
          px: 0,
          borderRadius: 4,
          overflow: "hidden",
          border: winner
            ? "2px solid #fbbf24"
            : "1px solid #dbeafe",
          background:
            "linear-gradient(180deg,#eaf3ff 0%,#f8fbff 50%,#eaf3ff 100%)",
          boxShadow: winner
            ? "0 8px 28px rgba(245,158,11,.14)"
            : "0 8px 25px rgba(37,99,235,.07)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            zIndex: 1,
            top: 0,
            bottom: 0,
            left: "50%",
            width: 3,
            transform: "translateX(-50%)",
            bgcolor: "#f59e0b",
            boxShadow: "0 0 12px rgba(245,158,11,.65)",
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            zIndex: 6,
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "11px solid transparent",
            borderRight: "11px solid transparent",
            borderTop: "17px solid #f59e0b",
          }}
        />

        {/* DẢI CÁC Ô HỌC SINH */}
        <Box
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: { xs: 0.4, sm: 0.7 },
            minHeight: 160,
            px: 0.5,
            overflow: "hidden",
          }}
        >
          {visibleStudents.map(
            ({ offset, student, distance, key }) => {
              const isCenter = offset === 0;

              const color =
                COLORS[
                  ((virtualIndex + offset) % COLORS.length +
                    COLORS.length) %
                    COLORS.length
                ];

              const opacity =
                distance === 0
                  ? 1
                  : Math.max(0.22, 1 - distance * 0.14);

              const width = isCenter
                ? "clamp(125px, 23vw, 190px)"
                : `${Math.max(28, 70 - distance * 7)}px`;

              const height = isCenter
                ? 130
                : Math.max(42, 88 - distance * 8);

              return (
                <Box
                  key={key}
                  sx={{
                    position: "relative",
                    zIndex: isCenter ? 4 : 2,
                    flex: `0 0 ${width}`,
                    width,
                    height,
                    minWidth: 0,
                    borderRadius: isCenter ? 3 : 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    opacity,
                    transform: isCenter
                      ? "scale(1)"
                      : `scale(${1 - distance * 0.045})`,
                    background: isCenter
                      ? `linear-gradient(145deg,${color},#ffffff)`
                      : color,
                    border: isCenter
                      ? "3px solid #fff"
                      : "1px solid rgba(255,255,255,.65)",
                    boxShadow: isCenter
                      ? "0 8px 25px rgba(37,99,235,.28)"
                      : "0 3px 8px rgba(15,23,42,.08)",
                    transition:
                      "width .12s ease, height .12s ease, opacity .12s ease, transform .12s ease",
                    flexShrink: 0,
                  }}
                >
                  {student && (
                    <>
                      {isCenter ? (
                        <Typography
                          sx={{
                            px: 1,
                            width: "100%",
                            textAlign: "center",
                            fontSize: {
                              xs: 15,
                              sm: 18,
                            },
                            lineHeight: 1.3,
                            fontWeight: 900,
                            color: "#172554",
                            overflowWrap: "anywhere",
                            wordBreak: "normal",
                          }}
                        >
                          {student.hoVaTen}
                        </Typography>
                      ) : (
                        <Typography
                          sx={{
                            width: "100%",
                            px: 0.3,
                            textAlign: "center",
                            fontSize: 9,
                            fontWeight: 800,
                            color: "#fff",
                            lineHeight: 1.15,
                            overflow: "hidden",
                            overflowWrap: "anywhere",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {distance >= 4
                            ? ""
                            : getShortName(student.hoVaTen)}
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
              );
            }
          )}
        </Box>
      </Paper>

      {/* KẾT QUẢ */}
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          overflow: "hidden",
          mt: 2.5,
          minHeight: 105,
          borderRadius: 3,
          border: winner
            ? "2px solid #fbbf24"
            : "1px dashed #bfdbfe",
          background: winner
            ? "linear-gradient(135deg,#fffbeb,#fff7d6)"
            : "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          py: 2,
          transition: "all .3s ease",
          animation: showCelebration
            ? "winnerGlow .8s ease-in-out infinite alternate"
            : "none",
          "@keyframes winnerGlow": {
            from: {
              boxShadow: "0 0 8px rgba(245,158,11,.15)",
            },
            to: {
              boxShadow: "0 0 28px rgba(245,158,11,.55)",
            },
          },
        }}
      >
        {/* PHÁO GIẤY */}
        {showCelebration && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            {["🎉", "✨", "🎊", "⭐", "🎉", "✨", "🎊", "⭐"].map(
              (emoji, index) => (
                <Box
                  key={index}
                  sx={{
                    position: "absolute",
                    left: `${8 + index * 12}%`,
                    top: index % 2 === 0 ? "8%" : "65%",
                    fontSize: index % 3 === 0 ? 25 : 19,
                    animation: `celebrate${index} 1.4s ease-out infinite`,
                    [`@keyframes celebrate${index}`]: {
                      "0%": {
                        transform: "translateY(10px) scale(.4) rotate(0deg)",
                        opacity: 0,
                      },
                      "50%": {
                        opacity: 1,
                      },
                      "100%": {
                        transform: `translateY(${
                          index % 2 === 0 ? "-35px" : "35px"
                        }) scale(1.2) rotate(25deg)`,
                        opacity: 0,
                      },
                    },
                  }}
                >
                  {emoji}
                </Box>
              )
            )}
          </Box>
        )}

        {winner ? (
          <>
            <EmojiEventsIcon
              sx={{
                position: "relative",
                zIndex: 6,
                fontSize: 32,
                color: "#e6a000",
                mb: 0.5,
                animation: showCelebration
                  ? "trophyBounce .65s ease-in-out infinite alternate"
                  : "none",
                "@keyframes trophyBounce": {
                  from: {
                    transform: "translateY(0) scale(1)",
                  },
                  to: {
                    transform: "translateY(-7px) scale(1.18)",
                  },
                },
              }}
            />

            <Typography
              sx={{
                position: "relative",
                zIndex: 6,
                fontSize: 11,
                fontWeight: 900,
                color: "#b77900",
                letterSpacing: 1.5,
                mb: 0.5,
              }}
            >
              CHÚC MỪNG HỌC SINH
            </Typography>

            <Typography
              sx={{
                position: "relative",
                zIndex: 6,
                fontSize: { xs: 19, sm: 23 },
                fontWeight: 900,
                color: "#172554",
                textAlign: "center",
                overflowWrap: "anywhere",
              }}
            >
              {winner.hoVaTen}
            </Typography>

            <Chip
              label={`Số thứ tự: ${winner.stt ?? "—"}`}
              size="small"
              sx={{
                position: "relative",
                zIndex: 6,
                mt: 1,
                bgcolor: "#fef3c7",
                color: "#92400e",
                fontWeight: 800,
              }}
            />
          </>
        ) : (
          <>
            <AutoAwesomeIcon
              sx={{
                fontSize: 28,
                color: "#3b82f6",
                mb: 0.5,
                animation: spinning
                  ? "pulse .5s infinite alternate"
                  : "none",
                "@keyframes pulse": {
                  from: {
                    transform: "scale(.85)",
                  },
                  to: {
                    transform: "scale(1.15)",
                  },
                },
              }}
            />

            <Typography
              sx={{
                fontSize: 13,
                color: "#64748b",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              {spinning
                ? "Các ô học sinh đang trượt qua..."
                : "Học sinh được chọn sẽ xuất hiện tại đây"}
            </Typography>
          </>
        )}
      </Paper>

      {/* THÔNG BÁO */}
      <Typography
        sx={{
          textAlign: "center",
          mt: 2,
          mb: 2.5,
          minHeight: 22,
          fontSize: 13,
          color: winner ? "#15803d" : "#64748b",
          fontWeight: 600,
        }}
      >
        {spinning
          ? "Vòng quay đang giảm tốc, hãy chờ kết quả..."
          : winner
          ? "Một cơ hội tuyệt vời để thể hiện kiến thức!"
          : "Tất cả học sinh đều có cơ hội được chọn."}
      </Typography>

      {/* NÚT BỐC THĂM */}
      <Button
        fullWidth
        disabled={spinning || eligibleStudents.length === 0}
        onClick={handleRandom}
        startIcon={
          spinning ? (
            <CasinoIcon />
          ) : winner ? (
            <ReplayIcon />
          ) : (
            <AutoAwesomeIcon />
          )
        }
        sx={{
          py: 1.8,
          borderRadius: 3,
          fontSize: 15,
          fontWeight: 900,
          letterSpacing: 0.6,
          color: "#fff",
          background: spinning
            ? "linear-gradient(90deg,#64748b,#94a3b8)"
            : "linear-gradient(90deg,#2563eb,#0ea5e9)",
          boxShadow: "0 7px 18px rgba(37,99,235,.25)",
          "&:hover": {
            background:
              "linear-gradient(90deg,#1d4ed8,#0284c7)",
            transform: "translateY(-2px)",
            boxShadow: "0 10px 25px rgba(37,99,235,.3)",
          },
          "&.Mui-disabled": {
            color: "#fff",
            opacity: 0.7,
          },
          transition: "all .2s ease",
        }}
      >
        {spinning
          ? "ĐANG BỐC THĂM..."
          : winner
          ? "BỐC THĂM TIẾP"
          : "BẮT ĐẦU BỐC THĂM"}
      </Button>

      {/* THÔNG BÁO DANH SÁCH RỖNG */}
      {eligibleStudents.length === 0 && students.length > 0 && (
        <Typography
          sx={{
            mt: 2,
            textAlign: "center",
            color: "#dc2626",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Chưa chọn học sinh nào tham gia bốc thăm.
        </Typography>
      )}

      {students.length === 0 && (
        <Typography
          sx={{
            mt: 2,
            textAlign: "center",
            color: "#dc2626",
            fontSize: 13,
          }}
        >
          Chưa có danh sách học sinh để bốc thăm.
        </Typography>
      )}

      <Typography
        sx={{
          textAlign: "center",
          color: "#94a3b8",
          fontSize: 11,
          mt: 2.5,
        }}
      >
        HỆ THỐNG HỖ TRỢ GIÁO VIÊN · BÌNH KHÁNH
      </Typography>
    </DialogContent>
  </Dialog>
);

}
