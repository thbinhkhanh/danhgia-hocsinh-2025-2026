// src/dialog/StudentStatusDialog.jsx
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

const StudentStatusDialog = ({
  expandedStudent,
  setExpandedStudent,
  studentStatus,
  handleStatusChange,
  saving,
  PaperComponent,
}) => {
  return (
    <Dialog
      open={Boolean(expandedStudent)}
      onClose={(event, reason) => {
        if (reason !== "backdropClick") {
          setExpandedStudent(null);
        }
      }}
      maxWidth="xs"
      fullWidth
      PaperComponent={PaperComponent}
    >
      {expandedStudent && (
        <>
          <DialogTitle
            id="draggable-dialog-title"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "#64b5f6",
              flexWrap: "wrap",
              py: 1.5,
              cursor: "move", // 🟢 thêm để dễ thấy có thể kéo
            }}
          >
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                sx={{ color: "#ffffff", fontSize: "1.05rem" }}
              >
                {expandedStudent.hoVaTen.toUpperCase()}
              </Typography>
            </Box>

            <IconButton
              onClick={() => setExpandedStudent(null)}
              disabled={saving} // 🔒 khóa khi đang lưu
              sx={{
                color: saving ? "#ccc" : "#f44336",
                "&:hover": saving ? {} : { bgcolor: "rgba(244,67,54,0.1)" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ mt: 2 }}>
            <Stack spacing={1}>
              {["Hoàn thành tốt", "Hoàn thành", "Chưa hoàn thành"].map((s) => {
                const isSelected =
                  studentStatus[expandedStudent.maDinhDanh] === s;
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
                        expandedStudent.maDinhDanh,
                        expandedStudent.hoVaTen,
                        s
                      )
                    }
                  >
                    {isSelected ? `✓ ${s}` : s}
                  </Button>
                );
              })}

              {/* 🔹 Nút hủy đánh giá */}
              {studentStatus[expandedStudent.maDinhDanh] && (
                <Box sx={{ mt: 5, textAlign: "center" }}>
                  <Button
                    onClick={() => {
                      handleStatusChange(
                        expandedStudent.maDinhDanh,
                        expandedStudent.hoVaTen,
                        ""
                      );
                      setExpandedStudent(null); // 🔹 Đóng dialog sau khi hủy
                    }}
                    sx={{
                      width: 160,
                      px: 2,
                      bgcolor: "#4caf50",
                      color: "#ffffff",
                      borderRadius: 1,
                      textTransform: "none",
                      fontWeight: "bold",
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

export default StudentStatusDialog;