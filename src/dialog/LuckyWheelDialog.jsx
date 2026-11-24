
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
import RotateRightRoundedIcon from "@mui/icons-material/RotateRightRounded";
import { useConfig } from "../context/ConfigContext";

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

export default function LuckyWheelDialog({
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
  const [wheelRotation, setWheelRotation] = useState(0);
  const { config } = useConfig();

  // =========================================
  // NHẬN DIỆN HỌC SINH
  // =========================================

  const getStudentId = (student, index) =>
    String(student.maDinhDanh || student.stt || index);

  // =========================================
  // KHỞI TẠO DANH SÁCH HỌC SINH
  // =========================================

  // =========================================
  // KHỞI TẠO - MẶC ĐỊNH CHỌN TẤT CẢ HỌC SINH
  // =========================================

  useEffect(() => {
    if (!open) {
      setStudentListAnchor(null);
      return;
    }

    const allIds = students.map((student, index) =>
      getStudentId(student, index)
    );

    setSelectedStudentIds(allIds);
    setSpinStudents([...students]);

    setWinner(null);
    setHasPicked(false);
    setShowCelebration(false);
  }, [open, students]);

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

  // Xáo trộn danh sách trước mỗi lượt quay
  const randomizedStudents = shuffleStudents(eligibleStudents);


  // Chọn học sinh trúng thưởng
  const selectedIndex = Math.floor(
    Math.random() * randomizedStudents.length
  );

  // Dùng cùng danh sách cho vòng quay
  setSpinStudents(randomizedStudents);

  // Khởi tạo và phát âm thanh
  getAudioContext();
  playSpinAudio();

  spinningRef.current = true;

  setSpinning(true);
  setWinner(null);
  setHasPicked(false);
  setShowCelebration(false);

  // Tính góc phần vòng quay
  const sliceAngle = 360 / randomizedStudents.length;

  // Tâm ô của học sinh được chọn
  const selectedCenterAngle =
    selectedIndex * sliceAngle + sliceAngle / 2;

  // Đưa tâm ô được chọn đến vị trí kim phía trên
  const targetAngle =
    (360 - selectedCenterAngle + 360) % 360;

  // Góc hiện tại
  const currentAngle =
    ((wheelRotation % 360) + 360) % 360;

  // Góc quay thêm
  const extraAngle =
    (targetAngle - currentAngle + 360) % 360;

  // Quay thêm 6 vòng
  const totalRotation =
    wheelRotation + 360 * 6 + extraAngle;

  setWheelRotation(totalRotation);

  // Lưu chính xác học sinh tại vị trí kim chỉ
  const selected = randomizedStudents[selectedIndex];

  // Chờ vòng quay kết thúc
  timeoutRef.current = setTimeout(() => {
    stopSpinAudio();

    setWinner(selected);
    setHasPicked(true);
    setSpinning(false);
    setShowCelebration(true);

    spinningRef.current = false;

    playWinnerSound();
    launchCelebration();

    timeoutRef.current = null;

    celebrationTimerRef.current = setTimeout(() => {
      setShowCelebration(false);
      celebrationTimerRef.current = null;
    }, 3500);
  }, 6500);
};


  // =========================================
  // ĐÓNG DIALOG
  // =========================================

  const handleClose = (event, reason) => {
    // Không đóng Dialog khi bấm ra ngoài
    if (reason === "backdropClick") return;

    if (spinningRef.current) return;

    stopSpinAudio();
    setStudentListAnchor(null);
    onClose?.();
  };

  // =========================================
// DỮ LIỆU VÒNG QUAY
// =========================================

const wheelStudents = spinStudents.length > 0
  ? spinStudents
  : eligibleStudents;

const wheelSliceAngle = wheelStudents.length
  ? 360 / wheelStudents.length
  : 0;

const wheelGradient = wheelStudents.length
  ? `conic-gradient(${wheelStudents
      .map((student, index) => {
        const start = index * wheelSliceAngle;
        const end = (index + 1) * wheelSliceAngle;

        return `${COLORS[index % COLORS.length]} ${start}deg ${end}deg`;
      })
      .join(", ")})`
  : "#e2e8f0";

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
        position: "relative",
        borderRadius: 4,
        overflow: "hidden",
        maxWidth: 850,
        background:
          "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)",
        boxShadow: "0 25px 80px rgba(15,23,42,.25)",
      },
    }}
  >
    {/* ÂM THANH */}
    <audio
      ref={spinAudioRef}
      src="/sounds/chiec-non-ky-dieu.mp3"
      preload="auto"
      loop
    />

    {/* HEADER */}
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        py: 1.5,
        background:
          "linear-gradient(115deg, #101B3C 0%, #173B82 55%, #087DB5 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        flexShrink: 0,
      }}
    >
      {/* TIÊU ĐỀ VÀ CHIP TRÊN ĐIỆN THOẠI */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          minWidth: 0,
        }}
      >
        <RotateRightRoundedIcon
          sx={{
            fontSize: 29,
            flexShrink: 0,
            mt: 0.3,
          }}
        />

        <Box sx={{ minWidth: 0 }}>
          <Typography
            fontWeight={800}
            fontSize={{ xs: 16, sm: 19 }}
            sx={{
              lineHeight: 1.3,
              whiteSpace: "nowrap",
            }}
          >
            VÒNG QUAY MAY MẮN
          </Typography>

          <Typography fontSize={11} sx={{ opacity: 0.85 }}>
            Chọn ngẫu nhiên học sinh
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
              onClick={handleOpenStudentList}
              clickable
              disabled={spinning}
              sx={{
                height: 26,
                fontSize: 11,
                fontWeight: 800,
                color: "#FFFFFF",
                backgroundColor: "rgba(56,189,248,0.16)",
                border: "1px solid rgba(125,211,252,0.4)",
                "& .MuiChip-icon": {
                  color: "#7DD3FC",
                },
                "&:hover": {
                  backgroundColor: "rgba(56,189,248,0.28)",
                },
                "&.Mui-disabled": {
                  color: "#FFFFFF",
                  opacity: 0.7,
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* SĨ SỐ VÀ NÚT ĐÓNG */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 0.5, sm: 1 },
          flexShrink: 0,
        }}
      >
        {/* CHIP SĨ SỐ - CHỈ HIỆN TRÊN MÁY TÍNH */}
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <Chip
            icon={<GroupsIcon />}
            label={`${eligibleStudents.length}/${students.length} HS`}
            onClick={handleOpenStudentList}
            clickable
            disabled={spinning}
            sx={{
              height: 30,
              fontSize: 12,
              fontWeight: 800,
              color: "#FFFFFF",
              backgroundColor: "rgba(56,189,248,0.16)",
              border: "1px solid rgba(125,211,252,0.4)",
              "& .MuiChip-icon": {
                color: "#7DD3FC",
              },
              "&:hover": {
                backgroundColor: "rgba(56,189,248,0.28)",
              },
              "&.Mui-disabled": {
                color: "#FFFFFF",
                opacity: 0.7,
              },
            }}
          />
        </Box>

        <IconButton
          onClick={handleClose}
          disabled={spinning}
          size="small"
          sx={{
            color: "#FFFFFF",
            "&:hover": {
              backgroundColor: "rgba(56,189,248,0.2)",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>

    {/* NỘI DUNG */}
    <DialogContent
      sx={{
        p: { xs: 1, sm: 1.5 },
        background:
          "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)",

        height: {
          xs: 680,
          sm: 700,
        },
        boxSizing: "border-box",

        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* POPUP DANH SÁCH HỌC SINH */}
      <Popover
        open={Boolean(studentListAnchor)}
        anchorEl={studentListAnchor}
        onClose={handleCloseStudentList}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 420,
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography fontWeight={800}>
            Danh sách học sinh
          </Typography>

          <Chip
            size="small"
            label={`${eligibleStudents.length}/${students.length}`}
            color="primary"
          />
        </Box>

        <Divider />

        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            display: "flex",
            gap: 1,
          }}
        >
          <Button
            size="small"
            onClick={handleSelectAllStudents}
            disabled={spinning}
          >
            Chọn tất cả
          </Button>

          <Button
            size="small"
            color="error"
            onClick={handleDeselectAllStudents}
            disabled={spinning}
          >
            Bỏ chọn tất cả
          </Button>
        </Box>

        <Divider />

        <List
          dense
          sx={{
            maxHeight: 290,
            overflowY: "auto",
            py: 0,
          }}
        >
          {students.map((student, index) => {
            const id = getStudentId(student, index);
            const checked = selectedStudentIds.includes(id);

            return (
              <ListItem
                key={id}
                disablePadding
                sx={{ px: 1 }}
              >
                <FormControlLabel
                  sx={{
                    width: "100%",
                    mx: 0,
                    py: 0.2,
                  }}
                  control={
                    <Checkbox
                      size="small"
                      checked={checked}
                      disabled={spinning}
                      onChange={() =>
                        handleToggleStudent(student, index)
                      }
                    />
                  }
                  label={
                    <Typography
                      fontSize={13}
                      color={
                        checked
                          ? "text.primary"
                          : "text.secondary"
                      }
                    >
                      {student.stt ?? index + 1}. {student.hoVaTen}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>

        <Divider />

        <Box
          sx={{
            p: 1,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button
            size="small"
            onClick={handleCloseStudentList}
          >
            Đóng
          </Button>
        </Box>
      </Popover>

      {/* VÒNG QUAY */}
      <Paper
        elevation={0}
        sx={{
          mx: "auto",
          mt: spinning ? 5 : winner ? 1 : 5,

          p: { xs: 1, sm: 1.5 },

          width: "100%",
          maxWidth: winner ? 440 : 510,

          flexShrink: 0,

          borderRadius: 4,
          background: "#FFFFFF",
          border: "1px solid #DBEAFE",

          display: "flex",
          flexDirection: "column",
          alignItems: "center",

          boxShadow: "0 5px 20px rgba(30,64,175,.06)",

          transition:
            "max-width .4s ease, margin-top .4s ease",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",

            maxWidth: winner ? 350 : 480,

            aspectRatio: "1 / 1",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            transition: "max-width .4s ease",
          }}
        >
          {/* KIM CHỈ */}
          <Box
            sx={{
              position: "absolute",
              zIndex: 5,
              top: -2,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "14px solid transparent",
              borderRight: "14px solid transparent",
              borderTop: "29px solid #DC2626",
              filter:
                "drop-shadow(0 3px 3px rgba(0,0,0,0.25))",
            }}
          />

          {/* VIỀN VÀNG */}
          <Box
            sx={{
              width: "94%",
              height: "94%",
              borderRadius: "50%",
              p: "6px",
              background:
                "linear-gradient(135deg, #FDE68A, #F59E0B, #FCD34D)",
              boxShadow:
                "0 6px 18px rgba(30,64,175,0.18)",
            }}
          >
            {/* MẶT VÒNG QUAY */}
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                background: wheelGradient,
                border: "3px solid #FFFFFF",
                transform: `rotate(${wheelRotation}deg)`,
                transition: spinning
                  ? "transform 5.5s cubic-bezier(0.10, 0.72, 0.08, 1)"
                  : "none",
              }}
            >
              {/* TÊN HỌC SINH */}
              {wheelStudents.map((student, index) => {
                const segmentAngle = 360 / wheelStudents.length;
                const angle =
                  index * segmentAngle + segmentAngle / 2;

                const fontSize =
                  wheelStudents.length > 30
                    ? 12
                    : wheelStudents.length > 20
                    ? 13
                    : wheelStudents.length > 12
                    ? 14
                    : 15;

                return (
                  <Box
                    key={`name-${getStudentId(student, index)}`}
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: "50%",
                      height: "0px",
                      transform: `rotate(${angle - 90}deg)`,
                      transformOrigin: "0% 50%",
                      pointerEvents: "none",
                    }}
                  >
                    <Typography
                      sx={{
                        position: "absolute",
                        left: "2%",
                        top: "0",
                        width: "138%",
                        transform: "translateY(-50%)",
                        textAlign: "center",
                        fontWeight: 800,
                        fontSize: `${fontSize}px`,
                        lineHeight: 1.1,
                        color: "#FFFFFF",
                        textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                        whiteSpace: "nowrap",
                        overflow: "visible",
                        textOverflow: "clip",
                      }}
                    >
                      {getShortName(student.hoVaTen)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* TÂM VÒNG QUAY - HIỂN THỊ TÊN LỚP */}
          <Box
            sx={{
              position: "absolute",
              zIndex: 4,
              width: 66,
              height: 66,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, #FFFFFF, #DBEAFE)",
              border: "4px solid #F59E0B",
              boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0.5,
              boxSizing: "border-box",
            }}
          >
            <Typography
              sx={{
                fontSize: {
                  xs: 13,
                  sm: 15,
                },
                fontWeight: 900,
                color: "#1D4ED8",
                textAlign: "center",
                lineHeight: 1.1,
                overflowWrap: "anywhere",
              }}
            >
              {`LỚP ${config?.lop || ""}`}
            </Typography>
          </Box>
        </Box>

        {/* TRẠNG THÁI */}
        <Box
          sx={{
            mt: 0.5,
            minHeight: 25,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Typography
            fontWeight={700}
            fontSize={13}
            color={
              spinning
                ? "primary.main"
                : winner
                ? "success.main"
                : "text.secondary"
            }
          >
            {spinning
              ? "Vòng quay đang tìm kiếm học sinh may mắn..."
              : winner
              ? "Đã tìm được học sinh may mắn!"
              : "Sẵn sàng quay tìm học sinh may mắn?"}
          </Typography>
        </Box>
      </Paper>

      {/* KHU VỰC KẾT QUẢ - GIỮ NGUYÊN CHỖ */}
      <Box
        sx={{
          width: "100%",
          maxWidth: winner ? 470 : 510,
          mx: "auto",
          minHeight: 90,
          flexShrink: 0,
          boxSizing: "border-box",
          transition: "max-width .4s ease",
        }}
      >
        {!spinning && (
          <Fade in={!spinning && Boolean(winner)}>
            <Box>
              {winner && (
                <Paper
                  elevation={0}
                  sx={{
                    width: "100%",
                    boxSizing: "border-box",
                    mt: 1,
                    p: 1.5,
                    borderRadius: 3,
                    textAlign: "center",
                    background:
                      "linear-gradient(135deg, #FEF3C7, #FFFBEB)",
                    border: "2px solid #FBBF24",
                    position: "relative",
                    overflow: "hidden",
                    animation: showCelebration
                      ? "winnerGlow .8s ease-in-out infinite alternate"
                      : "none",
                    "@keyframes winnerGlow": {
                      from: {
                        boxShadow:
                          "0 0 8px rgba(245,158,11,.15)",
                      },
                      to: {
                        boxShadow:
                          "0 0 28px rgba(245,158,11,.45)",
                      },
                    },
                  }}
                >
                  <EmojiEventsIcon
                    sx={{
                      fontSize: 30,
                      color: "#D97706",
                      mb: 0.3,
                    }}
                  />

                  <Typography
                    fontSize={12}
                    fontWeight={700}
                    color="#92400E"
                  >
                    CHÚC MỪNG HỌC SINH MAY MẮN
                  </Typography>

                  <Typography
                    fontSize={{ xs: 20, sm: 24 }}
                    fontWeight={900}
                    color="#B45309"
                    sx={{
                      mt: 0.3,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {winner.hoVaTen}
                  </Typography>

                  <Chip
                    label={`STT: ${winner.stt ?? "—"}`}
                    size="small"
                    sx={{
                      mt: 0.8,
                      bgcolor: "#FDE68A",
                      color: "#92400E",
                      fontWeight: 800,
                    }}
                  />

                  <Typography
                    fontSize={12}
                    color="#92400E"
                    sx={{ mt: 0.5 }}
                  >
                    <AutoAwesomeIcon
                      sx={{
                        fontSize: 14,
                        verticalAlign: "middle",
                        mr: 0.5,
                      }}
                    />
                    Chúc em hoàn thành thật tốt!
                  </Typography>
                </Paper>
              )}
            </Box>
          </Fade>
        )}
      </Box>

      {/* NÚT ĐIỀU KHIỂN - GIỮ NGUYÊN VỊ TRÍ */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 1.5,
          mt: 0.8,
          flexShrink: 0,
          pb: 0.5,
        }}
      >
        <Button
          variant="contained"
          size="large"
          startIcon={
            winner ? <ReplayIcon /> : <RotateRightRoundedIcon />
          }
          onClick={handleRandom}
          disabled={
            spinning || eligibleStudents.length === 0
          }
          sx={{
            minWidth: 190,
            width: 190,
            height: 44,
            minHeight: 44,
            maxHeight: 44,
            boxSizing: "border-box",
            whiteSpace: "nowrap",

            mt: !spinning && !winner ? -7 : spinning ? -7 : 2,

            py: 1,
            px: 2.5,
            borderRadius: 3,
            fontWeight: 800,
            fontSize: 14,
            textTransform: "none",
            background:
              "linear-gradient(90deg, #2563EB, #0EA5E9)",
            boxShadow:
              "0 4px 12px rgba(37,99,235,0.3)",
            "&:hover": {
              background:
                "linear-gradient(90deg, #1D4ED8, #0284C7)",
              boxShadow:
                "0 6px 16px rgba(37,99,235,0.4)",
            },
            "&.Mui-disabled": {
              color: "#FFFFFF",
              background: "#94A3B8",
            },
            transition: "margin-top .4s ease",
          }}
        >
          {spinning
            ? "ĐANG QUAY..."
            : winner
            ? "QUAY LẠI"
            : "BẮT ĐẦU QUAY"}
        </Button>
      </Box>

      {/* THÔNG BÁO */}
      {eligibleStudents.length === 0 && (
        <Typography
          textAlign="center"
          color="error"
          fontSize={12}
          sx={{
            mt: 0.5,
            flexShrink: 0,
          }}
        >
          Vui lòng chọn ít nhất một học sinh tham gia.
        </Typography>
      )}
    </DialogContent>
  </Dialog>
);

}
