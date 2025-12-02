// src/dialog/ExitConfirmDialog.jsx
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
import { useNavigate } from "react-router-dom";

const ExitConfirmDialog = ({ open, onClose }) => {
  const navigate = useNavigate();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 3,
          bgcolor: "#e3f2fd",
          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.15)",
        },
      }}
    >
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
          ℹ️
        </Box>
        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0" }}>
          Thông báo
        </DialogTitle>
      </Box>

      <DialogContent>
        <Typography sx={{ fontSize: 16, color: "#0d47a1" }}>
          Bạn có chắc chắn muốn thoát khỏi bài trắc nghiệm?<br />
          Mọi tiến trình chưa nộp sẽ bị mất.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Hủy
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => navigate(-1)}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Thoát
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExitConfirmDialog;