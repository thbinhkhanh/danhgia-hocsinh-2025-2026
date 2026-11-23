
import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  TextField,
  Chip,
} from "@mui/material";

import { keyframes } from "@mui/system";

import CloseIcon from "@mui/icons-material/Close";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";

const PRESETS = [1, 2, 3, 5];

// Nhịp đập nhẹ khi còn 10 giây
const pulseAnimation = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 12px 35px rgba(37,99,235,.16);
  }
  50% {
    transform: scale(1.025);
    box-shadow: 0 12px 40px rgba(239,68,68,.2);
  }
`;

// Hiệu ứng khi hết giờ
const finishAnimation = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.045) rotate(-2deg);
  }
  50% {
    transform: scale(1.045) rotate(2deg);
  }
  75% {
    transform: scale(1.02) rotate(-1deg);
  }
`;

const finishTextAnimation = keyframes`
  0%, 100% {
    opacity: 1;
    transform: translateY(0);
  }
  50% {
    opacity: .7;
    transform: translateY(-2px);
  }
`;

export default function CountdownTimerDialog({ open, onClose }) {
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(60);
  const [initialSeconds, setInitialSeconds] = useState(60);
  const [running, setRunning] = useState(false);

  const audioContextRef = useRef(null);
  const secondsRef = useRef(300);
  const soundPlayedRef = useRef(false);

  // Đồng bộ thời gian hiện tại
  secondsRef.current = seconds;

  // Tạo và sử dụng AudioContext
  const getAudioContext = () => {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    return audioContextRef.current;
  };

  // ÂM THANH TÍCH TẮC
  const playTickSound = (nearFinish = false) => {
    try {
      const audioContext = getAudioContext();
      if (!audioContext) return;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(
        nearFinish ? 1500 : 1100,
        audioContext.currentTime
      );

      const volume = nearFinish ? 0.09 : 0.045;

      gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        volume,
        audioContext.currentTime + 0.005
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.055
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.06);
    } catch (error) {
      console.error("Không thể phát tiếng tích tắc:", error);
    }
  };

  // ÂM THANH VUI NHỘN KHI HẾT GIỜ
  const playFinishSound = () => {
    try {
      const audioContext = getAudioContext();
      if (!audioContext) return;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const playTone = (
        frequency,
        startTime,
        duration,
        volume = 0.25
      ) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
          frequency,
          startTime
        );

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(
          volume,
          startTime + 0.04
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          startTime + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioContext.currentTime;

      playTone(784, now, 0.2);
      playTone(988, now + 0.22, 0.2);
      playTone(1175, now + 0.44, 0.25);
      playTone(1568, now + 0.72, 0.65);
      playTone(1175, now + 1.42, 0.25);
      playTone(1568, now + 1.7, 0.7);
    } catch (error) {
      console.error("Không thể phát âm thanh:", error);
    }
  };

  // ĐẾM NGƯỢC
  useEffect(() => {
    if (!open || !running) return;

    const timer = setInterval(() => {
      const currentSeconds = secondsRef.current;

      if (currentSeconds <= 1) {
        secondsRef.current = 0;
        setSeconds(0);
        setRunning(false);

        if (!soundPlayedRef.current) {
          soundPlayedRef.current = true;
          playFinishSound();
        }

        clearInterval(timer);
        return;
      }

      playTickSound(currentSeconds <= 10);

      const nextSeconds = currentSeconds - 1;
      secondsRef.current = nextSeconds;
      setSeconds(nextSeconds);
    }, 1000);

    return () => clearInterval(timer);
  }, [open, running]);

  // DỪNG KHI ĐÓNG DIALOG
  useEffect(() => {
    if (!open) {
      setRunning(false);
    }
  }, [open]);

  // ĐỊNH DẠNG THỜI GIAN
  const formatTime = (value) => {
    const m = Math.floor(value / 60);
    const s = value % 60;

    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // CHỌN THỜI GIAN CÀI ĐẶT
  const selectPreset = (value) => {
    const total = value * 60;

    setMinutes(value);
    setSeconds(total);
    secondsRef.current = total;
    setInitialSeconds(total);
    setRunning(false);
    soundPlayedRef.current = false;
  };

  // BẮT ĐẦU
  const handleStart = () => {
    if (seconds <= 0) {
      setSeconds(initialSeconds);
      secondsRef.current = initialSeconds;
      soundPlayedRef.current = false;
    }

    // Kích hoạt âm thanh từ thao tác người dùng
    try {
      const audioContext = getAudioContext();
      if (audioContext?.state === "suspended") {
        audioContext.resume();
      }
    } catch (error) {
      console.error(error);
    }

    setRunning(true);
  };

  // TẠM DỪNG
  const handlePause = () => {
    setRunning(false);
  };

  // ĐẶT LẠI
  const handleReset = () => {
    setRunning(false);
    setSeconds(initialSeconds);
    secondsRef.current = initialSeconds;
    soundPlayedRef.current = false;
  };

  // NHẬP THỜI GIAN TÙY CHỈNH
  const handleMinutesChange = (event) => {
    const rawValue = event.target.value;

    if (rawValue === "") {
      setMinutes("");
      return;
    }

    const value = Math.max(
      1,
      Math.min(99, Number(rawValue))
    );

    setMinutes(value);

    if (!running) {
      const total = value * 60;

      setSeconds(total);
      secondsRef.current = total;
      setInitialSeconds(total);
      soundPlayedRef.current = false;
    }
  };

  const handleMinutesBlur = () => {
    if (!minutes || Number(minutes) < 1) {
      setMinutes(1);
      setSeconds(60);
      secondsRef.current = 60;
      setInitialSeconds(60);
      soundPlayedRef.current = false;
    }
  };

  // TIẾN TRÌNH
  const progress =
    initialSeconds > 0
      ? ((initialSeconds - seconds) / initialSeconds) * 100
      : 0;

  const isFinished = seconds === 0;
  const isNearFinish = seconds <= 10 && seconds > 0;

  // Vòng tròn xanh trong lúc đếm, đỏ khi kết thúc
  const progressColor = isFinished ? "#ef4444" : "#2563eb";

  
return (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="xs"
    fullWidth
    PaperProps={{
      sx: {
        borderRadius: 4,
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "none",
      },
    }}
  >
    {/* HEADER */}
    <Box
      sx={{
        px: 3,
        py: 2.2,
        color: "#ffffff",
        background: "linear-gradient(135deg,#1d4ed8,#0891b2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.3}>
        <Box
          sx={{
            width: 43,
            height: 43,
            borderRadius: 2.5,
            display: "grid",
            placeItems: "center",
            bgcolor: "rgba(255,255,255,.2)",
          }}
        >
          <HourglassEmptyRoundedIcon sx={{ fontSize: 28 }} />
        </Box>

        <Box>
          <Typography fontWeight={900} fontSize={17}>
            ĐỒNG HỒ ĐẾM NGƯỢC
          </Typography>

          <Typography fontSize={12} sx={{ opacity: 0.85 }}>
            Quản lý thời gian hoạt động
          </Typography>
        </Box>
      </Stack>

      <IconButton
        onClick={onClose}
        sx={{
          color: "#ffffff",
          "&:hover": {
            bgcolor: "rgba(255,255,255,.15)",
          },
        }}
      >
        <CloseIcon />
      </IconButton>
    </Box>

    <DialogContent
      sx={{
        px: { xs: 2.5, sm: 3 },
        py: 3,
        background: "#ffffff",
      }}
    >
      {/* ĐỒNG HỒ TRUNG TÂM */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          py: 1,
        }}
      >
        <Box
          sx={{
            width: 260,
            height: 260,
            maxWidth: "100%",
            aspectRatio: "1 / 1",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",

            background: `conic-gradient(
              ${progressColor} ${progress}%,
              #e8eef7 ${progress}% 100%
            )`,

            boxShadow: "none",

            transition: "background 0.5s linear",

            animation: isFinished
              ? `${finishAnimation} .65s ease-in-out infinite`
              : isNearFinish
              ? `${pulseAnimation} 1s ease-in-out infinite`
              : "none",
          }}
        >
          {/* LÕI ĐỒNG HỒ */}
          <Box
            sx={{
              width: "calc(100% - 18px)",
              height: "calc(100% - 18px)",
              borderRadius: "50%",
              bgcolor: "#ffffff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "none",
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 52, sm: 60 },
                fontWeight: 900,
                letterSpacing: 2,
                fontVariantNumeric: "tabular-nums",
                color: "#ef4444",
                lineHeight: 1.15,
                textShadow: "none",
              }}
            >
              {formatTime(seconds)}
            </Typography>

            <Box
              sx={{
                mt: 1.3,
                px: 2,
                py: 0.65,
                borderRadius: 10,
                bgcolor: isFinished
                  ? "#fef2f2"
                  : isNearFinish
                  ? "#fff7ed"
                  : "#eff6ff",
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 1.2,
                  color: isFinished
                    ? "#dc2626"
                    : isNearFinish
                    ? "#ea580c"
                    : "#2563eb",
                }}
              >
                {isFinished
                  ? "ĐÃ HẾT GIỜ"
                  : isNearFinish
                  ? "SẮP KẾT THÚC"
                  : running
                  ? "ĐANG ĐẾM NGƯỢC"
                  : "SẴN SÀNG"}
              </Typography>
            </Box>

            <Typography
              sx={{
                mt: 1.2,
                fontSize: 11,
                fontWeight: 600,
                color: "#94a3b8",
              }}
            >
              {Math.round(progress)}% thời gian đã trôi qua
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* CHỌN THỜI GIAN */}
      <Box sx={{ mt: 2.5 }}>
        <Typography
          sx={{
            mb: 1.3,
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.7,
            color: "#475569",
          }}
        >
          CHỌN THỜI GIAN
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
        >
          {PRESETS.map((value) => {
            const selected = initialSeconds === value * 60;

            return (
              <Chip
                key={value}
                label={`${value} phút`}
                clickable
                disabled={running}
                onClick={() => selectPreset(value)}
                sx={{
                  flex: 1,
                  height: 40,
                  fontWeight: 900,
                  borderRadius: 2.5,
                  bgcolor: selected ? "#dbeafe" : "#f1f5f9",
                  color: selected ? "#1d4ed8" : "#475569",
                  border: selected
                    ? "1px solid #93c5fd"
                    : "1px solid transparent",
                  "&:hover": {
                    bgcolor: selected ? "#bfdbfe" : "#e2e8f0",
                  },
                  "& .MuiChip-label": {
                    px: 0.5,
                  },
                }}
              />
            );
          })}
        </Stack>
      </Box>

      {/* THỜI GIAN TÙY CHỈNH */}
      <Box sx={{ mt: 2 }}>
        <TextField
          fullWidth
          size="small"
          type="number"
          label="Thời gian tùy chỉnh (phút)"
          value={minutes}
          disabled={running}
          onChange={handleMinutesChange}
          onBlur={handleMinutesBlur}
          inputProps={{
            min: 1,
            max: 99,
            step: 1,
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2.5,
              bgcolor: "#ffffff",
            },
            "& .MuiInputLabel-root": {
              fontWeight: 600,
            },
          }}
        />
      </Box>

      {/* NÚT ĐIỀU KHIỂN */}
      <Stack
        direction="row"
        spacing={1.2}
        sx={{
          mt: 2.5,
          width: "100%",
        }}
      >
        <Button
          fullWidth
          variant="contained"
          startIcon={
            running ? (
              <PauseRoundedIcon />
            ) : (
              <PlayArrowRoundedIcon />
            )
          }
          onClick={running ? handlePause : handleStart}
          sx={{
            flex: 1,
            minWidth: 0,
            py: 1.35,
            borderRadius: 2.5,
            fontWeight: 900,
            textTransform: "none",
            fontSize: 15,
            color: "#ffffff",
            background: running
              ? "linear-gradient(135deg,#f59e0b,#ea580c)"
              : "linear-gradient(135deg,#2563eb,#0891b2)",
            boxShadow: "none",
            "&:hover": {
              background: running
                ? "linear-gradient(135deg,#d97706,#c2410c)"
                : "linear-gradient(135deg,#1d4ed8,#0e7490)",
              boxShadow: "none",
            },
          }}
        >
          {running ? "Tạm dừng" : "Bắt đầu"}
        </Button>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<ReplayRoundedIcon />}
          onClick={handleReset}
          sx={{
            flex: 1,
            minWidth: 0,
            py: 1.35,
            borderRadius: 2.5,
            fontWeight: 900,
            fontSize: 15,
            textTransform: "none",
            borderColor: "#cbd5e1",
            color: "#475569",
            boxShadow: "none",
            "&:hover": {
              borderColor: "#2563eb",
              bgcolor: "#eff6ff",
              boxShadow: "none",
            },
          }}
        >
          Đặt lại
        </Button>
      </Stack>

      {/* THÔNG BÁO HẾT GIỜ */}
      {isFinished && (
        <Box
          sx={{
            mt: 2.2,
            p: 1.7,
            borderRadius: 2.5,
            textAlign: "center",
            bgcolor: "#fef2f2",
            border: "1px solid #fecaca",
            animation: `${finishTextAnimation} 1s ease-in-out infinite`,
          }}
        >
          <Typography
            fontWeight={900}
            color="#dc2626"
            fontSize={16}
          >
            ⏰ ĐÃ HẾT THỜI GIAN!
          </Typography>

          <Typography
            sx={{
              mt: 0.4,
              fontSize: 12,
              fontWeight: 600,
              color: "#b91c1c",
            }}
          >
            Hoạt động đã kết thúc
          </Typography>
        </Box>
      )}
    </DialogContent>
  </Dialog>
);

}
