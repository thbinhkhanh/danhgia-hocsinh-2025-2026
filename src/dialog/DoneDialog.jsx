// src/dialog/DoneDialog.jsx
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

const DoneDialog = ({
  open,
  onClose,
  doneStudent,
  config,
  choXemDiem,
  convertPercentToScore,
}) => {
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
          bgcolor: "#e3f2fd", // 🌤 cùng màu nền trang chính
          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.15)",
        },
      }}
    >
      {/* Header */}
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

      {/* Nội dung */}
      <DialogContent sx={{ textAlign: "center" }}>
        <Typography
          sx={{ fontSize: 18, fontWeight: "bold", color: "#0d47a1", mb: 1 }}
        >
          {(doneStudent?.hoVaTen || "Học sinh").toUpperCase()}
        </Typography>

        <Typography sx={{ fontSize: 16, color: "#1565c0", mt: 2, mb: 0.5 }}>
          Đã hoàn thành bài kiểm tra.
        </Typography>

        <Typography
          sx={{ fontSize: 16, color: "#0d47a1", fontWeight: 500, mt: 2 }}
        >
          {config?.baiTapTuan ? (
            <>
              Điểm của bạn:{" "}
              <span style={{ color: "red", fontWeight: "bold" }}>
                {convertPercentToScore(doneStudent?.diemTN)}
              </span>
            </>
          ) : config?.kiemTraDinhKi ? (
            choXemDiem ? (
              <>
                Điểm của bạn:{" "}
                <span style={{ color: "red", fontWeight: "bold" }}>
                  {doneStudent?.diemTN ?? "Chưa có điểm"}
                </span>
              </>
            ) : (
              ""
            )
          ) : (
            ""
          )}
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
            bgcolor: "#64b5f6",
            color: "#fff",
            "&:hover": { bgcolor: "#42a5f5" },
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DoneDialog;