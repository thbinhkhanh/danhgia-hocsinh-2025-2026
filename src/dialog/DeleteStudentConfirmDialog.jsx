import React from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Stack,
  Button,
  IconButton,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

export default function DeleteStudentConfirmDialog({
  open,
  student,
  onClose,
  onConfirm,
}) {
  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        onClose?.();
      }}
      disableEscapeKeyDown
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
          background: "linear-gradient(135deg, #ef4444, #42a5f5)",
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
            <WarningAmberIcon fontSize="small" />
          </Box>

          <Typography sx={{ fontSize: 15.5, fontWeight: 600 }}>
            Xóa kết quả kiểm tra
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
        <Box sx={{ textAlign: "center", py: 1 }}>
          <Typography sx={{ fontSize: 14, color: "#334155" }}>
            Bạn có chắc chắn muốn xóa kết quả kiểm tra của học sinh
          </Typography>

          <Typography
            sx={{
              mt: 1,
              fontSize: 16,
              fontWeight: 700,
              color: "#0f172a",
              textTransform: "uppercase",
            }}
          >
            {student?.hoVaTen || ""}
          </Typography>

          <Typography
            sx={{
              mt: 2,
              fontSize: 14,
              color: "#ef4444",
              lineHeight: 1.6,
            }}
          >
            {/*Thao tác này sẽ xóa kết quả bài kiểm tra của học sinh khỏi danh sách.<br />*/}
            Hành động này không thể hoàn tác.
          </Typography>
        </Box>
      </DialogContent>

      {/* ===== ACTIONS ===== */}
      <Box
        sx={{
          px: 3,
          pb: 3,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Stack direction="row" spacing={2}>
          {/* CANCEL */}
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              minWidth: 110,
              height: 42,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              borderColor: "#cbd5e1",
              color: "#475569",
              background: "#fff",
              "&:hover": {
                borderColor: "#94a3b8",
                background: "#f1f5f9",
              },
            }}
          >
            Hủy
          </Button>

          {/* DELETE */}
          <Button
            onClick={() => onConfirm?.(student)}
            variant="contained"
            sx={{
              minWidth: 130,
              height: 42,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(135deg, #ef4444, #f97316)",
              boxShadow: "0 10px 20px rgba(239,68,68,0.25)",
              "&:hover": {
                background: "linear-gradient(135deg, #dc2626, #ef4444)",
              },
            }}
          >
            Xóa
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}