import React from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Stack,
  Paper,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import DataObjectIcon from "@mui/icons-material/DataObject";   // JSON
import DescriptionIcon from "@mui/icons-material/Description"; // Word

const ExportSourceDialog = ({
  open,
  onClose,
  onSelectJSON,
  onSelectWord,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #2e7d32, #66bb6a)",
          color: "#fff",
          px: 2,
          py: 1.2,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: "bold", lineHeight: 1.2 }}
        >
          📤 Xuất đề kiểm tra
        </Typography>

        <IconButton onClick={onClose} sx={{ color: "#fff", p: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ py: 3 }}>
        <Typography
          variant="body2"
          sx={{ mb: 2, textAlign: "center", color: "text.secondary" }}
        >
          Chọn định dạng xuất
        </Typography>

        <Stack spacing={2}>
          {/* JSON */}
          <Paper
            elevation={2}
            onClick={() => {
              onClose();
              //onSelectJSON?.();
              onSelectJSON?.("questions.json");
            }}
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              borderRadius: 2,
              transition: "0.2s",
              "&:hover": {
                backgroundColor: "#e3f2fd",
                transform: "translateY(-2px)",
              },
            }}
          >
            <DataObjectIcon sx={{ fontSize: 36, color: "#1976d2" }} />
            <Box>
              <Typography fontWeight="bold">
                Xuất file JSON
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lưu trữ hoặc import lại hệ thống
              </Typography>
            </Box>
          </Paper>

          {/* WORD */}
          <Paper
            elevation={2}
            onClick={() => {
              onClose();
              onSelectWord?.();
            }}
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
              borderRadius: 2,
              transition: "0.2s",
              "&:hover": {
                backgroundColor: "#e8f5e9",
                transform: "translateY(-2px)",
              },
            }}
          >
            <DescriptionIcon sx={{ fontSize: 36, color: "#2e7d32" }} />
            <Box>
              <Typography fontWeight="bold">
                Xuất file Word
              </Typography>
              <Typography variant="body2" color="text.secondary">
                File .docx để in hoặc chia sẻ
              </Typography>
            </Box>
          </Paper>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default ExportSourceDialog;