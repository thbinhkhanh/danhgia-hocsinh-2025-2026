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
  { key: "BAITAP_TUAN", label: "Bài tập tuần" },
  { key: "NGANHANG_DE", label: "Đề KTĐK Bình Khánh" },
  { key: "MATKHAU", label: "Mật khẩu tài khoản" },
  { key: "DETHI", label: "Đề thi Bình Khánh" },
  { key: "DATA", label: "Kết quả đánh giá" }, // Thay KETQUA_DANH_GIA
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

  const exportBackupToJson = (data, backupOptions) => {
    if (!data || Object.keys(data).length === 0) return;

    const selectedCollections = Object.keys(backupOptions).filter(
      (k) => backupOptions[k]
    );

    const collectionsName =
      selectedCollections.length === BACKUP_KEYS.length
        ? "full"
        : selectedCollections.join("_");

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now
      .getFullYear()
      .toString()
      .slice(-2)} (${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
      now.getSeconds()
    )})`;

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Backup_${collectionsName}_${timestamp}.json`;
    a.click();
  };

  const fetchAllBackup = async (onProgress, selectedCollections) => {
  try {
    const backupData = {};
    if (!selectedCollections || selectedCollections.length === 0) return {};

    let progressCount = 0;
    const hasDATA = selectedCollections.includes("DATA");
    const otherCollections = selectedCollections.filter((c) => c !== "DATA");

    // Tính phần trăm tiến trình cho từng nhóm
    const DATA_WEIGHT = hasDATA ? 80 : 0;
    const OTHERS_WEIGHT = hasDATA ? 20 : 100;

    const otherStep =
      otherCollections.length > 0
        ? OTHERS_WEIGHT / otherCollections.length
        : 0;

    // Duyệt theo thứ tự: các collection khác trước, sau đó DATA (để thanh tiến trình tăng mượt hơn)
    for (const colName of otherCollections) {
      // 1️⃣ Quiz
      if (["BAITAP_TUAN", "NGANHANG_DE"].includes(colName)) {
        const snap = await getDocs(collection(db, colName));
        if (!snap.empty) backupData[colName] = {};
        snap.forEach((d) => (backupData[colName][d.id] = d.data()));
      }

      // 2️⃣ Collection phẳng
      else if (["DANHSACH", "CONFIG", "MATKHAU", "DETHI"].includes(colName)) {
        const snap = await getDocs(collection(db, colName));
        if (!snap.empty) backupData[colName] = {};
        snap.forEach((d) => (backupData[colName][d.id] = d.data()));
      }

      // Cập nhật tiến trình cho collection này
      progressCount += otherStep;
      if (onProgress) onProgress(Math.min(Math.round(progressCount), 99));
    }

    // 3️⃣ DATA (Kết quả đánh giá) – chiếm 80% tiến trình
    if (hasDATA) {
      backupData.DATA = {};

      // Lấy danh sách lớp từ DANHSACH (ví dụ ["4.1","4.2",...])
      const classListSnap = await getDocs(collection(db, "DANHSACH"));
      const classList = classListSnap.docs.map((d) => d.id);

      // Nếu không có lớp, vẫn cập nhật tiến trình cho phần DATA
      if (classList.length === 0) {
        progressCount += DATA_WEIGHT;
        if (onProgress) onProgress(Math.min(Math.round(progressCount), 99));
      } else {
        // Mỗi lớp đóng góp một phần của 80%
        const perClassStep = DATA_WEIGHT / classList.length;

        for (const classId of classList) {
          const classKey = classId.replace(".", "_"); // đổi sang "4_1"
          const studentsSnap = await getDocs(collection(db, "DATA", classKey, "HOCSINH"));

          backupData.DATA[classKey] = { HOCSINH: {} };

          for (const studentDoc of studentsSnap.docs) {
            const studentId = studentDoc.id;
            const studentData = studentDoc.data();
            backupData.DATA[classKey].HOCSINH[studentId] = { ...studentData };
          }

          // Cập nhật tiến trình sau mỗi lớp
          progressCount += perClassStep;
          if (onProgress) onProgress(Math.min(Math.round(progressCount), 99));
        }
      }
    }

    // Hoàn tất
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
      exportBackupToJson(data, backupOptions);
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
          <DialogTitle
            sx={{
              p: 0,
              fontWeight: "bold",
              color: "#1565c0",
              flex: 1,
            }}
          >
            SAO LƯU DỮ LIỆU
          </DialogTitle>

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
          <Stack spacing={1}>
            {/* ====== Cấu hình ====== */}
            <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>
              Hệ thống
            </Typography>
            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={backupOptions["CONFIG"]}
                    onChange={() => toggleOption("CONFIG")}
                  />
                }
                label="Cấu hình"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={backupOptions["MATKHAU"]}
                    onChange={() => toggleOption("MATKHAU")}
                  />
                }
                label="Mật khẩu"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={backupOptions["DANHSACH"]}
                    onChange={() => toggleOption("DANHSACH")}
                  />
                }
                label="Danh sách lớp"
              />
            </Box>

            <Divider sx={{ mt: 1, mb: 1 }} />

            {/* ====== Ngân hàng đề ====== */}
            <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>
              Ngân hàng đề
            </Typography>
            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={backupOptions["BAITAP_TUAN"]}
                    onChange={() => toggleOption("BAITAP_TUAN")}
                  />
                }
                label="Bài tập tuần"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={backupOptions["NGANHANG_DE"]}
                    onChange={() => toggleOption("NGANHANG_DE")}
                  />
                }
                label="Đề KTĐK"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={backupOptions["DETHI"]}
                    onChange={() => toggleOption("DETHI")}
                  />
                }
                label="Đề thi"
              />
            </Box>

            <Divider sx={{ mt: 1, mb: 1 }} />

            {/* ====== Kết quả ====== */}
            <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>
              Kết quả
            </Typography>
            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={backupOptions["DATA"]}
                    onChange={() => toggleOption("DATA")}
                  />
                }
                label="Kết quả đánh giá"
              />
            </Box>
          </Stack>
        </DialogContent>

        {loading && (
          <>
            <Box sx={{ width: "50%", mx: "auto", mt: 3 }}>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Đang sao lưu... {progress}%
            </Typography>
          </>
        )}

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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
