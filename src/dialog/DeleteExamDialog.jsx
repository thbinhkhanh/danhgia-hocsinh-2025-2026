import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

const DeleteConfirmDialog = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          //bgcolor: "#e3f2fd", // giữ nền giống dialog hệ thống
        },
      }}
    >
      {/* HEADER */}
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(244, 67, 54, 0.12)",
            }}
          >
            <WarningAmberRoundedIcon sx={{ color: "#f44336" }} />
          </Box>

          <Typography fontWeight={600} color="#d32f2f">
            Xác nhận xóa
          </Typography>
        </Stack>
      </DialogTitle>

      {/* CONTENT */}
      <DialogContent>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            lineHeight: 1.6,
            mt: 1,
          }}
        >
          Bạn có chắc chắn muốn xóa đề thi này?
          <br />
          Hành động này{" "}
          <Box component="span" sx={{ fontWeight: 600 }}>
            không thể hoàn tác
          </Box>
          .
        </Typography>
      </DialogContent>

      {/* ACTIONS */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Stack direction="row" spacing={1} width="100%">
          <Button
            onClick={onClose}
            variant="outlined"
            fullWidth
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Hủy
          </Button>

          <Button
            onClick={onConfirm}
            variant="contained"
            color="error"
            fullWidth
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "none",
            }}
          >
            Xóa
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmDialog;