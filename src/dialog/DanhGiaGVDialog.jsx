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
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

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
      PaperComponent={PaperComponent}
      PaperProps={{
        sx: {
          borderRadius: "18px",
          overflow: "hidden",
          background: "#f8fafc",
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 3,
          py: 1.6,
          background: "linear-gradient(135deg,#42a5f5,#1976d2)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* NAME ONLY ICON */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccountCircleIcon sx={{ fontSize: 20 }} />

          <Typography sx={{ fontSize: 15.5, fontWeight: 600 }}>
            {studentForDanhGia.hoVaTen?.toUpperCase()}
          </Typography>
        </Box>

        {/* CLOSE */}
        <IconButton
          onClick={() => setStudentForDanhGia(null)}
          sx={{
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
      <DialogContent sx={{ px: 3, py: 3 }}>
        <Stack spacing={1.8}>
          {options.map((opt) => {
            const isSelected = currentStatus === opt.label;

            return (
              <Box
                key={opt.label}
                onClick={() =>
                  handleStatusChange(
                    studentForDanhGia.maDinhDanh,
                    opt.label
                  )
                }
                sx={{
                  cursor: "pointer",
                  p: 2,
                  borderRadius: "14px",
                  border: `1px solid ${
                    isSelected ? opt.color : "#e2e8f0"
                  }`,
                  background: "#fff",
                  boxShadow: isSelected
                    ? `0 8px 20px ${opt.color}22`
                    : "0 2px 8px rgba(0,0,0,0.04)",
                  transform: isSelected ? "scale(1.02)" : "scale(1)",
                  transition: "all 0.2s ease",
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ fontSize: 26 }}>{opt.emoji}</Box>

                  <Box>
                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: isSelected ? 700 : 400,
                        color: opt.color,
                      }}
                    >
                      {isSelected ? "✓ " + opt.label : opt.label}
                    </Typography>

                    <Typography sx={{ fontSize: 12, color: "#64748b" }}>
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