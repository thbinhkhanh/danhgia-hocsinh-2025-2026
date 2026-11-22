
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
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

const StudentStatusDialog = ({
  expandedStudent,
  setExpandedStudent,
  studentStatus,
  handleStatusChange,
  saving,
  PaperComponent,
}) => {
  if (!expandedStudent) return null;

  const currentStatus =
    expandedStudent.status ??
    studentStatus?.[expandedStudent.maDinhDanh] ??
    "";

  const options = [
    {
      label: "Hoàn thành tốt",
      emoji: "🌟",
      color: "#1976d2",
      light: "#eff6ff",
      border: "#bfdbfe",
      desc: "Thực hiện tốt và vượt yêu cầu",
    },
    {
      label: "Hoàn thành",
      emoji: "👍",
      color: "#9c27b0",
      light: "#faf5ff",
      border: "#e9d5ff",
      desc: "Đạt đầy đủ yêu cầu cần đạt",
    },
    {
      label: "Chưa hoàn thành",
      emoji: "⚠️",
      color: "#ed6c02",
      light: "#fff7ed",
      border: "#fed7aa",
      desc: "Cần tiếp tục rèn luyện, hỗ trợ",
    },
  ];

  const closeDialog = () => setExpandedStudent(null);

  return (
    <Dialog
      open={Boolean(expandedStudent)}
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
                {expandedStudent.hoVaTen?.normalize("NFC")}
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
            Chọn một mức phù hợp với kết quả học tập của bạn
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
                onClick={() => {
                  if (!saving) {
                    handleStatusChange(
                      expandedStudent.maDinhDanh,
                      expandedStudent.hoVaTen,
                      opt.label
                    );
                  }
                }}
                sx={{
                  cursor: saving ? "not-allowed" : "pointer",
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
                  opacity: saving ? 0.65 : 1,
                  "&:hover": saving
                    ? {}
                    : {
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
                      color: opt.color, // Luôn dùng màu gốc của từng mức
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

        {currentStatus && (
          <>
            <Divider sx={{ my: 2.3 }} />

            <Box
              onClick={() => {
                if (saving) return;

                handleStatusChange(
                  expandedStudent.maDinhDanh,
                  expandedStudent.hoVaTen,
                  ""
                );
                closeDialog();
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                py: 1.4,
                borderRadius: "12px",
                color: "#dc2626",
                bgcolor: "#fef2f2",
                fontSize: 15,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: "#fee2e2",
                },
              }}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 23 }} />
              Hủy đánh giá
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StudentStatusDialog;
