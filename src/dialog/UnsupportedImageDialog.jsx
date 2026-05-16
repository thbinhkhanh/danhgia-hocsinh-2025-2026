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

const UnsupportedImageDialog = ({ open, onClose }) => {
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

          <Typography fontWeight={600}>
            Định dạng không hỗ trợ
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
          Chỉ hỗ trợ các định dạng ảnh phổ biến:
          <Box component="span" sx={{ fontWeight: 600 }}>
            {" "}PNG, JPG, JPEG, WEBP
          </Box>.
          <br />
          Vui lòng chọn lại file hợp lệ để tiếp tục.
        </Typography>
      </DialogContent>

      {/* ACTIONS */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Đã hiểu
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnsupportedImageDialog;