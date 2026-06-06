import React from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Typography,
  Box,
  IconButton,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const StatusResultDialogGV = ({
  open,
  onClose,
  doneStudent,
  config,
  choXemDiem,
  convertPercentToScore,
}) => {
  // 🔥 FIX GỐC: KHÔNG TOUPPERCASE
  const studentName = (doneStudent?.hoVaTen || "Học sinh").normalize("NFC");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "18px",
          overflow: "hidden",
          background: "#f8fafc",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",

          // 🔥 FONT CHUẨN VIỆT NAM
          fontFamily:
            '"Segoe UI","Arial","Helvetica","sans-serif"',

          textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          color: "#fff",
          background: "linear-gradient(135deg, #1976d2, #42a5f5)",
          position: "relative",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🎯
          </Box>

          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
            KẾT QUẢ
          </Typography>
        </Stack>

        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 10,
            top: 10,
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.15)",
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent
        sx={{
          px: 3,
          py: 4,
          textAlign: "center",
        }}
      >
        <Stack spacing={2.5} alignItems="center">

          {/* ICON */}
          <Box
            sx={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "#4caf50",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 38,
            }}
          >
            {choXemDiem ? "🏆" : "✓"}
          </Box>

          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",

              textTransform: "none",
              letterSpacing: 0,

              // 🔥 QUAN TRỌNG NHẤT
              fontFamily:
                '"Segoe UI","Arial","Helvetica","sans-serif"',

              fontFeatureSettings: '"kern" 1',
            }}
          >
            {studentName}
          </Typography>

          {/* STATUS */}
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 600,
              color: choXemDiem ? "#16a34a" : "#dc2626",
            }}
          >
            Đã hoàn thành bài kiểm tra
          </Typography>

          {/* SCORE */}
          <Box
            sx={{
              mt: 1,
              px: 3,
              py: 2,
              borderRadius: "14px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              minWidth: 160,
            }}
          >
            <Typography sx={{ fontSize: 13, color: "#64748b", mb: 1 }}>
              Điểm của bạn
            </Typography>

            <Box
              sx={{
                height: 40, // giữ vùng điểm cố định
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: "#1976d2",
                  lineHeight: 1,
                  textAlign: "center",
                }}
              >
                {choXemDiem
                  ? config?.baiTapTuan
                    ? convertPercentToScore(doneStudent?.diemTN)
                    : config?.kiemTraDinhKi
                    ? doneStudent?.diemTN ?? "0"
                    : ""
                  : "\u200B"}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      {/* ACTION */}
      <Box sx={{ px: 3, pb: 3, display: "flex", justifyContent: "center" }}>
        <Box
          onClick={onClose}
          sx={{
            px: 3,
            py: 1,
            borderRadius: "12px",
            background: "#1976d2",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "0.2s",
            userSelect: "none",
            "&:hover": {
              opacity: 0.9,
              transform: "translateY(-1px)",
            },
            "&:active": {
              transform: "scale(0.98)",
            },
          }}
        >
          OK
        </Box>
      </Box>
    </Dialog>
  );
};

export default StatusResultDialogGV;