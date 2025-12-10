// src/dialog/ResultDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ResultDialog = ({
  open,
  onClose,
  dialogMode,
  dialogMessage,
  studentResult,
  choXemDiem,
  configData,
  convertPercentToScore,
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
          📊
        </Box>
        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0" }}>
          KẾT QUẢ
        </DialogTitle>
        <IconButton
          onClick={onClose}
          sx={{
            ml: "auto",
            color: "#f44336",
            "&:hover": { bgcolor: "rgba(244,67,54,0.1)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Nội dung */}
      <DialogContent sx={{ textAlign: "center" }}>
        {dialogMode === "notFound" ? (
          <Typography
            sx={{
              fontSize: "1.15rem",
              fontWeight: 700,
              color: "red",
              textAlign: "center",
            }}
          >
            {dialogMessage}
          </Typography>
        ) : (
          <>
            <Typography
              sx={{ fontSize: 18, fontWeight: "bold", color: "#0d47a1", mb: 1 }}
            >
              {studentResult?.hoVaTen?.toUpperCase() || "HỌC SINH"}
            </Typography>

            <Typography sx={{ fontSize: 16, color: "#1565c0", mb: 1 }}>
              Lớp: <span style={{ fontWeight: 600 }}>{studentResult?.lop}</span>
            </Typography>

            {choXemDiem ? (
              <Typography sx={{ fontSize: 16, color: "#0d47a1", mt: 2 }}>
                Điểm:&nbsp;
                <span style={{ fontWeight: 700, color: "red" }}>
                  {configData?.kiemTraDinhKi === true
                    ? studentResult?.diem
                    : configData?.baiTapTuan === true
                    ? convertPercentToScore(studentResult?.diemTN)
                    : configData?.onTap === true
                    ? studentResult?.diem // 👉 nhánh Ôn tập
                    : ""}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ResultDialog;