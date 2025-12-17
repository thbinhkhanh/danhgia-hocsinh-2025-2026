// UploadPage.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Stack,
  Typography,
  Alert,
  Divider,
  Box,
  LinearProgress,
  Snackbar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import * as XLSX from "xlsx";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function UploadPage({ open, onClose, selectedClass }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Reset khi mở dialog
  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setLoading(false);
      setProgress(0);
      setMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedClass) {
      setSnackbar({ open: true, severity: "warning", message: "Vui lòng chọn file và lớp trước khi tải" });
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const dataToSave = {};
      jsonData.forEach((item) => {
        if (item.maDinhDanh && item.hoVaTen) {
          dataToSave[item.maDinhDanh] = { hoVaTen: item.hoVaTen };
        }
      });

      // Mô phỏng progress
      const keys = Object.keys(dataToSave);
      for (let i = 0; i < keys.length; i++) {
        const id = keys[i];
        await setDoc(doc(db, "DANHSACH", selectedClass), { [id]: dataToSave[id] }, { merge: true });
        setProgress(Math.round(((i + 1) / keys.length) * 100));
      }

      setMessage("📥 Tải dữ liệu thành công!");
      setSuccess(true);
      setSnackbar({ open: true, severity: "success", message: "✅ Tải danh sách thành công" });
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi tải file.");
      setSuccess(false);
      setSnackbar({ open: true, severity: "error", message: "❌ Lỗi khi tải danh sách" });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 3, bgcolor: "#fff", boxShadow: "0 4px 12px rgba(33,150,243,0.15)" } }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Box
            sx={{
              bgcolor: "#42a5f5",
              color: "#fff",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mr: 1.5,
              fontWeight: "bold",
              fontSize: 18,
            }}
          >
            📄
          </Box>
          <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0" }}>Tải danh sách học sinh</DialogTitle>
          <IconButton onClick={onClose} sx={{ ml: "auto", color: "#f44336", "&:hover": { bgcolor: "rgba(244,67,54,0.1)" } }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Nội dung */}
        <DialogContent dividers>
          <Stack spacing={2}>
            <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => fileInputRef.current.click()}>
              Chọn file Excel
            </Button>
            <input type="file" hidden accept=".xlsx" ref={fileInputRef} onChange={handleFileChange} />
            {selectedFile && (
              <Typography sx={{ color: "red", fontWeight: "bold" }}>📄 {selectedFile.name}</Typography>
            )}

            {loading && (
              <>
                <LinearProgress variant="determinate" value={progress} sx={{ mt: 2 }} />
                <Typography align="center" variant="body2" color="text.secondary">
                  Đang tải... {progress}%
                </Typography>
              </>
            )}

            {message && <Alert severity={success ? "success" : "error"}>{message}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={handleUpload}
            disabled={loading || !selectedFile}
            sx={{ borderRadius: 1, minWidth: 64, px: 2, height: 36, textTransform: "none" }}
          >
            TẢI LÊN
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
