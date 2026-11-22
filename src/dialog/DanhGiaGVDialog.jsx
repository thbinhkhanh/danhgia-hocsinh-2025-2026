
import React from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Stack,
  Divider,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";

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
      light: "#eff6ff",
      border: "#bfdbfe",
      desc: "Hoàn thành xuất sắc nhiệm vụ",
    },
    {
      label: "Hoàn thành",
      emoji: "👍",
      color: "#9c27b0",
      light: "#faf5ff",
      border: "#e9d5ff",
      desc: "Đạt yêu cầu bài học",
    },
    {
      label: "Chưa hoàn thành",
      emoji: "⚠️",
      color: "#ed6c02",
      light: "#fff7ed",
      border: "#fed7aa",
      desc: "Cần cải thiện thêm",
    },
  ];

  const closeDialog = () => setStudentForDanhGia(null);

  return (
    <Dialog
      open={Boolean(studentForDanhGia)}
      onClose={closeDialog}
      maxWidth="xs"
      fullWidth
      PaperComponent={PaperComponent}
      PaperProps={{
        sx: {
          borderRadius: "20px",
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.2)",
          fontFamily: '"Segoe UI","Arial",sans-serif',
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 2.5,
          py: 2.3,
          color: "#fff",
          background:
            "linear-gradient(135deg, #123b70 0%, #1976d2 60%, #42a5f5 100%)",
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            width: 130,
            height: 130,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            right: -35,
            top: -65,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: "13px",
                bgcolor: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.2)",
                flexShrink: 0,
              }}
            >
              <AccountCircleIcon sx={{ fontSize: 30 }} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 1,
                  color: "rgba(255,255,255,0.85)",
                  textTransform: "uppercase",
                }}
              >
                Đánh giá học sinh
              </Typography>

              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  mt: 0.4,
                  lineHeight: 1.4,
                }}
              >
                {studentForDanhGia.hoVaTen?.normalize("NFC")}
              </Typography>
            </Box>
          </Stack>

          <IconButton
            onClick={closeDialog}
            size="medium"
            sx={{
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.15)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.28)",
              },
            }}
          >
            <CloseIcon fontSize="medium" />
          </IconButton>
        </Box>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ px: 2.5, py: 2.8 }}>
        <Box sx={{ mb: 2.3 }}>
          <Typography
            sx={{
              fontSize: 17,
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            Chọn mức đánh giá
          </Typography>

          <Typography
            sx={{
              fontSize: 14,
              color: "#64748b",
              mt: 0.5,
              lineHeight: 1.5,
            }}
          >
            Chọn mức phù hợp với kết quả thực hiện nhiệm vụ
          </Typography>
        </Box>

        <Stack spacing={1.5}>
          {options.map((opt) => {
            const isSelected = currentStatus === opt.label;

            return (
              <Box
                key={opt.label}
                role="button"
                aria-pressed={isSelected}
                onClick={() =>
                  handleStatusChange(
                    studentForDanhGia.maDinhDanh,
                    opt.label
                  )
                }
                sx={{
                  cursor: "pointer",
                  p: 1.9,
                  borderRadius: "15px",
                  border: `1.5px solid ${
                    isSelected ? opt.color : "#e2e8f0"
                  }`,
                  bgcolor: isSelected ? opt.light : "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.7,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: opt.color,
                    bgcolor: opt.light,
                    transform: "translateY(-2px)",
                    boxShadow: `0 5px 15px ${opt.color}18`,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    borderRadius: "13px",
                    bgcolor: isSelected ? "#fff" : opt.light,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 27,
                  }}
                >
                  {opt.emoji}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 16,
                      fontWeight: isSelected ? 700 : 600,
                      color: opt.color,
                    }}
                  >
                    {opt.label}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 13,
                      color: "#64748b",
                      mt: 0.5,
                      lineHeight: 1.45,
                    }}
                  >
                    {opt.desc}
                  </Typography>
                </Box>

                {isSelected ? (
                  <CheckCircleRoundedIcon
                    sx={{ color: opt.color, fontSize: 27 }}
                  />
                ) : (
                  <RadioButtonUncheckedRoundedIcon
                    sx={{ color: "#cbd5e1", fontSize: 25 }}
                  />
                )}
              </Box>
            );
          })}
        </Stack>

        {/* HỦY ĐÁNH GIÁ - GIỮ NGUYÊN NÚT GỐC */}
        {currentStatus && (
          <>
            <Divider sx={{ my: 2.3 }} />

            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Box
                onClick={() => {
                  handleStatusChange(
                    studentForDanhGia.maDinhDanh,
                    ""
                  );
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DanhGiaGVDialog;
