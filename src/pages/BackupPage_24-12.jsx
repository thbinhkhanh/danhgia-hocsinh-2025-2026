import React, { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Stack,
  Typography,
  Snackbar,
  Alert,
  Divider,
} from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";


const BACKUP_KEYS = [
  { key: "DANHSACH", label: "Danh sách học sinh" },
  { key: "CONFIG", label: "Cấu hình hệ thống" },
  { key: "KTDK", label: "Kết quả KTĐK" },
  { key: "DGTX", label: "Kết quả ĐGTX" },
  { key: "BAITAP_TUAN", label: "Bài tập tuần" },
  { key: "TRACNGHIEM_BK", label: "Đề KTĐK Bình Khánh" },
  { key: "TRACNGHIEM_LVB", label: "Đề KTĐK Lâm Văn Bền" },
];

export default function BackupPage({ open, onClose }) {
  const [backupOptions, setBackupOptions] = useState(
    BACKUP_KEYS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
  );
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const toggleOption = (key) => {
    setBackupOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ----- Hàm export JSON -----
  const exportBackupToJson = (data) => {
    if (!data || Object.keys(data).length === 0) return;

    const SHORT_NAMES = {
        DANHSACH: "DS",
        CONFIG: "CFG",
        KTDK: "KTDK",
        DGTX: "DGTX",
        BAITAP_TUAN: "BT",
        TRACNGHIEM_BK: "BK",
        TRACNGHIEM_LVB: "LVB",
    };

    const allKeys = Object.keys(SHORT_NAMES);
    const keys = Object.keys(data);

    // Nếu backup đủ tất cả collection thì đặt tên "full"
    const collectionsName =
        keys.length === allKeys.length
        ? "full"
        : keys.map((k) => SHORT_NAMES[k] || k).join("_");

    // Format thời gian: dd-MM-yy (hh:mm:ss)
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const day = pad(now.getDate());
    const month = pad(now.getMonth() + 1);
    const year = now.getFullYear().toString().slice(-2); // lấy 2 số cuối
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    const timestamp = `${day}-${month}-${year} (${hours}:${minutes}:${seconds})`;

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Backup_${collectionsName}_${timestamp}.json`;
    a.click();
    };

  // ----- Hàm backup theo checkbox -----
  const fetchAllBackup = async (onProgress, selectedCollections) => {
    try {
      const backupData = {};
      const QUIZ_ARRAY = ["BAITAP_TUAN", "TRACNGHIEM_BK", "TRACNGHIEM_LVB"];
      if (!selectedCollections || selectedCollections.length === 0) return {};

      let progressCount = 0;
      const progressStep = Math.floor(100 / selectedCollections.length);

      for (const colName of selectedCollections) {
        // 1️⃣ Quiz
        if (QUIZ_ARRAY.includes(colName)) {
          const snap = await getDocs(collection(db, colName));
          if (!snap.empty) backupData[colName] = {};
          snap.forEach((d) => (backupData[colName][d.id] = d.data()));
        }

        // 2️⃣ DGTX
        else if (colName === "DGTX") {
          const classSnap = await getDocs(collection(db, "DANHSACH"));
          const classIds = classSnap.docs.map((d) => d.id);
          const classIdsWithCN = [...classIds, ...classIds.map((id) => `${id}_CN`)];
          for (const lopId of classIdsWithCN) {
            const tuanSnap = await getDocs(collection(db, "DGTX", lopId, "tuan"));
            if (!tuanSnap.empty) {
              if (!backupData.DGTX) backupData.DGTX = {};
              backupData.DGTX[lopId] = { tuan: {} };
              tuanSnap.forEach((t) => (backupData.DGTX[lopId].tuan[t.id] = t.data()));
            }
          }
        }

        // 3️⃣ KTDK
        else if (colName === "KTDK") {
          const snap = await getDocs(collection(db, "KTDK"));
          if (!snap.empty) backupData.KTDK = {};
          snap.forEach((d) => (backupData.KTDK[d.id] = d.data()));
        }

        // 4️⃣ Collection phẳng: DANHSACH, CONFIG
        else if (["DANHSACH", "CONFIG"].includes(colName)) {
          const snap = await getDocs(collection(db, colName));
          if (!snap.empty) backupData[colName] = {};
          snap.forEach((d) => (backupData[colName][d.id] = d.data()));
        }

        progressCount += progressStep;
        if (onProgress) onProgress(Math.min(progressCount, 99));
      }

      // Lọc DGTX rỗng nếu có
      if (backupData.DGTX) {
        Object.keys(backupData.DGTX).forEach((lopId) => {
          if (!backupData.DGTX[lopId]?.tuan || Object.keys(backupData.DGTX[lopId].tuan).length === 0) {
            delete backupData.DGTX[lopId];
          }
        });
        if (Object.keys(backupData.DGTX).length === 0) delete backupData.DGTX;
      }

      if (onProgress) onProgress(100);
      return backupData;
    } catch (err) {
      console.error("❌ Lỗi khi backup:", err);
      return {};
    }
  };

  const handleBackup = async () => {
    const selected = Object.keys(backupOptions).filter((k) => backupOptions[k]);
    if (selected.length === 0) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "Vui lòng chọn ít nhất một dữ liệu để sao lưu",
      });
      return;
    }

    try {
      setLoading(true);
      setProgress(0);
      const data = await fetchAllBackup(setProgress, selected);
      exportBackupToJson(data);
      setSnackbar({
        open: true,
        severity: "success",
        message: "✅ Sao lưu dữ liệu thành công",
      });
      onClose();
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        severity: "error",
        message: "❌ Lỗi khi sao lưu dữ liệu",
      });
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
        PaperProps={{
          sx: { borderRadius: 3, p: 3, bgcolor: "#fff", boxShadow: "0 4px 12px rgba(33,150,243,0.15)" },
        }}
      >
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
                🗄️
            </Box>
            <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0", flex: 1 }}>
                Chọn dữ liệu sao lưu
            </DialogTitle>

            {/* Nút X màu đỏ góc phải */}
            <IconButton
                onClick={onClose}
                sx={{
                ml: "auto",
                color: "#f44336",
                "&:hover": { bgcolor: "rgba(244,67,54,0.1)" },
                }}
            >
                <CloseIcon />
            </IconButton>
            </Box>


        <DialogContent dividers>
            <Stack spacing={0.5}>
                {BACKUP_KEYS.map(({ key, label }) => (
                <React.Fragment key={key}>
                    <FormControlLabel
                    control={
                        <Checkbox
                        checked={backupOptions[key]}
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
                    variant="body2"
                    align="center"
                    color="text.secondary"
                    >
                    Đang sao lưu... {progress}%
                    </Typography>
                </>
                )}
            </Stack>
            </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Hủy</Button>
          <Button variant="contained" startIcon={<BackupIcon />} onClick={handleBackup} disabled={loading}>
            Sao lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }} // đặt ở góc phải dưới
        >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
            {snackbar.message}
        </Alert>
      </Snackbar>

    </>
  );
}
