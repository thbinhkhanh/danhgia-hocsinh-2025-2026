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
  // ===== HỌC SINH =====
  { key: "DANHSACH", label: "Danh sách lớp" },
  { key: "DATA", label: "Kết quả đánh giá" },

  // ===== ĐỀ KIỂM TRA =====
  { key: "NGANHANG_DE", label: "Đề KTĐK" },
  { key: "DETHI", label: "Đề thi" },
  { key: "BAITAP_TUAN", label: "Bài tập tuần" },

  // ===== LUYỆN TẬP =====
  { key: "TRACNGHIEM3", label: "Lớp 3 (CTST)" },
  { key: "TRACNGHIEM4", label: "Lớp 4 (CTST)" },
  { key: "TRACNGHIEM5", label: "Lớp 5 (CTST)" },

  { key: "TRACNGHIEM3_New", label: "Lớp 3 (KNTT)" },
  { key: "TRACNGHIEM4_New", label: "Lớp 4 (KNTT)" },
  { key: "TRACNGHIEM5_New", label: "Lớp 5 (KNTT)" },
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

  const exportBackupToJson = (data, backupOptions = {}) => {
    if (!data || Object.keys(data).length === 0) return;

    // tránh lỗi undefined
    const selectedCollections = Object.keys(backupOptions || {}).filter(
      (k) => backupOptions[k]
    );

    const collectionsName =
      selectedCollections.length === BACKUP_KEYS.length
        ? "full"
        : selectedCollections.join("_");

    const now = new Date();

    const pad = (n) => n.toString().padStart(2, "0");

    const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now
      .getFullYear()
      .toString()
      .slice(-2)}`;

    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(
      now.getSeconds()
    )}`;

    const fileName = `Backup_ĐGHS (${dateStr} ${timeStr}).json`;

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url);
  };

  const fetchAllBackup = async (onProgress, selectedCollections) => {
    const TRACNGHIEM_COLLECTIONS = [
      "TRACNGHIEM3",
      "TRACNGHIEM4",
      "TRACNGHIEM5",
      "TRACNGHIEM3_New",
      "TRACNGHIEM4_New",
      "TRACNGHIEM5_New",
    ];

    try {
      const backupData = {};
      if (!selectedCollections || selectedCollections.length === 0) return {};

      let progressCount = 0;
      const hasDATA = selectedCollections.includes("DATA");
      const otherCollections = selectedCollections.filter((c) => c !== "DATA");

      // Tính phần trăm tiến trình
      const DATA_WEIGHT = hasDATA ? 80 : 0;
      const OTHERS_WEIGHT = hasDATA ? 20 : 100;

      const otherStep =
        otherCollections.length > 0
          ? OTHERS_WEIGHT / otherCollections.length
          : 0;

      // ================== NHÓM KHÁC DATA ==================
      for (const colName of otherCollections) {
        // 1️⃣ Quiz
        if (["BAITAP_TUAN", "NGANHANG_DE"].includes(colName)) {
          const snap = await getDocs(collection(db, colName));

          if (!backupData[colName]) backupData[colName] = {};

          snap.forEach((d) => {
            backupData[colName][d.id] = d.data();
          });
        }

        // 2️⃣ Collection phẳng
        else if (
          ["DANHSACH", "DETHI"].includes(colName)
        ) {
          const snap = await getDocs(collection(db, colName));

          if (!backupData[colName]) backupData[colName] = {};

          snap.forEach((d) => {
            backupData[colName][d.id] = d.data();
          });
        }

        // 3️⃣ TRẮC NGHIỆM (FIX QUAN TRỌNG)
        else if (TRACNGHIEM_COLLECTIONS.includes(colName)) {
          const snap = await getDocs(collection(db, colName));

          if (!backupData[colName]) backupData[colName] = {};

          snap.forEach((d) => {
            backupData[colName][d.id] = d.data();
          });
        }

        // cập nhật tiến trình
        progressCount += otherStep;
        if (onProgress)
          onProgress(Math.min(Math.round(progressCount), 99));
      }

      // ================== DATA ==================
      if (hasDATA) {
        backupData.DATA = {};

        const classListSnap = await getDocs(collection(db, "DANHSACH"));
        const classList = classListSnap.docs.map((d) => d.id);

        if (classList.length === 0) {
          progressCount += DATA_WEIGHT;
          if (onProgress)
            onProgress(Math.min(Math.round(progressCount), 99));
        } else {
          const perClassStep = DATA_WEIGHT / classList.length;

          for (const classId of classList) {
            const classKey = classId.replace(".", "_");

            const studentsSnap = await getDocs(
              collection(db, "DATA", classKey, "HOCSINH")
            );

            backupData.DATA[classKey] = { HOCSINH: {} };

            for (const studentDoc of studentsSnap.docs) {
              const studentId = studentDoc.id;
              const studentData = studentDoc.data();

              backupData.DATA[classKey].HOCSINH[studentId] = {
                ...studentData,
              };
            }

            progressCount += perClassStep;
            if (onProgress)
              onProgress(Math.min(Math.round(progressCount), 99));
          }
        }
      }

      // ================== HOÀN TẤT ==================
      if (onProgress) onProgress(100);

      return backupData;
    } catch (err) {
      console.error("❌ Lỗi khi backup:", err);
      return {};
    }
  };


 const handleBackup = async () => {
    const VALID_KEYS = BACKUP_KEYS.map(k => k.key);

    const selected = Object.keys(backupOptions).filter(
      (k) => backupOptions[k] && VALID_KEYS.includes(k)
    );

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

      // 🔥 chỉ export đúng những gì đã chọn
      const filteredOptions = Object.fromEntries(
        selected.map(k => [k, true])
      );

      exportBackupToJson(data, filteredOptions);

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
        sx: {
          borderRadius: 3,
          p: 3,
          bgcolor: "#fff",
          boxShadow: "0 4px 12px rgba(33,150,243,0.15)",
        },
      }}
    >
      {/* HEADER */}
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
          }}
        >
          🗄️
        </Box>

        <DialogTitle sx={{ p: 0, fontWeight: "bold", color: "#1565c0", flex: 1 }}>
          SAO LƯU DỮ LIỆU
        </DialogTitle>

        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent>
        <Stack spacing={2}>

          {/* ===== HỌC SINH ===== */}
          <Box>
            <Typography sx={{ fontWeight: "bold", color: "error.main" }}>
              Học sinh
            </Typography>

            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={backupOptions["DANHSACH"]}
                    onChange={() => toggleOption("DANHSACH")}
                  />
                }
                label="Danh sách lớp"
              />

              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={backupOptions["DATA"]}
                    onChange={() => toggleOption("DATA")}
                  />
                }
                label="Kết quả đánh giá"
              />
            </Box>
          </Box>

          <Divider />

          {/* ===== ĐỀ KIỂM TRA ===== */}
          <Box>
            <Typography sx={{ fontWeight: "bold", color: "error.main" }}>
              Đề kiểm tra
            </Typography>

            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={backupOptions["NGANHANG_DE"]}
                    onChange={() => toggleOption("NGANHANG_DE")}
                  />
                }
                label="Đề KTĐK"
              />

              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={backupOptions["DETHI"]}
                    onChange={() => toggleOption("DETHI")}
                  />
                }
                label="Đề thi"
              />

              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={backupOptions["BAITAP_TUAN"]}
                    onChange={() => toggleOption("BAITAP_TUAN")}
                  />
                }
                label="Bài tập tuần"
              />
            </Box>
          </Box>

          <Divider />

          {/* ===== LUYỆN TẬP TIN HỌC ===== */}
          <Box>
            <Typography sx={{ fontWeight: "bold", color: "error.main" }}>
              Luyện tập tin học
            </Typography>

            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>

              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={backupOptions["TRACNGHIEM3"]}
                    onChange={() => toggleOption("TRACNGHIEM3")}
                  />
                }
                label="Lớp 3 (CTST)"
              />

              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={backupOptions["TRACNGHIEM4"]}
                    onChange={() => toggleOption("TRACNGHIEM4")}
                  />
                }
                label="Lớp 4 (CTST)"
              />

              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={backupOptions["TRACNGHIEM5"]}
                    onChange={() => toggleOption("TRACNGHIEM5")}
                  />
                }
                label="Lớp 5 (CTST)"
              />

              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={backupOptions["TRACNGHIEM3_New"]}
                    onChange={() => toggleOption("TRACNGHIEM3_New")}
                  />
                }
                label="Lớp 3 (KNTT)"
              />

              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={backupOptions["TRACNGHIEM4_New"]}
                    onChange={() => toggleOption("TRACNGHIEM4_New")}
                  />
                }
                label="Lớp 4 (KNTT)"
              />

              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={backupOptions["TRACNGHIEM5_New"]}
                    onChange={() => toggleOption("TRACNGHIEM5_New")}
                  />
                }
                label="Lớp 5 (KNTT)"
              />

            </Box>
          </Box>

        </Stack>
      </DialogContent>

      {/* PROGRESS */}
      {loading && (
        <>
          <Box sx={{ width: "50%", mx: "auto", mt: 3 }}>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
          <Typography align="center">{progress}%</Typography>
        </>
      )}

      {/* ACTION */}
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          variant="contained"
          startIcon={<BackupIcon />}
          onClick={handleBackup}
          disabled={loading}
        >
          Sao lưu
        </Button>
      </DialogActions>
    </Dialog>

    {/* SNACKBAR */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={4000}
      onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
    >
      <Alert severity={snackbar.severity}>
        {snackbar.message}
      </Alert>
    </Snackbar>
  </>
);
}
