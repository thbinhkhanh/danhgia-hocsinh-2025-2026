import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
} from "@mui/material";

export default function EditTrueFalseDialog({
  open,
  onClose,
  editTrue,
  setEditTrue,
  editFalse,
  setEditFalse,
  onSave,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      {/* HEADER */}
      <DialogTitle
        sx={{
          fontWeight: 600,
          fontSize: 18,
          pb: 1,
        }}
      >
        Chỉnh sửa nhãn đáp án
      </DialogTitle>

      {/* CONTENT */}
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Nhãn Đúng"
            placeholder="Ví dụ: Đúng / True / ✔"
            value={editTrue}
            onChange={(e) => setEditTrue(e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{
              shrink: true, // 👈 fix lỗi bị khuất label
            }}
          />

          <TextField
            label="Nhãn Sai"
            placeholder="Ví dụ: Sai / False / ✘"
            value={editFalse}
            onChange={(e) => setEditFalse(e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{
              shrink: true, // 👈 fix lỗi bị khuất label
            }}
          />

          <Typography
            variant="caption"
            sx={{ color: "text.secondary", mt: 1 }}
          >
            Gợi ý: bạn có thể dùng chữ, emoji hoặc ký hiệu.
          </Typography>
        </Stack>
      </DialogContent>

      {/* ACTIONS */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="text">
          Huỷ
        </Button>

        <Button
          variant="contained"
          onClick={onSave}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            px: 3,
          }}
        >
          Lưu thay đổi
        </Button>
      </DialogActions>
    </Dialog>
  );
}