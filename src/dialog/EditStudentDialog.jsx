import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import WarningIcon from "@mui/icons-material/Warning";

export default function EditStudentDialog({
  open,
  onClose,
  student,
  newName,
  setNewName,
  newMaDinhDanh,
  setNewMaDinhDanh,
  isAdding,
  onSave,
  isConfirm = false, // 🔹 nếu true = cảnh báo xóa
  onConfirm, // 🔹 callback khi nhấn Xóa
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth={true}        // vẫn fullWidth để responsive
      maxWidth={false}        // tắt maxWidth mặc định
      PaperProps={{
        sx: {
          width: { xs: "90%", sm: 500 }, // mobile 90% màn hình, desktop 400px
          borderRadius: 3,
          p: 3,
          bgcolor: "#fff",
          boxShadow: "0 4px 12px rgba(33,150,243,0.15)",
        },
      }}
    >
      {/* ===== Header ===== */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: isConfirm ? "#f44336" : isAdding ? "#4caf50" : "#42a5f5",
            color: "#fff",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1.5,
          }}
        >
          {isConfirm ? <WarningIcon /> : isAdding ? <PersonAddIcon /> : <EditIcon />}
        </Box>

        <DialogTitle
          sx={{
            p: 0,
            fontWeight: "bold",
            color: isConfirm ? "#d32f2f" : "#1565c0",
            flex: 1,
          }}
        >
          {isConfirm
            ? "Xác nhận xóa học sinh"
            : isAdding
            ? "Thêm học sinh"
            : "Chỉnh sửa học sinh"}
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

      {/* ===== Content ===== */}
      <DialogContent>
        {isConfirm ? (
          <Typography>
            Bạn có chắc chắn muốn xóa học sinh <b>{student?.hoVaTen}</b>?
          </Typography>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1.5, // khoảng cách gọn hơn
            }}
          >
            {/* Mã định danh */}
            <TextField
              label="Mã định danh"
              value={isAdding ? newMaDinhDanh : student?.maDinhDanh || ""}
              onChange={(e) => setNewMaDinhDanh?.(e.target.value)}
              InputProps={{ readOnly: !isAdding }}
              size="small"
              sx={{
                flex: 1,
                "& .MuiInputBase-root": {
                  minHeight: 40,          // đủ 1 dòng chữ
                  paddingTop: 1,
                  paddingBottom: 1,
                },
                "& .MuiInputBase-input": {
                  padding: "2px 10px",    // padding nội dung bên trong
                },
              }}
            />

            <TextField
              label="Họ và tên"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              size="small"
              sx={{
                flex: 2,
                "& .MuiInputBase-root": {
                  minHeight: 40,
                  paddingTop: 1,
                  paddingBottom: 1,
                },
                "& .MuiInputBase-input": {
                  padding: "2px 10px",
                },
              }}
            />

          </Box>
        )}
      </DialogContent>

      {/* ===== Actions ===== */}
      <DialogActions sx={{ px: 3 }}>
        <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
          <Box sx={{ flex: 1 }} />
          <Box
            sx={{
              flex: 2,
              display: "flex",
              justifyContent: "flex-end",
              gap: 1,
            }}
          >
            <Button onClick={onClose}>Hủy</Button>

            {isConfirm ? (
              <Button
                variant="contained"
                color="error"
                onClick={onConfirm}
              >
                Xóa
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={onSave}
                disabled={!newName.trim() || (isAdding && !newMaDinhDanh?.trim())}
              >
                {isAdding ? "Thêm" : "Lưu"}
              </Button>
            )}
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
