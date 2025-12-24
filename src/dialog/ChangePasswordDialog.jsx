import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
  Stack,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const ChangePasswordDialog = ({ open, onClose }) => {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");

  // State cho Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleChangePassword = () => {
    if (!newPw || !confirmPw) {
      setPwError("⚠️ Vui lòng nhập đủ thông tin!");
      return;
    }

    if (newPw !== confirmPw) {
      setPwError("⚠️ Mật khẩu không khớp!");
      return;
    }

    // Đóng dialog và hiển thị snackbar ngay lập tức
    onClose();
    setPwError("");
    setNewPw("");
    setConfirmPw("");
    setSnackbar({
      open: true,
      message: "✅ Mật khẩu đã được cập nhật!",
      severity: "success",
    });

    // Ghi Firestore ở nền (không chặn UI)
    setDoc(
      doc(db, "MATKHAU", "ADMIN"),
      { pass: newPw },
      { merge: true }
    ).catch((err) => {
      console.error("❌ Lỗi lưu mật khẩu:", err);
      // Nếu lỗi, có thể hiển thị snackbar lỗi
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi lưu mật khẩu. Vui lòng thử lại.",
        severity: "error",
      });
    });
  };

  return (
    <>
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
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#fff",
            boxShadow: 6,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "#1976d2",
            color: "#fff",
            px: 2,
            py: 1.2,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: "bold", fontSize: "1.1rem", letterSpacing: 0.5 }}
          >
            ĐỔI MẬT KHẨU
          </Typography>
          <IconButton onClick={onClose} sx={{ color: "#fff", p: 0.6 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ mt: 1, bgcolor: "#fff" }}>
          <Stack spacing={2} sx={{ pl: 2.5, pr: 2.5 }}>
            <TextField
              label="Mật khẩu mới"
              type="password"
              fullWidth
              size="small"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <TextField
              label="Nhập lại mật khẩu"
              type="password"
              fullWidth
              size="small"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />

            {pwError && (
              <Typography color="error" sx={{ fontWeight: 600 }}>
                {pwError}
              </Typography>
            )}

            <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
              <Button onClick={onClose}>Hủy</Button>
              <Button variant="contained" onClick={handleChangePassword}>
                Lưu
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ChangePasswordDialog;