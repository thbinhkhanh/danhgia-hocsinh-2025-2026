// src/dialog/TracNghiemScoreDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const TracNghiemScoreDialog = ({
  studentForTracNghiem,
  setStudentForTracNghiem,
  studentScores,
  config,
  convertPercentToScore,
  deleteStudentScore,
}) => {
  return (
    <Dialog
      open={!!studentForTracNghiem}
      onClose={() => setStudentForTracNghiem(null)}
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
          📝
        </Box>
        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0" }}>
          Thông báo
        </DialogTitle>
        <IconButton
          onClick={() => setStudentForTracNghiem(null)}
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
        <Typography
          sx={{ fontSize: 18, fontWeight: "bold", color: "#0d47a1", mb: 1 }}
        >
          {studentForTracNghiem?.hoVaTen?.toUpperCase() || "HỌC SINH"}
        </Typography>

        {(() => {
          const score =
            studentScores[studentForTracNghiem?.maDinhDanh] || {};

          if (config?.baiTapTuan) {
            return (
              <>
                <Typography
                  sx={{ fontSize: 16, color: "#0d47a1", mt: 2, mb: 0.5 }}
                >
                  <strong>Điểm trắc nghiệm:</strong>{" "}
                  {score.diemTN != null
                    ? `${convertPercentToScore(score.diemTN)} điểm`
                    : "Chưa có"}
                </Typography>
                <Typography sx={{ fontSize: 16, color: "#1565c0", mt: 2 }}>
                  <strong>Mức đạt:</strong>{" "}
                  {score.diemTracNghiem || "Chưa có"}
                </Typography>
              </>
            );
          }

          if (config?.kiemTraDinhKi) {
            return (
              <Typography
                sx={{ fontSize: 16, color: "#0d47a1", mt: 2, mb: 0.5 }}
              >
                <strong>Điểm lý thuyết:</strong>{" "}
                {score.lyThuyet != null
                  ? `${score.lyThuyet} điểm`
                  : "Chưa có"}
              </Typography>
            );
          }

          return null;
        })()}
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            deleteStudentScore(
              studentForTracNghiem.maDinhDanh,
              studentForTracNghiem.hoVaTen
            );
            setStudentForTracNghiem(null);
          }}
          sx={{
            borderRadius: 2,
            px: 4,
            bgcolor: "#f44336",
            color: "#fff",
            "&:hover": { bgcolor: "#d32f2f" },
          }}
        >
          XÓA KẾT QUẢ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TracNghiemScoreDialog;