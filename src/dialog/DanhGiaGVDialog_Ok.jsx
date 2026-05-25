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

const DanhGiaGVDialog = ({
  studentForDanhGia,
  setStudentForDanhGia,
  studentStatus,
  handleStatusChange,
  PaperComponent,
}) => {
  if (!studentForDanhGia) return null;

  const currentStatus =
    studentStatus?.[studentForDanhGia.maDinhDanh] ?? "";

  const options = [
    {
      label: "Hoàn thành tốt",
      emoji: "🌟",
      color: "#1976d2",
      desc: "Hoàn thành xuất sắc nhiệm vụ",
    },
    {
      label: "Hoàn thành",
      emoji: "👍",
      color: "#9c27b0",
      desc: "Đạt yêu cầu bài học",
    },
    {
      label: "Chưa hoàn thành",
      emoji: "⚠️",
      color: "#ed6c02",
      desc: "Cần cải thiện thêm",
    },
  ];

  return (
  <Dialog
    open={Boolean(studentForDanhGia)}
    onClose={() => setStudentForDanhGia(null)}
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
        background: "linear-gradient(135deg,#1976d2,#42a5f5)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography
        sx={{
          fontSize: 16,
          fontWeight: 700,
          fontFamily:
            '"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',
        }}
      >
        {(studentForDanhGia?.hoVaTen || "").trim().normalize("NFC").toUpperCase()}
      </Typography>

      <IconButton
        onClick={() => setStudentForDanhGia(null)}
        sx={{
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
        py: 3,
      }}
    >
      <Stack spacing={1.8}>
        {options.map((opt) => {
          const isSelected = currentStatus === opt.label;

          return (
            <Box
              key={opt.label}
              onClick={() =>
                handleStatusChange(studentForDanhGia.maDinhDanh, opt.label)
              }
              sx={{
                cursor: "pointer",
                p: 2,
                borderRadius: "14px",

                border: isSelected
                  ? `2px solid ${opt.color}`
                  : "1px solid #e2e8f0",

                background: "#fff",

                boxShadow: isSelected
                  ? `0 10px 25px ${opt.color}33`
                  : "0 2px 8px rgba(0,0,0,0.04)",

                transform: isSelected ? "scale(1.02)" : "scale(1)",
                transition: "all 0.2s ease",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ fontSize: 28 }}>{opt.emoji}</Box>

                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 15,
                      fontWeight: isSelected ? 700 : 500,
                      color: opt.color,

                      fontFamily:
                        '"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',
                    }}
                  >
                    {isSelected ? "✓ " + opt.label : opt.label}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#64748b",
                      mt: 0.2,
                      fontFamily:
                        '"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',
                    }}
                  >
                    {opt.desc}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          );
        })}

        {/* HỦY ĐÁNH GIÁ */}
        {currentStatus && (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
            <Box
              onClick={() => {
                handleStatusChange(studentForDanhGia.maDinhDanh, "");
                setStudentForDanhGia(null);
              }}
              sx={{
                px: 3,
                py: 1,
                borderRadius: "12px",
                background: "#ef4444",
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
                "&:hover": { opacity: 0.9 },
              }}
            >
              Hủy đánh giá
            </Box>
          </Box>
        )}
      </Stack>
    </DialogContent>
  </Dialog>
);
};

export default DanhGiaGVDialog;