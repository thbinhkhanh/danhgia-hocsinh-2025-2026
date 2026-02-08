// src/dialog/SubmitWarningDialog.jsx
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

const SubmitWarningDialog = ({ open, onClose, unansweredQuestions }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 3,                 // ✅ giống mẫu
          bgcolor: "#e3f2fd",
        },
      }}
    >
      {/* ===== HEADER (GIỐNG MẪU) ===== */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: "#ffc107",
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
          ⚠️
        </Box>

        <DialogTitle
          sx={{
            p: 0,
            fontWeight: "bold",
            color: "#ff6f00",
          }}
        >
          Chưa hoàn thành
        </DialogTitle>
      </Box>

      {/* ===== CONTENT ===== */}
      <DialogContent sx={{ p: 0 }}>
        <Typography sx={{ fontSize: 16, color: "#6b4c00" }}>
          Bạn chưa chọn đáp án cho câu:{" "}
          <strong>{unansweredQuestions.join(", ")}</strong>.
          <br />
          Vui lòng trả lời tất cả câu hỏi trước khi nộp.
        </Typography>
      </DialogContent>

      {/* ===== ACTION ===== */}
      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        <Button
          variant="contained"
          color="warning"
          onClick={onClose}
          sx={{ borderRadius: 2, px: 4 }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubmitWarningDialog;
