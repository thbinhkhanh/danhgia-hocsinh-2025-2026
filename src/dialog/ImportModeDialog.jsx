// src/dialog/ImportModeDialog.jsx
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

const ImportModeDialog = ({
  open,
  onClose,
  onOverwrite, // ghi đè
  onAppend,    // ghi tiếp
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 450,
          borderRadius: 2,
          p: 3,
          bgcolor: "#fff",
          boxShadow: "0px 8px 24px rgba(0,0,0,0.12)",
        },
      }}
    >
      {/* HEADER */}
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
          📥
        </Box>

        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0" }}>
          Nhập đề kiểm tra
        </DialogTitle>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ pt: 0 }}>
        <Typography sx={{ fontSize: 16, color: "#0d47a1" }}>
            Bạn đang nhập đề mới. Hãy chọn cách xử lý:
        </Typography>

        <Typography sx={{ fontSize: 14, color: "gray", mt: 1 }}>
            • <b>Ghi đè</b>: Xóa toàn bộ câu hỏi hiện tại và thay bằng đề mới<br/>
            • <b>Ghi tiếp</b>: Giữ nguyên đề hiện tại và thêm câu hỏi mới vào cuối
        </Typography>
      </DialogContent>

      {/* ACTIONS */}
      <DialogActions sx={{ justifyContent: "center", pt: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Hủy
        </Button>

        <Button
          variant="contained"
          color="warning"
          onClick={onAppend}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Ghi tiếp
        </Button>

        <Button
          variant="contained"
          color="error"
          onClick={onOverwrite}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Ghi đè
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportModeDialog;