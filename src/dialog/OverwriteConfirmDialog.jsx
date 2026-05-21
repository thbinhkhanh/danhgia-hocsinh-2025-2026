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

const OverwriteConfirmDialog = ({ open, onClose, onConfirm }) => {
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
              bgcolor: "rgba(255, 152, 0, 0.12)",
            }}
          >
            <WarningAmberRoundedIcon sx={{ color: "#ff9800" }} />
          </Box>

          <Typography fontWeight={600} color="#ef6c00">
            Xác nhận ghi đè
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
          Đề ôn tập này đã tồn tại trong hệ thống.
          <br />
          Bạn có chắc chắn muốn{" "}
          <Box component="span" sx={{ fontWeight: 600 }}>
            ghi đè toàn bộ dữ liệu mới
          </Box>{" "}
          lên đề cũ không?
          <br />
          Hành động này{" "}
          <Box component="span" sx={{ fontWeight: 600 }}>
            sẽ thay thế hoàn toàn dữ liệu cũ
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
            color="warning"
            fullWidth
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "none",
            }}
          >
            Ghi đè
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default OverwriteConfirmDialog;