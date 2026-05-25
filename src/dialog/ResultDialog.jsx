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

const ResultDialog = ({
  open,
  onClose,
  dialogMode,
  dialogMessage,
  studentResult,
  choXemDiem,
  configData,
  convertPercentToScore,
}) => {
  const studentName = (studentResult?.hoVaTen || "Học sinh").normalize("NFC");

  const getScore = () => {
    if (!choXemDiem) return null;

    if (configData?.kiemTraDinhKi) {
      return studentResult?.diem;
    }

    if (configData?.baiTapTuan) {
      return convertPercentToScore(studentResult?.diemTN);
    }

    if (configData?.onTap) {
      return studentResult?.diem;
    }

    return "";
  };

  return (
  <Dialog
    open={open}
    onClose={(event, reason) => {
      if (reason === "backdropClick" || reason === "escapeKeyDown") return;
      onClose();
    }}
    disableEscapeKeyDown
    maxWidth="xs"
    fullWidth
    PaperProps={{
      sx: {
        borderRadius: "18px",
        overflow: "hidden",
        background: "#f8fafc",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",

        // ✅ FONT CHUẨN VIỆT NAM
        fontFamily:
          '"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',

        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",

        fontFeatureSettings: '"kern" 1, "liga" 1',
      },
    }}
  >
    {/* HEADER */}
    <Box
      sx={{
        px: 3,
        py: 2,
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
          📊
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
      {dialogMode === "notFound" ? (
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 700,
            color: "#ef4444",
            fontFamily:
              '"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',
          }}
        >
          {dialogMessage}
        </Typography>
      ) : (
        <Stack spacing={2.5} alignItems="center">
          {/* ICON */}
          <Box
            sx={{
              width: 85,
              height: 85,
              borderRadius: "50%",
              background: choXemDiem ? "#4caf50" : "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 36,
            }}
          >
            {choXemDiem ? "🏆" : "✓"}
          </Box>

          {/* NAME (FIX FONT VIỆT NAM) */}
          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
              textTransform: "none",

              fontFamily:
                '"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',

              fontFeatureSettings: '"kern" 1, "liga" 1',
              textRendering: "optimizeLegibility",
            }}
          >
            {(studentResult?.hoVaTen || "Học sinh")
              .trim()
              .normalize("NFC")
              .toLocaleUpperCase("vi-VN")}
          </Typography>

          {/* CLASS */}
          <Typography
            sx={{
              fontSize: 15,
              color: "#1565c0",
              fontWeight: 600,
            }}
          >
            Lớp: {studentResult?.lop}
          </Typography>

          {/* STATUS */}
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: choXemDiem ? "#16a34a" : "#dc2626",
            }}
          >
            Đã hoàn thành bài kiểm tra
          </Typography>

          {/* SCORE */}
          {choXemDiem ? (
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
              <Typography sx={{ fontSize: 13, color: "#64748b" }}>
                Điểm của bạn
              </Typography>

              <Typography
                sx={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: "#1976d2",
                }}
              >
                {configData?.kiemTraDinhKi === true
                  ? studentResult?.diem
                  : configData?.baiTapTuan === true
                  ? convertPercentToScore(studentResult?.diemTN)
                  : configData?.onTap === true
                  ? studentResult?.diem
                  : ""}
              </Typography>
            </Box>
          ) : (
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 700,
                color: "#ef4444",
              }}
            >
              ĐÃ HOÀN THÀNH BÀI KIỂM TRA
            </Typography>
          )}
        </Stack>
      )}
    </DialogContent>
  </Dialog>
);
};

export default ResultDialog;