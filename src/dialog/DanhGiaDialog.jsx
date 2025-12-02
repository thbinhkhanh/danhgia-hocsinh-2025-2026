// src/dialog/DanhGiaDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const DanhGiaDialog = ({
  studentForDanhGia,
  setStudentForDanhGia,
  studentStatus,
  handleStatusChange,
  PaperComponent,
}) => {
  return (
    <Dialog
      open={Boolean(studentForDanhGia)}
      onClose={() => setStudentForDanhGia(null)}
      maxWidth="xs"
      fullWidth
      PaperComponent={PaperComponent}
    >
      {studentForDanhGia && (
        <>
          {/* Header */}
          <DialogTitle
            id="draggable-dialog-title"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "#64b5f6",
              py: 1.5,
              cursor: "move",
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{ color: "#ffffff" }}
            >
              {(studentForDanhGia.hoVaTen || "HỌC SINH").toUpperCase()}
            </Typography>
            <IconButton
              onClick={() => setStudentForDanhGia(null)}
              sx={{
                color: "#f44336",
                "&:hover": { bgcolor: "rgba(244,67,54,0.1)" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          {/* Nội dung */}
          <DialogContent>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {["Hoàn thành tốt", "Hoàn thành", "Chưa hoàn thành"].map((s) => {
                const isSelected =
                  studentStatus[studentForDanhGia.maDinhDanh] === s;
                return (
                  <Button
                    key={s}
                    variant={isSelected ? "contained" : "outlined"}
                    color={
                      s === "Hoàn thành tốt"
                        ? "primary"
                        : s === "Hoàn thành"
                        ? "secondary"
                        : "warning"
                    }
                    onClick={() =>
                      handleStatusChange(
                        studentForDanhGia.maDinhDanh,
                        studentForDanhGia.hoVaTen,
                        s
                      )
                    }
                  >
                    {isSelected ? `✓ ${s}` : s}
                  </Button>
                );
              })}

              {/* Hiển thị trạng thái hiện tại */}
              {studentStatus[studentForDanhGia.maDinhDanh] && (
                <Box sx={{ textAlign: "center", mt: 2 }}>
                  <Button
                    onClick={() => {
                      handleStatusChange(
                        studentForDanhGia.maDinhDanh,
                        studentForDanhGia.hoVaTen,
                        ""
                      );
                      setStudentForDanhGia(null);
                    }}
                    sx={{
                      bgcolor: "#4caf50",
                      color: "#fff",
                      "&:hover": { bgcolor: "#388e3c" },
                      mt: 1,
                    }}
                  >
                    HỦY ĐÁNH GIÁ
                  </Button>
                </Box>
              )}
            </Stack>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

export default DanhGiaDialog;