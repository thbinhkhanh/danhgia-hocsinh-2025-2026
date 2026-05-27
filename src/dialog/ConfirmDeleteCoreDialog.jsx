import React from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Stack,
  Button,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

const ConfirmDeleteCoreDialog = ({ open, onClose, onConfirm, message }) => {
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
          borderRadius: "18px",
          overflow: "hidden",
          background: "#f8fafc",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 3,
          py: 2,
          color: "#fff",
          background: "linear-gradient(135deg, #1976d2, #42a5f5)",
          position: "relative",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              bgcolor: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            <WarningAmberRoundedIcon sx={{ fontSize: 18, color: "#f44336" }} />
          </Box>

          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
            Xác nhận xóa
          </Typography>
        </Stack>

        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 10,
            top: 10,
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.15)",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.25)",
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ px: 3, py: 4 }}>
        <Stack spacing={2} alignItems="center">
          <Typography
            sx={{
              fontSize: 15,
              color: "#64748b",
              textAlign: "center",
              lineHeight: 1.7,
            }}
          >
            {message || "Bạn có chắc chắn muốn xóa dữ liệu này?"}
            <br />
            Hành động này{" "}
            <Box component="span" sx={{ fontWeight: 700, color: "#d32f2f" }}>
              không thể hoàn tác
            </Box>
            .
          </Typography>

          {/* BUTTONS */}
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                minWidth: 110,
                height: 42,
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Hủy
            </Button>

            <Button
              variant="contained"
              onClick={onConfirm}
              sx={{
                minWidth: 130,
                height: 42,
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                background: "linear-gradient(135deg, #1976d2, #42a5f5)",
                boxShadow: "0 10px 20px rgba(25,118,210,0.25)",
                "&:hover": {
                  background: "linear-gradient(135deg, #1565c0, #1976d2)",
                },
              }}
            >
              Xóa
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDeleteCoreDialog;