import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Stack,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Typography,
  Snackbar,
  Alert,
  Divider,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RestoreIcon from "@mui/icons-material/Restore";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { doc, setDoc, writeBatch } from "firebase/firestore";

import { db } from "../firebase";

const BACKUP_KEYS = [
  { key: "DANHSACH", label: "Danh sách lớp" },
  { key: "CONFIG", label: "Cấu hình" },
  { key: "BAITAP_TUAN", label: "Bài tập tuần" },
  { key: "NGANHANG_DE", label: "Đề KTĐK" },
  { key: "MATKHAU", label: "Mật khẩu" },
  { key: "DETHI", label: "Đề thi" },
  { key: "DATA", label: "Kết quả đánh giá" },
];

export default function RestorePage({ open, onClose }) {
  const fileInputRef = useRef(null);
  const [restoreOptions, setRestoreOptions] = useState({});
  const [disabledOptions, setDisabledOptions] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (open) {
      const initChecked = {};
      const initDisabled = {};
      BACKUP_KEYS.forEach(({ key }) => {
        initChecked[key] = false;
        initDisabled[key] = true;
      });
      setRestoreOptions(initChecked);
      setDisabledOptions(initDisabled);
      setSelectedFile(null);
      setProgress(0);
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const toggleOption = (key) => {
    setRestoreOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const newChecked = {};
      const newDisabled = {};
      BACKUP_KEYS.forEach(({ key }) => {
        const hasData = json[key] && Object.keys(json[key]).length > 0;
        newChecked[key] = hasData;
        newDisabled[key] = !hasData;
      });
      setRestoreOptions(newChecked);
      setDisabledOptions(newDisabled);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, severity: "error", message: "❌ File phục hồi không hợp lệ" });
    }
  };

  const handleRestore = async () => {
    const selectedKeys = Object.keys(restoreOptions).filter((k) => restoreOptions[k]);
    if (!selectedFile) {
      setSnackbar({ open: true, severity: "warning", message: "Vui lòng chọn file phục hồi" });
      return;
    }
    if (selectedKeys.length === 0) {
      setSnackbar({ open: true, severity: "warning", message: "Vui lòng chọn ít nhất một dữ liệu để phục hồi" });
      return;
    }

    try {
      setLoading(true);
      setProgress(0);
      const text = await selectedFile.text();
      const jsonData = JSON.parse(text);

      // Tính tổng số document
      let totalDocs = 0;
      for (const key of selectedKeys) {
        const docs = jsonData[key];
        if (!docs) continue;
        if (key === "DATA") {
          for (const classId of Object.keys(docs)) {
            totalDocs += Object.keys(docs[classId]?.HOCSINH || {}).length;
          }
        } else {
          totalDocs += Object.keys(docs).length;
        }
      }

      let done = 0;

      for (const key of selectedKeys) {
        const docs = jsonData[key];
        if (!docs) continue;

        if (key === "DATA") {
          for (const classId of Object.keys(docs)) {
            const hsObj = docs[classId]?.HOCSINH || {};
            
            // Set nhiều document song song, nhưng vẫn update progress từng document
            await Promise.all(
              Object.keys(hsObj).map(async (studentId) => {
                await setDoc(doc(db, "DATA", classId, "HOCSINH", studentId), hsObj[studentId], { merge: true });
                done++;
                setProgress(Math.round((done / totalDocs) * 100));
              })
            );
          }
        } else {
          await Promise.all(
            Object.keys(docs).map(async (docId) => {
              await setDoc(doc(db, key, docId), docs[docId], { merge: true });
              done++;
              setProgress(Math.round((done / totalDocs) * 100));
            })
          );
        }
      }

      setProgress(100);
      setSnackbar({ open: true, severity: "success", message: "✅ Phục hồi dữ liệu thành công" });
      onClose();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, severity: "error", message: "❌ Lỗi khi phục hồi dữ liệu" });
    } finally {
      setLoading(false);
    }
  };

  const hasAnyChecked = Object.values(restoreOptions).some(Boolean);

  const renderGroup = (title, keys) => (
    <>
      <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>{title}</Typography>
      <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
        {keys.map((key) => (
          <FormControlLabel
            key={key}
            control={<Checkbox checked={restoreOptions[key] || false} disabled={disabledOptions[key]} onChange={() => toggleOption(key)} />}
            label={BACKUP_KEYS.find((k) => k.key === key).label}
          />
        ))}
      </Box>
      <Divider sx={{ mt: 1, mb: 1 }} />
    </>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 3, bgcolor: "#fff", boxShadow: "0 4px 12px rgba(33,150,243,0.15)" } }}>
        
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Box sx={{ bgcolor: "#42a5f5", color: "#fff", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", mr: 1.5, fontWeight: "bold", fontSize: 18 }}>🗄️</Box>
          <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "error.main" }}>PHỤC HỒI DỮ LIỆU</DialogTitle>
          <IconButton onClick={onClose} sx={{ ml: "auto", color: "#f44336", "&:hover": { bgcolor: "rgba(244,67,54,0.1)" } }}><CloseIcon /></IconButton>
        </Box>

        <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current.click()} sx={{ mb: 1 }}>
          Chọn file phục hồi (.json)
        </Button>
        <input type="file" hidden accept=".json" ref={fileInputRef} onChange={handleFileChange} />
        {selectedFile && <Typography sx={{ color: "red", fontWeight: "bold", mb: 1 }}>📄 {selectedFile.name}</Typography>}

        <DialogContent dividers>
          <Stack spacing={1}>
            {renderGroup("Hệ thống", ["CONFIG", "MATKHAU", "DANHSACH"])}
            {renderGroup("Ngân hàng đề", ["BAITAP_TUAN", "NGANHANG_DE", "DETHI"])}
            {renderGroup("Kết quả", ["DATA"])}
          </Stack>
        </DialogContent>

        {loading && (
          <>
            <Box sx={{ width: "50%", mx: "auto", mt: 3 }}>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 0.5 }}>
              Đang phục hồi... {progress}%
            </Typography>
          </>
        )}

        <DialogActions sx={{ justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button variant="contained" startIcon={<RestoreIcon />} onClick={handleRestore} disabled={loading || !hasAnyChecked}>
            PHỤC HỒI
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}
