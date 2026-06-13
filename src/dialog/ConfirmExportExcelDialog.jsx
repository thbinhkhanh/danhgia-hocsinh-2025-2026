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

export default function ConfirmExportExcelDialog({
  open,
  title,
  content,
  onClose,
  onConfirm,
}) {
  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (
          reason === "backdropClick" ||
          reason === "escapeKeyDown"
        ) {
          return;
        }
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
          py: 1.5,
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
              bgcolor: "#fff", // chỉ đổi chỗ này
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            ❓
          </Box>

          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            {title}
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
      <DialogContent
        sx={{
          px: 3,
          py: 4,
          textAlign: "center",
        }}
      >
        <Stack spacing={2.5} alignItems="center">
          {/* DESCRIPTION */}
          <Typography
            sx={{
                fontSize: 15,
                color: "#64748b",
                maxWidth: 320,
                lineHeight: 1.7,
                textAlign: "left",
                whiteSpace: "pre-line",
            }}
            >
            {content}
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
                minWidth: 140,
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
              Xác nhận
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}