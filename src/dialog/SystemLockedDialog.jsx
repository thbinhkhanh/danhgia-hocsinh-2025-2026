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

const SystemLockedDialog = ({ open, onClose }) => {
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
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: "#ef5350",
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
          🔒
        </Box>
        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#c62828" }}>
          Thông báo
        </DialogTitle>
      </Box>

      {/* Nội dung */}
      <DialogContent sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            fontSize: 18,
            fontWeight: "bold",
            color: "#b71c1c",
            mb: 1,
          }}
        >
          HỆ THỐNG ĐÃ BỊ KHÓA
        </Typography>

        <Typography sx={{ fontSize: 16, color: "#37474f", mt: 2 }}>
          Hiện tại hệ thống đang được khóa.
        </Typography>

        <Typography
          sx={{
            fontSize: 15,
            color: "#546e7a",
            mt: 1,
          }}
        >
          Vui lòng chờ giáo viên mở khóa để tiếp tục sử dụng.
        </Typography>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            borderRadius: 2,
            px: 4,
            bgcolor: "#ef5350",
            color: "#fff",
            "&:hover": { bgcolor: "#e53935" },
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SystemLockedDialog;
