import React from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const StudentStatusDialog = ({
  expandedStudent,
  setExpandedStudent,
  studentStatus,
  handleStatusChange,
  saving,
  PaperComponent,
}) => {
  if (!expandedStudent) return null;

  const fromExpanded = expandedStudent.status ?? "";
  const fromMap = studentStatus?.[expandedStudent.maDinhDanh] ?? "";
  const currentStatus = fromExpanded || fromMap;

  const statusConfig = {
    "Hoàn thành tốt": {
      color: "#1976d2",
      bg: "#e3f2fd",
    },
    "Hoàn thành": {
      color: "#9c27b0",
      bg: "#f3e5f5",
    },
    "Chưa hoàn thành": {
      color: "#ed6c02",
      bg: "#fff3e0",
    },
  };

  return (
    <Dialog
      open={Boolean(expandedStudent)}
      onClose={(event, reason) => {
        if (reason !== "backdropClick") {
          setExpandedStudent(null);
        }
      }}
      maxWidth="xs"
      fullWidth
      PaperComponent={PaperComponent}
      PaperProps={{
        sx: {
          borderRadius: "18px",
          overflow: "hidden",
          background: "#f8fafc",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          fontFamily: '"Segoe UI","Arial","Helvetica","sans-serif"',
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 3,
          py: 1.6,
          background: "linear-gradient(135deg,#1976d2,#42a5f5)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
          {expandedStudent.hoVaTen?.normalize("NFC")}
        </Typography>

        <IconButton
          onClick={() => setExpandedStudent(null)}
          disabled={saving}
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
        <Stack spacing={1.5}>
          {Object.keys(statusConfig).map((s) => {
            const isSelected = currentStatus === s;
            const cfg = statusConfig[s];

            return (
              <Button
                key={s}
                disabled={saving}
                onClick={() =>
                  handleStatusChange(
                    expandedStudent.maDinhDanh,
                    expandedStudent.hoVaTen,
                    s
                  )
                }
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  px: 2,
                  py: 1.3,
                  borderRadius: "12px",
                  fontSize: 14,

                  border: `1px solid ${
                    isSelected ? cfg.color : "#e2e8f0"
                  }`,

                  background: isSelected ? cfg.bg : "#ffffff",
                  color: cfg.color,

                  boxShadow: isSelected
                    ? `0 4px 14px ${cfg.color}33`
                    : "none",

                  transition: "all 0.2s ease",

                  "&:hover": {
                    background: cfg.bg,
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: cfg.color,
                    mr: 1.2,
                  }}
                />

                {isSelected ? "✓ " + s : s}
              </Button>
            );
          })}

          {/* HỦY */}
          {currentStatus && (
            <Box sx={{ pt: 2, display: "flex", justifyContent: "center" }}>
              <Button
                onClick={() => {
                  handleStatusChange(
                    expandedStudent.maDinhDanh,
                    expandedStudent.hoVaTen,
                    ""
                  );
                  setExpandedStudent(null);
                }}
                disabled={saving}
                sx={{
                  textTransform: "none",
                  borderRadius: "12px",
                  px: 3,
                  py: 1,
                  fontSize: 13,
                  fontWeight: 500,
                  background: "#ef4444",
                  color: "#fff",
                  "&:hover": {
                    background: "#dc2626",
                  },
                }}
              >
                Hủy đánh giá
              </Button>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default StudentStatusDialog;