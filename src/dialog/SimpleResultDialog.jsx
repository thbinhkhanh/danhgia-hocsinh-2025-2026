import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";

const SimpleResultDialog = ({
  open,
  onClose,
  studentResult,
  choXemDiem,
}) => {
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
          borderRadius: 3,
          p: 3,                // ✅ GIỐNG MẪU
          bgcolor: "#e3f2fd",
          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.15)",
        },
      }}
    >
      {/* ===== HEADER ===== */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: "#42a5f5",
            color: "#fff",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1.5,
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          🎉
        </Box>

        <DialogTitle
          sx={{
            p: 0,
            fontWeight: "bold",
            color: "#1565c0",   // ✅ GIỐNG MẪU
          }}
        >
          KẾT QUẢ
        </DialogTitle>
      </Box>

      {/* ===== CONTENT ===== */}
      <DialogContent sx={{ textAlign: "center" }}>
        <Typography
          sx={{ fontSize: 18, fontWeight: "bold", color: "#0d47a1", mb: 1 }}
        >
          {studentResult?.hoVaTen?.toUpperCase()}
        </Typography>

        <Typography sx={{ fontSize: 16, color: "#1565c0", mb: 1 }}>
          Lớp: <span style={{ fontWeight: 600 }}>{studentResult?.lop}</span>
        </Typography>

        {choXemDiem ? (
          <Typography sx={{ fontSize: 16, mt: 2 }}>
            <span style={{ color: "#0d47a1" }}>Điểm:&nbsp;</span>
            <span style={{ fontWeight: 700, color: "red" }}>
              {studentResult?.diem}
            </span>
          </Typography>
        ) : (
          <Typography
            sx={{
              fontSize: 16,
              mt: 2,
              textAlign: "center",
              fontWeight: 700,
              color: "red",
            }}
          >
            ĐÃ HOÀN THÀNH BÀI KIỂM TRA
          </Typography>
        )}
      </DialogContent>

      {/* ===== ACTION ===== */}
      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            px: 4,
            borderRadius: 2,
            bgcolor: "#42a5f5",
            fontWeight: "bold",
            "&:hover": { bgcolor: "#1e88e5" },
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SimpleResultDialog;
