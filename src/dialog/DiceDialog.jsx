
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

import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";

export default function DiceDialog({ open, onClose }) {
  const [diceCount, setDiceCount] = useState(1);
  const [dice, setDice] = useState([1]);
  const [rolling, setRolling] = useState(false);

  const rollRef = useRef(null);

  // =========================================
  // GIEO XÚC XẮC
  // =========================================

  const rollDice = () => {
    if (rolling) return;

    setRolling(true);

    let count = 0;

    rollRef.current = setInterval(() => {
      setDice(
        Array.from(
          { length: diceCount },
          () => Math.floor(Math.random() * 6) + 1
        )
      );

      count++;

      if (count >= 12) {
        clearInterval(rollRef.current);
        rollRef.current = null;
        setRolling(false);
      }
    }, 100);
  };

  // =========================================
  // DỌN TIMER
  // =========================================

  useEffect(() => {
    return () => {
      if (rollRef.current) {
        clearInterval(rollRef.current);
        rollRef.current = null;
      }
    };
  }, []);

  // =========================================
  // KHỞI TẠO KHI MỞ
  // =========================================

  useEffect(() => {
    if (open) {
      if (rollRef.current) {
        clearInterval(rollRef.current);
        rollRef.current = null;
      }

      setDice([1]);
      setDiceCount(1);
      setRolling(false);
    }
  }, [open]);

  // =========================================
  // DỮ LIỆU
  // =========================================

  const total = dice.reduce((sum, value) => sum + value, 0);

  const diceFace = {
    1: "⚀",
    2: "⚁",
    3: "⚂",
    4: "⚃",
    5: "⚄",
    6: "⚅",
  };

  const handleClose = () => {
    if (rollRef.current) {
      clearInterval(rollRef.current);
      rollRef.current = null;
    }

    setRolling(false);
    onClose?.();
  };

  return (
  <Dialog
    open={open}
    onClose={rolling ? undefined : handleClose}
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
        background: "linear-gradient(115deg,#101B3C 0%,#173B82 55%,#087DB5 100%)",
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
            bgcolor: "rgba(255,255,255,.18)",
          }}
        >
          <CasinoRoundedIcon sx={{ fontSize: 28 }} />
        </Box>

        <Box>
          <Typography fontWeight={900} fontSize={16}>
            XÚC XẮC MAY MẮN
          </Typography>

          <Typography fontSize={11} sx={{ opacity: 0.85 }}>
            Gieo xúc xắc ngẫu nhiên
          </Typography>
        </Box>
      </Stack>

      <IconButton
        onClick={handleClose}
        disabled={rolling}
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
      {/* CHỌN SỐ LƯỢNG */}
      <Typography
        textAlign="center"
        fontSize={12}
        color="#64748B"
        fontWeight={800}
        letterSpacing={0.8}
      >
        CHỌN SỐ LƯỢNG XÚC XẮC
      </Typography>

      <Stack
        direction="row"
        spacing={0.8}
        justifyContent="center"
        sx={{ mt: 1.5 }}
      >
        {[1, 2, 3, 4, 5, 6].map((number) => (
          <Button
            key={number}
            variant={diceCount === number ? "contained" : "outlined"}
            disabled={rolling}
            onClick={() => {
              setDiceCount(number);
              setDice(Array.from({ length: number }, () => 1));
            }}
            sx={{
              minWidth: 38,
              width: 38,
              height: 38,
              p: 0,
              borderRadius: 2,
              fontWeight: 900,
              fontSize: 14,
              color: diceCount === number ? "#FFFFFF" : "#1976D2",
              bgcolor: diceCount === number ? "#1976D2" : "#FFFFFF",
              borderColor: "#93C5FD",
              boxShadow: "none",
              "&:hover": {
                bgcolor: diceCount === number ? "#1565C0" : "#EFF6FF",
                boxShadow: "none",
              },
            }}
          >
            {number}
          </Button>
        ))}
      </Stack>

      {/* KHU VỰC XÚC XẮC */}
      <Box
        sx={{
          mt: 2,
          minHeight: 120,
          borderRadius: 3,
          background: "linear-gradient(135deg,#EFF8FF,#E0F2FE)",
          border: "1px solid #BAE6FD",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.2,
          p: 1.2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -35,
            right: -35,
            width: 110,
            height: 110,
            borderRadius: "50%",
            bgcolor: "rgba(14,165,233,.08)",
          }}
        />

        {dice.map((value, index) => (
          <Box
            key={index}
            sx={{
              width: diceCount >= 5 ? 65 : diceCount >= 3 ? 72 : 88,
              height: diceCount >= 5 ? 65 : diceCount >= 3 ? 72 : 88,
              borderRadius: diceCount >= 5 ? 2 : 3,
              bgcolor: "#FFFFFF",
              border: "2px solid #7DD3FC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: diceCount >= 5 ? 49 : diceCount >= 3 ? 56 : 68,
              color: "#0369A1",
              boxShadow: rolling
                ? "0 5px 15px rgba(2,132,199,.2)"
                : "0 5px 15px rgba(2,132,199,.1)",
              transform: rolling
                ? `rotate(${Math.random() * 30 - 15}deg) scale(${0.92 + Math.random() * 0.16})`
                : "none",
              transition: "transform .1s ease",
              animation: rolling
                ? "diceShake .15s ease-in-out infinite alternate"
                : "diceAppear .3s ease",
              "@keyframes diceShake": {
                from: { transform: "rotate(-8deg) scale(.94)" },
                to: { transform: "rotate(8deg) scale(1.04)" },
              },
              "@keyframes diceAppear": {
                from: { opacity: 0.5, transform: "scale(.8)" },
                to: { opacity: 1, transform: "scale(1)" },
              },
            }}
          >
            {diceFace[value]}
          </Box>
        ))}
      </Box>

      {/* TỔNG ĐIỂM */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          py: 2.5,
        }}
      >
        <Box
          sx={{
            width: 145,
            height: 145,
            borderRadius: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "conic-gradient(#38BDF8,#2563EB,#0EA5E9,#38BDF8)",
            boxShadow: "0 8px 22px rgba(2,132,199,.2)",
          }}
        >
          <Box
            sx={{
              width: "calc(100% - 10px)",
              height: "calc(100% - 10px)",
              borderRadius: "50%",
              bgcolor: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              fontSize={11}
              fontWeight={900}
              letterSpacing={1}
              color="#94A3B8"
            >
              TỔNG ĐIỂM
            </Typography>

            <Typography
              sx={{
                fontSize: 48,
                fontWeight: 900,
                lineHeight: 1.2,
                color: "#1976D2",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {total}
            </Typography>

            <Typography fontSize={10} color="#94A3B8" fontWeight={700}>
              {diceCount} XÚC XẮC
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* TRẠNG THÁI */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.7,
          mb: 1,
        }}
      >
        <AutoAwesomeRoundedIcon
          sx={{
            fontSize: 17,
            color: rolling ? "#D97706" : "#0284C7",
          }}
        />

        <Typography
          fontSize={12}
          fontWeight={800}
          color={rolling ? "#D97706" : "#64748B"}
        >
          {rolling ? "ĐANG GIEO XÚC XẮC..." : "SẴN SÀNG GIEO"}
        </Typography>
      </Box>

      {/* NÚT GIEO */}
      <Button
        fullWidth
        variant="contained"
        startIcon={rolling ? <CasinoRoundedIcon /> : <ReplayRoundedIcon />}
        onClick={rollDice}
        disabled={rolling}
        sx={{
          mt: 1,
          py: 1.4,
          borderRadius: 2.5,
          fontWeight: 900,
          fontSize: 14,
          textTransform: "none",
          color: "#FFFFFF",
          background: "linear-gradient(90deg,#2563EB,#0EA5E9)",
          boxShadow: "0 4px 12px rgba(37,99,235,.22)",
          "&:hover": {
            background: "linear-gradient(90deg,#1D4ED8,#0284C7)",
            boxShadow: "0 6px 16px rgba(37,99,235,.3)",
          },
          "&.Mui-disabled": {
            color: "#FFFFFF",
            background: "#93C5FD",
          },
        }}
      >
        {rolling ? "ĐANG GIEO..." : "GIEO XÚC XẮC"}
      </Button>

      <Typography
        sx={{
          mt: 1.8,
          textAlign: "center",
          fontSize: 10.5,
          color: "#94A3B8",
          fontWeight: 600,
        }}
      >
        Chọn số lượng xúc xắc và nhấn gieo để nhận kết quả ngẫu nhiên
      </Typography>
    </DialogContent>
  </Dialog>
);
}
