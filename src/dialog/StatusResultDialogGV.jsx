import React from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const StatusResultDialogGV = ({
  studentForTracNghiem,
  setStudentForTracNghiem,
  studentScores,
  config,
  convertPercentToScore,
  deleteStudentScore,
}) => {
  if (!studentForTracNghiem) return null;

  const score = studentScores?.[studentForTracNghiem?.maDinhDanh] || {};

  const studentName = (studentForTracNghiem?.hoVaTen || "Học sinh")
    .trim()
    .normalize("NFC");

  const getScore = () => {
    if (config?.baiTapTuan) {
      return score.TN_diem != null
        ? convertPercentToScore(score.TN_diem)
        : null;
    }

    if (config?.kiemTraDinhKi) {
      return score.lyThuyet ?? null;
    }

    return null;
  };

  const finalScore = getScore();

  const showDeleteButton =
    (config?.baiTapTuan && score.TN_diem != null) ||
    (config?.kiemTraDinhKi && score.lyThuyet != null);

  return (
    <Dialog
      open={!!studentForTracNghiem}
      onClose={() => setStudentForTracNghiem(null)}
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
        <Stack direction="row" spacing={1} alignItems="center">
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
          onClick={() => setStudentForTracNghiem(null)}
          sx={{
            position: "absolute",
            right: 10,
            top: 10,
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.15)",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.25)",
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ px: 3, py: 4 }}>
        <Stack spacing={2.5} alignItems="center" textAlign="center">
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
            🏆
          </Box>

          {/* NAME */}
          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
              fontFamily:
                '"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',
            }}
          >
            {studentName}
          </Typography>

          {/* STATUS */}
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 600,
              color: "#16a34a",
            }}
          >
            Đã hoàn thành bài kiểm tra
          </Typography>

          {/* SCORE */}
          {finalScore !== null && finalScore !== undefined && (
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
                Điểm bài làm
              </Typography>

              <Typography
                sx={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: "#1976d2",
                }}
              >
                {finalScore}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      {/* ACTION - GIỮ NGUYÊN NÚT XÓA */}
      {showDeleteButton && (
        <Box sx={{ pb: 3, display: "flex", justifyContent: "center" }}>
          <Box
            onClick={() => {
              deleteStudentScore(
                studentForTracNghiem.maDinhDanh,
                studentForTracNghiem.hoVaTen
              );
              setStudentForTracNghiem(null);
            }}
            sx={{
              px: 3,
              py: 1,
              borderRadius: "12px",
              background: "#ef4444",
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
              "&:hover": { opacity: 0.9 },
            }}
          >
            XÓA KẾT QUẢ
          </Box>
        </Box>
      )}
    </Dialog>
  );
};

export default StatusResultDialogGV;