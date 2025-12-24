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
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const RESTORE_KEYS = [
  { key: "DANHSACH", label: "Danh sách học sinh" },
  { key: "CONFIG", label: "Cấu hình hệ thống" },
  { key: "KTDK", label: "Kết quả KTĐK" },
  { key: "DGTX", label: "Kết quả ĐGTX" },
  { key: "BAITAP_TUAN", label: "Bài tập tuần" },
  { key: "TRACNGHIEM_BK", label: "Đề KTĐK Bình Khánh" },
  { key: "TRACNGHIEM_LVB", label: "Đề KTĐK Lâm Văn Bền" },
];

export default function RestorePage({ open, onClose }) {
  const fileInputRef = useRef(null);
  const [restoreOptions, setRestoreOptions] = useState({});
  const [disabledOptions, setDisabledOptions] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Reset checkbox khi mở dialog
  useEffect(() => {
    if (open) {
      const initChecked = {};
      const initDisabled = {};
      RESTORE_KEYS.forEach(({ key }) => {
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

  // ----- Hàm phục hồi trực tiếp -----
  const restoreAllFromJson = async (file, selectedCollections, onProgress) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const QUIZ_ARRAY = ["BAITAP_TUAN", "TRACNGHIEM_BK", "TRACNGHIEM_LVB"];

      // Chỉ lấy các collection có trong file và tick
      const collections = Object.keys(data).filter((c) =>
        selectedCollections.includes(c)
      );

      let progressCount = 0;
      const progressStep = Math.floor(100 / collections.length);

      for (const colName of collections) {
        // 1️⃣ Quiz
        if (QUIZ_ARRAY.includes(colName)) {
          const docs = data[colName] || {};
          const ids = Object.keys(docs);
          for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            await setDoc(doc(db, colName, id), docs[id], { merge: true });
            if (onProgress) {
              const step = ((i + 1) / ids.length) * progressStep;
              onProgress(Math.min(Math.round(progressCount + step), 99));
            }
          }
        }

        // 2️⃣ DGTX
        else if (colName === "DGTX") {
          const classes = Object.keys(data.DGTX || {});
          for (let i = 0; i < classes.length; i++) {
            const lopId = classes[i];
            const tuanData = data.DGTX[lopId]?.tuan || {};
            for (const tuanId of Object.keys(tuanData)) {
              await setDoc(doc(db, "DGTX", lopId, "tuan", tuanId), tuanData[tuanId], {
                merge: true,
              });
            }
            if (onProgress) {
              const step = ((i + 1) / classes.length) * progressStep;
              onProgress(Math.min(Math.round(progressCount + step), 99));
            }
          }
        }

        // 3️⃣ KTDK
        else if (colName === "KTDK") {
          const docs = data.KTDK || {};
          const ids = Object.keys(docs);
          for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            await setDoc(doc(db, "KTDK", id), docs[id], { merge: true });
            if (onProgress) {
              const step = ((i + 1) / ids.length) * progressStep;
              onProgress(Math.min(Math.round(progressCount + step), 99));
            }
          }
        }

        // 4️⃣ DANHSACH, CONFIG
        else if (["DANHSACH", "CONFIG"].includes(colName)) {
          const docs = data[colName] || {};
          const ids = Object.keys(docs);
          for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            await setDoc(doc(db, colName, id), docs[id], { merge: true });
            if (onProgress) {
              const step = ((i + 1) / ids.length) * progressStep;
              onProgress(Math.min(Math.round(progressCount + step), 99));
            }
          }
        }

        progressCount += progressStep;
      }

      if (onProgress) onProgress(100);
      console.log("✅ Phục hồi dữ liệu hoàn tất!");
      return true;
    } catch (err) {
      console.error("❌ Lỗi khi phục hồi:", err);
      return false;
    }
  };

  const handleRestore = async () => {
    const selectedKeys = Object.keys(restoreOptions).filter((k) => restoreOptions[k]);
    if (!selectedFile) {
      setSnackbar({ open: true, severity: "warning", message: "Vui lòng chọn file phục hồi" });
      return;
    }
    if (selectedKeys.length === 0) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "Vui lòng chọn ít nhất một dữ liệu để phục hồi",
      });
      return;
    }

    try {
      setLoading(true);
      setProgress(0);
      await restoreAllFromJson(selectedFile, selectedKeys, (p) => setProgress(p));
      setSnackbar({ open: true, severity: "success", message: "✅ Phục hồi dữ liệu thành công" });
      onClose();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, severity: "error", message: "❌ Lỗi khi phục hồi dữ liệu" });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const hasAnyChecked = Object.values(restoreOptions).some(Boolean);

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
          <Box sx={{ bgcolor: "#42a5f5", color: "#fff", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", mr: 1.5, fontWeight: "bold", fontSize: 18 }}>🗄️</Box>
          <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0" }}>Phục hồi dữ liệu</DialogTitle>
          <IconButton onClick={onClose} sx={{ ml: "auto", color: "#f44336", "&:hover": { bgcolor: "rgba(244,67,54,0.1)" } }}><CloseIcon /></IconButton>
        </Box>

        {/* Nội dung */}
        <DialogContent dividers>
            <Stack spacing={1}>
                <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current.click()}
                >
                Chọn file phục hồi (.json)
                </Button>
                <input
                type="file"
                hidden
                accept=".json"
                ref={fileInputRef}
                onChange={(e) => handleFileChange(e)}
                />
                {selectedFile && (
                    <Typography sx={{ color: "red", fontWeight: "bold" }}>
                        📄 {selectedFile.name}
                    </Typography>
                    )}

                <Divider sx={{ my: 1 }} />

                {RESTORE_KEYS.map(({ key, label }) => (
                <React.Fragment key={key}>
                    <FormControlLabel
                    control={
                        <Checkbox
                        checked={restoreOptions[key] || false}
                        disabled={disabledOptions[key]}
                        onChange={() => toggleOption(key)}
                        />
                    }
                    label={label}
                    />
                    {key === "DGTX" && <Divider sx={{ mt: 1, mb: 1 }} />}
                </React.Fragment>
                ))}

                {loading && (
                <>
                    <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ mt: 2 }}
                    />
                    <Typography
                    align="center"
                    variant="body2"
                    color="text.secondary"
                    >
                    Đang phục hồi... {progress}%
                    </Typography>
                </>
                )}
            </Stack>
            </DialogContent>

        <DialogActions sx={{ justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button variant="contained" startIcon={<RestoreIcon />} onClick={handleRestore} disabled={loading || !hasAnyChecked} sx={{ borderRadius: 1, minWidth: 64, px: 2, height: 36, textTransform: "none" }}>
            PHỤC HỒI
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }} // ⚡ đặt ở góc phải dưới
        >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
            {snackbar.message}
        </Alert>
    </Snackbar>

    </>
  );

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const newChecked = {};
      const newDisabled = {};
      RESTORE_KEYS.forEach(({ key }) => {
        const hasData = json[key] && (Array.isArray(json[key]) ? json[key].length > 0 : Object.keys(json[key]).length > 0);
        newChecked[key] = hasData;
        newDisabled[key] = !hasData;
      });

      setRestoreOptions(newChecked);
      setDisabledOptions(newDisabled);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, severity: "error", message: "❌ File phục hồi không hợp lệ" });
    }
  }
}
