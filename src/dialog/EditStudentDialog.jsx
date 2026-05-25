import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  IconButton,
  Typography,
  Stack,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

export default function EditStudentDialog({
  open,
  onClose,
  student,
  newName,
  setNewName,
  newMaDinhDanh,
  setNewMaDinhDanh,
  isAdding,
  onSave,
  isConfirm = false,
  onConfirm,
}) {
  const title = isConfirm
    ? "Xóa học sinh"
    : isAdding
    ? "Thêm học sinh"
    : "Chỉnh sửa học sinh";

  const Icon = isConfirm
    ? WarningAmberIcon
    : isAdding
    ? PersonAddIcon
    : EditIcon;

  const color = isConfirm ? "#ef4444" : "#1976d2";

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
        },
      }}
    >
      {/* ===== HEADER ===== */}
      <Box
        sx={{
          px: 3,
          py: 1.6,
          background: `linear-gradient(135deg, ${color}, #42a5f5)`,
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* LEFT */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon fontSize="small" />
          </Box>

          <Typography sx={{ fontSize: 15.5, fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>

        {/* CLOSE */}
        <IconButton
          onClick={onClose}
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

      {/* ===== CONTENT ===== */}
      <DialogContent sx={{ px: 3, py: 3 }}>
        {isConfirm ? (
          <Box
            sx={{
              textAlign: "center",
              py: 1,
            }}
          >
            <Typography sx={{ fontSize: 14, color: "#334155" }}>
              Bạn có chắc chắn muốn xóa học sinh
            </Typography>

            <Typography
              sx={{
                mt: 1,
                fontSize: 16,
                fontWeight: 600,
                color: "#ef4444",
              }}
            >
              {student?.hoVaTen}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {/* Mã định danh */}
            <TextField
              label="Mã định danh"
              value={isAdding ? newMaDinhDanh : student?.maDinhDanh || ""}
              onChange={(e) => setNewMaDinhDanh?.(e.target.value)}
              InputProps={{ readOnly: !isAdding }}
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  background: "#fff",
                },
              }}
            />

            {/* Họ tên */}
            <TextField
              label="Họ và tên"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  background: "#fff",
                },
              }}
            />
          </Stack>
        )}
      </DialogContent>

      {/* ===== ACTIONS ===== */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: "10px" }}>
          Hủy
        </Button>

        {isConfirm ? (
          <Button
            variant="contained"
            color="error"
            onClick={onConfirm}
            sx={{ borderRadius: "10px" }}
          >
            Xóa
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={onSave}
            disabled={!newName.trim() || (isAdding && !newMaDinhDanh?.trim())}
            sx={{
              borderRadius: "10px",
              background: "linear-gradient(135deg,#1976d2,#42a5f5)",
            }}
          >
            {isAdding ? "Thêm" : "Lưu"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}