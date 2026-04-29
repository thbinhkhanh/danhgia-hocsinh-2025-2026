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
import UploadFileIcon from "@mui/icons-material/UploadFile";
import StorageIcon from "@mui/icons-material/Storage";
import DescriptionIcon from "@mui/icons-material/Description"; // 👈 Word icon

const ImportSourceDialog = ({
  open,
  onClose,
  onSelectJSON,
  onSelectFirestore,
  onSelectWord, // 👈 thêm prop
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #ed6c02, #ff9800)",
          color: "#fff",
          px: 2,
          py: 1.2,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: "bold", lineHeight: 1.2 }}
        >
          📥 Nhập đề kiểm tra
        </Typography>

        <IconButton
          onClick={onClose}
          sx={{ color: "#fff", p: 0.5 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ py: 3 }}>
        <Typography
          variant="body2"
          sx={{ mb: 2, textAlign: "center", color: "text.secondary" }}
        >
          Chọn nguồn dữ liệu để import
        </Typography>

        <Stack spacing={2}>
          {/* JSON */}
          <Paper
            elevation={2}
            onClick={() => {
              onClose();
              onSelectJSON?.();
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
            <UploadFileIcon sx={{ fontSize: 36, color: "#2e7d32" }} />
            <Box>
              <Typography fontWeight="bold">
                Import từ file JSON
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tải file từ máy tính
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
                backgroundColor: "#e3f2fd",
                transform: "translateY(-2px)",
              },
            }}
          >
            <DescriptionIcon sx={{ fontSize: 36, color: "#1976d2" }} />
            <Box>
              <Typography fontWeight="bold">
                Import từ file Word
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hỗ trợ .docx (trắc nghiệm)
              </Typography>
            </Box>
          </Paper>

          {/* FIRESTORE */}
          <Paper
            elevation={2}
            onClick={() => {
              onClose();
              onSelectFirestore?.();
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
                backgroundColor: "#f3e5f5",
                transform: "translateY(-2px)",
              },
            }}
          >
            <StorageIcon sx={{ fontSize: 36, color: "#6a1b9a" }} />
            <Box>
              <Typography fontWeight="bold">
                Import từ đề đã có
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lấy từ Firestore
              </Typography>
            </Box>
          </Paper>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default ImportSourceDialog;