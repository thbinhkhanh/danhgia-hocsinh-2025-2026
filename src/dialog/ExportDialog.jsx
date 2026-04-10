// src/dialog/ExportDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
} from "@mui/material";

const ExportDialog = ({ open, onClose, fileName, setFileName, onConfirm }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 450,               // chiều rộng cố định
          borderRadius: 2,          // bo góc nhẹ
          p: 3,
          bgcolor: "#fff",          // nền dialog trắng
          boxShadow: "0px 8px 24px rgba(0,0,0,0.12)", // shadow hiện đại
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: "#1976d2",
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
        <DialogTitle sx={{ p: 0, fontWeight: 600, color: "text.primary" }}>
          Xuất đề kiểm tra
        </DialogTitle>
      </Box>

      <DialogContent sx={{ pt: 0 }}>
        <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 2 }}>
          {/*Nhập tên file để lưu*/}
        </Typography>

        <TextField
          fullWidth
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          label="Tên file"
          placeholder={
            fileName?.trim()
              ? ""
              : "Ví dụ: Đề kiểm tra lớp 5..."
          }
          autoFocus
          variant="outlined"

          // ✅ FIX CHÍNH
          InputLabelProps={{
            shrink: true,
          }}

          sx={{
            bgcolor: "#fff",
            borderRadius: 1,

            // 👇 QUAN TRỌNG: giúp label không bị cắt bởi fieldset
            "& .MuiOutlinedInput-notchedOutline": {
              transition: "all 0.2s ease",
            },

            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "#ccc",
              },
              "&:hover fieldset": {
                borderColor: "#1976d2",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#1976d2",
                boxShadow: "0 0 0 2px rgba(25,118,210,0.2)",
              },
            },
          }}
        />
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
          onClick={onConfirm}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Xuất file
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;