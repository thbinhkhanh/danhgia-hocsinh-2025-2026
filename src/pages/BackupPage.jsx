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

  // 🔹 bổ sung từ 2 hàm trước
  { key: "LAMVANBEN", label: "Cấu hình & Lớp Lâm Văn Bền" },
  { key: "MATKHAU", label: "Mật khẩu tài khoản" },
  { key: "DETHI_LVB", label: "Đề đã chọn LVB" },
  { key: "DETHI_BK", label: "Đề đã chọn BK" },
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

 const [groupOptions, setGroupOptions] = useState({
  configGroup: ["CONFIG","LAMVANBEN","MATKHAU","DANHSACH"].every(k => backupOptions[k]),
  bankGroup: ["TRACNGHIEM_BK","TRACNGHIEM_LVB","BAITAP_TUAN"].every(k => backupOptions[k]),
  examGroup: ["DETHI_BK","DETHI_LVB"].every(k => backupOptions[k]),
  resultGroup: ["KTDK","DGTX"].every(k => backupOptions[k]),
});


  const toggleOption = (key) => {
    setBackupOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ----- Hàm export JSON -----
  const exportBackupToJson = (data, backupOptions) => {
    if (!data || Object.keys(data).length === 0) return;

    // Định nghĩa các nhóm theo checkbox
    const GROUPS = {
      "Cauhinh": ["CONFIG", "LAMVANBEN", "MATKHAU", "DANHSACH"],
      "Nganhangde": ["TRACNGHIEM_BK", "TRACNGHIEM_LVB", "BAITAP_TUAN"],
      "Dethi": ["DETHI_BK", "DETHI_LVB"],
      "Ketqua": ["KTDK", "DGTX"],
    };

    // Lọc các nhóm có ít nhất 1 checkbox được chọn
    const selectedGroups = Object.entries(GROUPS)
      .filter(([groupName, keys]) => keys.some((k) => backupOptions[k])) // nếu có ít nhất 1 key được chọn
      .map(([groupName]) => groupName); // lấy tên nhóm

    // Nếu tất cả nhóm đều được chọn -> đặt tên gọn "full"
    const collectionsName =
      selectedGroups.length === Object.keys(GROUPS).length
        ? "full"
        : selectedGroups.join("_");

    // Format thời gian: dd-MM-yy (hh:mm:ss)
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const day = pad(now.getDate());
    const month = pad(now.getMonth() + 1);
    const year = now.getFullYear().toString().slice(-2);
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    const timestamp = `${day}-${month}-${year} (${hours}:${minutes}:${seconds})`;

    // Tạo file JSON và tải xuống
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

        // 4️⃣ Collection phẳng: DANHSACH, CONFIG, LAMVANBEN, MATKHAU, DETHI_LVB, DETHI_BK
        else if (["DANHSACH", "CONFIG", "LAMVANBEN", "MATKHAU", "DETHI_LVB", "DETHI_BK"].includes(colName)) {
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

  const getGroupState = (keys) => {
    const values = keys.map(k => backupOptions[k] || false);
    const allChecked = values.every(v => v === true);
    const allUnchecked = values.every(v => v === false);
    return {
      checked: allChecked,
      indeterminate: !allChecked && !allUnchecked
    };
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
                SAO LƯU DỮ LIỆU
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
          <Stack spacing={1}>            
            {/* ====== 1️⃣ Cấu hình ====== */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>
                Cấu hình
              </Typography>
              <Checkbox
                {...getGroupState(["CONFIG","LAMVANBEN","MATKHAU","DANHSACH"])}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setBackupOptions(prev => ({
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
              <FormControlLabel control={<Checkbox checked={backupOptions["CONFIG"]} onChange={() => toggleOption("CONFIG")} />} label="Cấu hình Bình Khánh" />
              <FormControlLabel control={<Checkbox checked={backupOptions["LAMVANBEN"]} onChange={() => toggleOption("LAMVANBEN")} />} label="Cấu hình Lâm Văn Bền" />
              <FormControlLabel control={<Checkbox checked={backupOptions["MATKHAU"]} onChange={() => toggleOption("MATKHAU")} />} label="Mật khẩu tài khoản" />
              <FormControlLabel control={<Checkbox checked={backupOptions["DANHSACH"]} onChange={() => toggleOption("DANHSACH")} />} label="Danh sách lớp BK" />
            </Box>
            <Divider sx={{ mt: 1, mb: 1 }} />

            {/* ====== 2️⃣ Ngân hàng đề ====== */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>
                Ngân hàng đề
              </Typography>
              <Checkbox
                {...getGroupState(["TRACNGHIEM_BK","TRACNGHIEM_LVB","BAITAP_TUAN"])}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setBackupOptions(prev => ({
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
              <FormControlLabel control={<Checkbox checked={backupOptions["TRACNGHIEM_BK"]} onChange={() => toggleOption("TRACNGHIEM_BK")} />} label="Đề KTĐK Bình Khánh" />
              <FormControlLabel control={<Checkbox checked={backupOptions["TRACNGHIEM_LVB"]} onChange={() => toggleOption("TRACNGHIEM_LVB")} />} label="Đề KTĐK Lâm Văn Bền" />
              <FormControlLabel control={<Checkbox checked={backupOptions["BAITAP_TUAN"]} onChange={() => toggleOption("BAITAP_TUAN")} />} label="Bài tập tuần" />
            </Box>
            <Divider sx={{ mt: 1, mb: 1 }} />

            {/* ====== 3️⃣ Đề thi ====== */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>
                Đề thi
              </Typography>
              <Checkbox
                {...getGroupState(["DETHI_BK","DETHI_LVB"])}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setBackupOptions(prev => ({
                    ...prev,
                    DETHI_BK: checked,
                    DETHI_LVB: checked
                  }));
                }}
                sx={{ ml: 1 }}
              />
            </Box>
            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
              <FormControlLabel control={<Checkbox checked={backupOptions["DETHI_BK"]} onChange={() => toggleOption("DETHI_BK")} />} label="Đề thi Bình Khánh" />
              <FormControlLabel control={<Checkbox checked={backupOptions["DETHI_LVB"]} onChange={() => toggleOption("DETHI_LVB")} />} label="Đề thi Lâm Văn Bền" />
            </Box>
            <Divider sx={{ mt: 1, mb: 1 }} />

            {/* ====== 4️⃣ Kết quả ====== */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Typography sx={{ fontSize: "1rem", fontWeight: "bold", color: "error.main" }}>
                Kết quả
              </Typography>
              <Checkbox
                {...getGroupState(["KTDK","DGTX"])}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setBackupOptions(prev => ({
                    ...prev,
                    KTDK: checked,
                    DGTX: checked
                  }));
                }}
                sx={{ ml: 1 }}
              />
            </Box>
            <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
              <FormControlLabel control={<Checkbox checked={backupOptions["KTDK"]} onChange={() => toggleOption("KTDK")} />} label="Kết quả KTĐK" />
              <FormControlLabel control={<Checkbox checked={backupOptions["DGTX"]} onChange={() => toggleOption("DGTX")} />} label="Kết quả ĐGTX" />
            </Box>

            {loading && (
              <>
                <LinearProgress variant="determinate" value={progress} sx={{ mt: 2 }} />
                <Typography variant="body2" align="center" color="text.secondary">
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
