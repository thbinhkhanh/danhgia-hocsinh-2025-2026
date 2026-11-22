
import React, { useEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  Chip,
} from "@mui/material";

import { keyframes } from "@mui/system";

import CloseIcon from "@mui/icons-material/Close";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";

const pulseAnimation = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 12px 35px rgba(37,99,235,.12);
  }
  50% {
    transform: scale(1.015);
    box-shadow: 0 12px 40px rgba(8,145,178,.2);
  }
`;

export default function StopwatchDialog({ open, onClose }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  const elapsedRef = useRef(0);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  // Định dạng thời gian
  const formatTime = (value) => {
    const totalSeconds = Math.floor(value / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((value % 1000) / 10);

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(
        minutes
      ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}.${String(milliseconds).padStart(2, "0")}`;
  };

  // Bắt đầu bấm giờ
  const handleStart = () => {
    if (running) return;

    startTimeRef.current = Date.now() - elapsedRef.current;
    setRunning(true);
  };

  // Tạm dừng
  const handlePause = () => {
    if (!running) return;

    const current = Date.now() - startTimeRef.current;

    elapsedRef.current = current;
    setElapsed(current);
    setRunning(false);
  };

  // Đặt lại
  const handleReset = () => {
    setRunning(false);
    elapsedRef.current = 0;
    startTimeRef.current = null;
    setElapsed(0);
  };

  // Cập nhật thời gian
  useEffect(() => {
    if (!open || !running) return;

    intervalRef.current = setInterval(() => {
      const current = Date.now() - startTimeRef.current;
      elapsedRef.current = current;
      setElapsed(current);
    }, 30);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [open, running]);

  // Dừng và đặt lại khi đóng dialog
  useEffect(() => {
    if (!open) {
      setRunning(false);
      elapsedRef.current = 0;
      startTimeRef.current = null;
      setElapsed(0);
    }
  }, [open]);

  // Đóng dialog
  const handleClose = () => {
    setRunning(false);
    elapsedRef.current = 0;
    startTimeRef.current = null;
    setElapsed(0);
    onClose?.();
  };

  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const isLongTime = minutes >= 60;

  const progress = (elapsed % 60000) / 60000 * 100;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
            <TimerRoundedIcon sx={{ fontSize: 28 }} />
          </Box>

          <Box>
            <Typography fontWeight={900} fontSize={17}>
              BẤM GIỜ HOẠT ĐỘNG
            </Typography>

            <Typography fontSize={12} sx={{ opacity: 0.85 }}>
              Theo dõi thời lượng hoạt động
            </Typography>
          </Box>
        </Stack>

        <IconButton
          onClick={handleClose}
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
                #2563eb ${progress}%,
                #e8eef7 ${progress}% 100%
              )`,
              transition: "background 0.15s linear",
              animation: running
                ? `${pulseAnimation} 2s ease-in-out infinite`
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
              }}
            >
              <Typography
                sx={{
                  fontSize: {
  xs: isLongTime ? 30 : 38,
  sm: isLongTime ? 34 : 42,
},
                  fontWeight: 900,
                  letterSpacing: 1,
                  fontVariantNumeric: "tabular-nums",
                  color: "#2563eb",
                  lineHeight: 1.2,
                }}
              >
                {formatTime(elapsed)}
              </Typography>

              <Box
                sx={{
                  mt: 1.5,
                  px: 2,
                  py: 0.65,
                  borderRadius: 10,
                  bgcolor: running ? "#eff6ff" : "#f1f5f9",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    color: running ? "#2563eb" : "#64748b",
                  }}
                >
                  {running
                    ? "ĐANG BẤM GIỜ"
                    : elapsed > 0
                    ? "ĐÃ TẠM DỪNG"
                    : "SẴN SÀNG"}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* THÔNG TIN */}
        <Box
          sx={{
            mt: 2.5,
            p: 1.5,
            borderRadius: 2.5,
            bgcolor: "#f8fafc",
            border: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <Typography
            fontSize={12}
            fontWeight={700}
            color="#64748b"
          >
            THỜI GIAN HOẠT ĐỘNG
          </Typography>

          <Typography
            fontSize={21}
            fontWeight={900}
            color="#1e293b"
            sx={{ mt: 0.4 }}
          >
            {Math.floor(totalSeconds / 60)} phút{" "}
            {totalSeconds % 60} giây
          </Typography>
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

        {/* GỢI Ý */}
        <Typography
          sx={{
            mt: 2,
            textAlign: "center",
            fontSize: 11,
            color: "#94a3b8",
            fontWeight: 600,
          }}
        >
          Bấm bắt đầu để tính thời gian, tạm dừng khi hoạt động kết thúc
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
