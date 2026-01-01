// src/dialog/CreateDataConfirmDialog.jsx
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

const CreateDataConfirmDialog = ({ open, onClose, onConfirm }) => {
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
          bgcolor: "#e3f2fd", // nền xanh nhạt
          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.15)",
        },
      }}
    >
      {/* Header với icon và tiêu đề */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: "#f44336", // đỏ để cảnh báo
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
        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#d32f2f" }}>
          Tạo DATA mới
        </DialogTitle>
      </Box>

      {/* Nội dung */}
      <DialogContent>
        <Typography sx={{ fontSize: 16, color: "#0d47a1" }}>
          Bạn chắc chắn muốn xóa toàn bộ dữ liệu cũ và tạo dữ liệu mới?<br />
          Hành động này <strong>không thể hoàn tác</strong>.
        </Typography>
      </DialogContent>

      {/* Action buttons */}
      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ borderRadius: 1, px: 3 }}
        >
          Hủy
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          sx={{ borderRadius: 1, px: 3 }}
        >
          Xác nhận
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDataConfirmDialog;
