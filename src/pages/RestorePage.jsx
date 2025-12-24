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

  // 🔹 các collection mới
  { key: "LAMVANBEN", label: "Cấu hình & Lớp Lâm Văn Bền" },
  { key: "MATKHAU", label: "Mật khẩu tài khoản" },
  { key: "DETHI_LVB", label: "Đề đã chọn LVB" },
  { key: "DETHI_BK", label: "Đề đã chọn BK" },
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

  //const [restoreOptions, setRestoreOptions] = useState({});
  const [groupOptions, setGroupOptions] = useState({
    configGroup: false,
    bankGroup: false,
    examGroup: false,
    resultGroup: false,
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
      const QUIZ_ARRAY = [
        "BAITAP_TUAN",
        "TRACNGHIEM_BK",
        "TRACNGHIEM_LVB",
        "DETHI_LVB",
        "DETHI_BK",
      ];

      const collections = Object.keys(data).filter(c =>
        selectedCollections.includes(c)
      );

      let progressCount = 0;
      const progressStep = Math.floor(100 / collections.length);

      for (const colName of collections) {
        // 1️⃣ Quiz và đề thi
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
        // 2️⃣ DGTX (nested collection)
        else if (colName === "DGTX") {
          const classes = Object.keys(data.DGTX || {});
          for (let i = 0; i < classes.length; i++) {
            const lopId = classes[i];
            const tuanData = data.DGTX[lopId]?.tuan || {};
            for (const tuanId of Object.keys(tuanData)) {
              await setDoc(doc(db, "DGTX", lopId, "tuan", tuanId), tuanData[tuanId], { merge: true });
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
        // 4️⃣ Collection phẳng: DANHSACH, CONFIG, LAMVANBEN, MATKHAU
        else if (["DANHSACH", "CONFIG", "LAMVANBEN", "MATKHAU"].includes(colName)) {
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

  const getGroupState = (keys) => {
    const values = keys.map(k => restoreOptions[k] || false);
    const allChecked = values.every(v => v === true);
    const allUnchecked = values.every(v => v === false);
    return {
      checked: allChecked,
      indeterminate: !allChecked && !allUnchecked
    };
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
          <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "error.main" }}>PHỤC HỒI DỮ LIỆU</DialogTitle>
          <IconButton onClick={onClose} sx={{ ml: "auto", color: "#f44336", "&:hover": { bgcolor: "rgba(244,67,54,0.1)" } }}><CloseIcon /></IconButton>
        </Box>

        {/* Nút chọn file + hiển thị tên file */}
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInputRef.current.click()}
          sx={{ mb: 1 }}
        >
          Chọn file phục hồi (.json)
        </Button>
        <input
          type="file"
          hidden
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        {selectedFile && (
          <Typography sx={{ color: "red", fontWeight: "bold", mb: 1 }}>
            📄 {selectedFile.name}
          </Typography>
        )}

        {/* Nội dung */}
        <DialogContent dividers>
          <Stack spacing={1}>

            {/* ====== 1️⃣ Cấu hình ====== */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>
                Cấu hình
              </Typography>
              <Checkbox
                {...getGroupState(["CONFIG","LAMVANBEN","MATKHAU","DANHSACH"])}
                disabled={["CONFIG","LAMVANBEN","MATKHAU","DANHSACH"].every(k => disabledOptions[k])}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRestoreOptions(prev => ({
                    ...prev,
                    CONFIG: checked,
                    LAMVANBEN: checked,
                    MATKHAU: checked,
                    DANHSACH: checked
                  }));
                }}
                sx={{ ml: 1 }}
              />
            </Box>
            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
              {["CONFIG","LAMVANBEN","MATKHAU","DANHSACH"].map(key => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={restoreOptions[key] || false}
                      disabled={disabledOptions[key]}
                      onChange={() => toggleOption(key)}
                    />
                  }
                  label={key === "CONFIG" ? "Cấu hình BK"
                        : key === "LAMVANBEN" ? "Cấu hình LVB"
                        : key === "MATKHAU" ? "Mật khẩu tài khoản"
                        : "Danh sách lớp BK"}
                />
              ))}
            </Box>
            <Divider sx={{ mt: 1, mb: 1 }} />

            {/* ====== 2️⃣ Ngân hàng đề ====== */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>
                Ngân hàng đề
              </Typography>
              <Checkbox
                {...getGroupState(["TRACNGHIEM_BK","TRACNGHIEM_LVB","BAITAP_TUAN"])}
                disabled={["TRACNGHIEM_BK","TRACNGHIEM_LVB","BAITAP_TUAN"].every(k => disabledOptions[k])}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRestoreOptions(prev => ({
                    ...prev,
                    TRACNGHIEM_BK: checked,
                    TRACNGHIEM_LVB: checked,
                    BAITAP_TUAN: checked
                  }));
                }}
                sx={{ ml: 1 }}
              />
            </Box>
            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
              {["TRACNGHIEM_BK","TRACNGHIEM_LVB","BAITAP_TUAN"].map(key => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={restoreOptions[key] || false}
                      disabled={disabledOptions[key]}
                      onChange={() => toggleOption(key)}
                    />
                  }
                  label={key === "TRACNGHIEM_BK" ? "Đề KTĐK BK"
                        : key === "TRACNGHIEM_LVB" ? "Đề KTĐK LVB"
                        : "Bài tập tuần"}
                />
              ))}
            </Box>
            <Divider sx={{ mt: 1, mb: 1 }} />

            {/* ====== 3️⃣ Đề thi ====== */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>
                Đề thi
              </Typography>
              <Checkbox
                {...getGroupState(["DETHI_BK","DETHI_LVB"])}
                disabled={["DETHI_BK","DETHI_LVB"].every(k => disabledOptions[k])}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRestoreOptions(prev => ({
                    ...prev,
                    DETHI_BK: checked,
                    DETHI_LVB: checked
                  }));
                }}
                sx={{ ml: 1 }}
              />
            </Box>
            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
              {["DETHI_BK","DETHI_LVB"].map(key => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={restoreOptions[key] || false}
                      disabled={disabledOptions[key]}
                      onChange={() => toggleOption(key)}
                    />
                  }
                  label={key === "DETHI_BK" ? "Đề thi BK" : "Đề thi LVB"}
                />
              ))}
            </Box>
            <Divider sx={{ mt: 1, mb: 1 }} />

            {/* ====== 4️⃣ Kết quả ====== */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>
                Kết quả
              </Typography>
              <Checkbox
                {...getGroupState(["KTDK","DGTX"])}
                disabled={["KTDK","DGTX"].every(k => disabledOptions[k])}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRestoreOptions(prev => ({
                    ...prev,
                    KTDK: checked,
                    DGTX: checked
                  }));
                }}
                sx={{ ml: 1 }}
              />
            </Box>
            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
              {["KTDK","DGTX"].map(key => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={restoreOptions[key] || false}
                      disabled={disabledOptions[key]}
                      onChange={() => toggleOption(key)}
                    />
                  }
                  label={key === "KTDK" ? "Kết quả KTĐK" : "Kết quả ĐGTX"}
                />
              ))}
            </Box>

            {loading && (
              <>
                <LinearProgress variant="determinate" value={progress} sx={{ mt: 2 }} />
                <Typography variant="body2" align="center" color="text.secondary">
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
