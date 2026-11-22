
import React, { useEffect, useRef, useState } from "react";

import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  Button,
  IconButton,
  Stack,
} from "@mui/material";

import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";

export default function NoiseMeterDialog({ open, onClose }) {
  const [level, setLevel] = useState(0);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const analyserRef = useRef(null);

  // =========================================
  // TẮT MICRO
  // =========================================

  const stopMicrophone = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.close().catch(() => {});
      audioRef.current = null;
    }

    analyserRef.current = null;
    setListening(false);
    setLevel(0);
  };

  // =========================================
  // BẬT MICRO
  // =========================================

  const startMicrophone = async () => {
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ sử dụng micro.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      const audioContext = new AudioContextClass();
      audioRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;

        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / dataArray.length);
        const value = Math.min(100, Math.round(rms * 350));

        setLevel(value);
        frameRef.current = requestAnimationFrame(updateLevel);
      };

      setListening(true);
      updateLevel();
    } catch (err) {
      console.error(err);

      setError(
        "Không thể truy cập micro. Vui lòng cấp quyền sử dụng micro cho trình duyệt."
      );

      stopMicrophone();
    }
  };

  // =========================================
  // TỰ ĐỘNG TẮT KHI ĐÓNG
  // =========================================

  useEffect(() => {
    if (!open) {
      stopMicrophone();
    }

    return () => stopMicrophone();
  }, [open]);

  // =========================================
  // TRẠNG THÁI ÂM THANH
  // =========================================

  const noiseStatus =
    level < 15
      ? { label: "YÊN TĨNH", color: "#059669", bg: "#ECFDF5" }
      : level < 40
      ? { label: "BÌNH THƯỜNG", color: "#2563EB", bg: "#EFF6FF" }
      : level < 70
      ? { label: "HƠI ỒN", color: "#D97706", bg: "#FFFBEB" }
      : { label: "ỒN ÀO", color: "#DC2626", bg: "#FEF2F2" };

  const progressBackground = `conic-gradient(
    ${noiseStatus.color} ${level * 3.6}deg,
    #E8EEF7 ${level * 3.6}deg 360deg
  )`;

  const handleClose = () => {
    stopMicrophone();
    onClose?.();
  };

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
          background: "#FFFFFF",
          boxShadow: "0 20px 60px rgba(15,23,42,.16)",
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          color: "#FFFFFF",
          background: "linear-gradient(135deg,#1D4ED8,#0891B2)",
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
            <GraphicEqRoundedIcon sx={{ fontSize: 27 }} />
          </Box>

          <Box>
            <Typography fontWeight={900} fontSize={16}>
              ĐO ÂM LƯỢNG LỚP HỌC
            </Typography>

            <Typography fontSize={11} sx={{ opacity: 0.85 }}>
              Theo dõi mức độ tiếng ồn
            </Typography>
          </Box>
        </Stack>

        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: "#FFFFFF",
            "&:hover": {
              bgcolor: "rgba(255,255,255,.15)",
            },
          }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </Box>

      <DialogContent
        sx={{
          px: 2.5,
          py: 3,
          background: "#FFFFFF",
        }}
      >
        {/* GIỚI THIỆU */}
        <Typography
          textAlign="center"
          fontSize={12}
          color="#64748B"
          fontWeight={600}
        >
          MỨC ÂM THANH MÔI TRƯỜNG
        </Typography>

        {/* ĐỒNG HỒ ĐO ÂM LƯỢNG */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            py: 3,
          }}
        >
          <Box
            sx={{
              width: 230,
              height: 230,
              maxWidth: "100%",
              aspectRatio: "1 / 1",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: progressBackground,
              transition: "background .2s ease",
              animation: listening
                ? "noisePulse 2s ease-in-out infinite"
                : "none",
              "@keyframes noisePulse": {
                "0%, 100%": {
                  filter: "drop-shadow(0 0 5px rgba(37,99,235,.08))",
                },
                "50%": {
                  filter: "drop-shadow(0 0 13px rgba(37,99,235,.22))",
                },
              },
            }}
          >
            {/* LÕI ĐỒNG HỒ */}
            <Box
              sx={{
                width: "calc(100% - 17px)",
                height: "calc(100% - 17px)",
                borderRadius: "50%",
                bgcolor: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 0 0 15px rgba(15,23,42,.04)",
              }}
            >
              <VolumeUpRoundedIcon
                sx={{
                  fontSize: 29,
                  color: noiseStatus.color,
                  mb: 0.3,
                }}
              />

              <Typography
                sx={{
                  fontSize: 57,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  letterSpacing: -2,
                  fontVariantNumeric: "tabular-nums",
                  color: noiseStatus.color,
                  transition: "color .2s",
                }}
              >
                {level}
              </Typography>

              <Typography
                fontSize={11}
                fontWeight={800}
                letterSpacing={1.5}
                color="#94A3B8"
                sx={{ mt: 0.4 }}
              >
                MỨC ÂM THANH
              </Typography>

              <Box
                sx={{
                  mt: 1.3,
                  px: 2,
                  py: 0.65,
                  borderRadius: 10,
                  bgcolor: noiseStatus.bg,
                  transition: "all .2s",
                }}
              >
                <Typography
                  fontSize={11}
                  fontWeight={900}
                  letterSpacing={0.8}
                  color={noiseStatus.color}
                >
                  {listening ? noiseStatus.label : "CHƯA BẬT MICRO"}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* THANG ĐO */}
        <Box sx={{ px: 0.5 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 0.8,
            }}
          >
            <Typography fontSize={11} fontWeight={700} color="#64748B">
              MỨC ĐỘ TIẾNG ỒN
            </Typography>

            <Typography
              fontSize={12}
              fontWeight={900}
              color={noiseStatus.color}
            >
              {level}/100
            </Typography>
          </Box>

          <Box
            sx={{
              height: 12,
              borderRadius: 10,
              bgcolor: "#E2E8F0",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${level}%`,
                height: "100%",
                borderRadius: 10,
                background: `linear-gradient(90deg,#10B981,#F59E0B,#EF4444)`,
                transition: "width .15s ease",
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 0.6,
            }}
          >
            <Typography fontSize={10} color="#94A3B8">
              Yên tĩnh
            </Typography>
            <Typography fontSize={10} color="#94A3B8">
              Ồn ào
            </Typography>
          </Box>
        </Box>

        {/* CHÚ THÍCH TRẠNG THÁI */}
        <Stack
          direction="row"
          spacing={0.7}
          justifyContent="center"
          sx={{ mt: 2.2 }}
        >
          {[
            { label: "Yên tĩnh", color: "#059669" },
            { label: "Bình thường", color: "#2563EB" },
            { label: "Hơi ồn", color: "#D97706" },
            { label: "Ồn ào", color: "#DC2626" },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.4,
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  bgcolor: item.color,
                  flexShrink: 0,
                }}
              />
              <Typography
                fontSize={9}
                color="#64748B"
                whiteSpace="nowrap"
              >
                {item.label}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* THÔNG BÁO LỖI */}
        {error && (
          <Box
            sx={{
              mt: 2,
              p: 1.2,
              borderRadius: 2,
              bgcolor: "#FEF2F2",
              border: "1px solid #FECACA",
            }}
          >
            <Typography
              color="#DC2626"
              fontSize={12}
              textAlign="center"
            >
              {error}
            </Typography>
          </Box>
        )}

        {/* NÚT ĐIỀU KHIỂN */}
        <Button
          fullWidth
          variant="contained"
          startIcon={
            listening ? <StopRoundedIcon /> : <MicRoundedIcon />
          }
          onClick={listening ? stopMicrophone : startMicrophone}
          sx={{
            mt: 3,
            py: 1.35,
            borderRadius: 2.5,
            fontWeight: 900,
            fontSize: 14,
            textTransform: "none",
            color: "#FFFFFF",
            background: listening
              ? "linear-gradient(135deg,#EF4444,#DC2626)"
              : "linear-gradient(135deg,#2563EB,#0891B2)",
            boxShadow: "none",
            "&:hover": {
              background: listening
                ? "linear-gradient(135deg,#DC2626,#B91C1C)"
                : "linear-gradient(135deg,#1D4ED8,#0E7490)",
              boxShadow: "none",
            },
          }}
        >
          {listening ? "TẮT MICRO" : "BẬT MICRO"}
        </Button>

        {/* GỢI Ý */}
        <Typography
          sx={{
            mt: 1.8,
            textAlign: "center",
            fontSize: 10.5,
            color: "#94A3B8",
            fontWeight: 600,
            lineHeight: 1.6,
          }}
        >
          Chỉ số thể hiện mức âm thanh tương đối, không phải đơn vị decibel (dB) đã hiệu chuẩn.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
