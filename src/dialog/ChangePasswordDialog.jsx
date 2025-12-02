// src/dialog/ChangePasswordDialog.jsx
import React from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
  Stack,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ChangePasswordDialog = ({
  open,
  onClose,
  newPw,
  setNewPw,
  confirmPw,
  setConfirmPw,
  pwError,
  handleChangePassword,
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
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#fff",
          boxShadow: 6,
        },
      }}
    >
      {/* Thanh tiêu đề */}
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

      {/* Nội dung */}
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
  );
};

export default ChangePasswordDialog;