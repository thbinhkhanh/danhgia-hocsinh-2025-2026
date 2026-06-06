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

export default function BackupPage({ open, onClose, config }) {
  const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");

  const BACKUP_KEYS = [
    // ===== HỌC SINH =====
    { key: `DANHSACH_${namHocKey}`, label: "Danh sách lớp" },
    { key: `DATA_${namHocKey}`, label: "Kết quả KTĐK" },
    { key: `DATA_ONTAP_${namHocKey}`, label: "Kết quả ôn tập" },

    // ===== ĐỀ KIỂM TRA =====
    { key: "NGANHANG_DE", label: "Ngân hàng đề KTĐK" },
    { key: "DETHI", label: "Đề chọn thi" },
    { key: "BAITAP_TUAN", label: "Bài tập tuần" },

    // ===== LUYỆN TẬP =====
    { key: "TRACNGHIEM3", label: "Lớp 3 (CTST)" },
    { key: "TRACNGHIEM4", label: "Lớp 4 (CTST)" },
    { key: "TRACNGHIEM5", label: "Lớp 5 (CTST)" },

    { key: "TRACNGHIEM3_New", label: "Lớp 3 (KNTT)" },
    { key: "TRACNGHIEM4_New", label: "Lớp 4 (KNTT)" },
    { key: "TRACNGHIEM5_New", label: "Lớp 5 (KNTT)" },
  ];

  const [backupOptions, setBackupOptions] = useState(() => {
    const init = {};
    for (const item of BACKUP_KEYS) {
      init[item.key] = true;
    }

    return init;
  });

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

  const fetchAllBackup = async (onProgress, selectedCollections, config) => {
    const DATA_KEY = `DATA_${namHocKey}`;
    const DANHSACH_KEY = `DANHSACH_${namHocKey}`;
    const ONTAP_KEY = `DATA_ONTAP_${namHocKey}`;

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

      // ❗ DATA + DANHSACH theo năm (KHÔNG còn raw nữa)
      const hasDATA = selectedCollections.includes(`DATA_${namHocKey}`);
      const hasONTAP = selectedCollections.includes(`DATA_ONTAP_${namHocKey}`);
      const hasDANHSACH = selectedCollections.includes(`DANHSACH_${namHocKey}`);

      const otherCollections = selectedCollections.filter(
        (c) =>
          c !== `DATA_${namHocKey}` &&
          c !== `DANHSACH_${namHocKey}` &&
          c !== `DATA_ONTAP_${namHocKey}`
      );

      const DATA_WEIGHT = hasDATA ? 50 : 0;
      const ONTAP_WEIGHT = hasONTAP ? 30 : 0;
      const OTHERS_WEIGHT = Math.max(0, 100 - DATA_WEIGHT - ONTAP_WEIGHT);

      const otherStep =
        otherCollections.length > 0
          ? OTHERS_WEIGHT / otherCollections.length
          : 0;

      // ================== NHÓM KHÁC DATA ==================
      for (const colName of otherCollections) {
        const snap = await getDocs(collection(db, colName));

        if (!backupData[colName]) backupData[colName] = {};

        snap.forEach((d) => {
          backupData[colName][d.id] = d.data();
        });

        progressCount += otherStep;
        if (onProgress)
          onProgress(Math.min(Math.round(progressCount), 99));
      }

      // ================== DANHSACH (THEO NĂM) ==================
      if (hasDANHSACH) {
        const snap = await getDocs(collection(db, "DANHSACH"));

        backupData[`DANHSACH_${namHocKey}`] = {};

        snap.forEach((d) => {
          backupData[`DANHSACH_${namHocKey}`][d.id] = d.data();
        });
      }

      // ================== DATA (THEO NĂM) ==================
      if (hasDATA) {
        backupData[`DATA_${namHocKey}`] = {};

        const classListSnap = await getDocs(collection(db, "DANHSACH"));
        const classList = classListSnap.docs.map((d) => d.id);

        const perClassStep = DATA_WEIGHT / (classList.length || 1);

        for (const classId of classList) {
          const classKey = classId.replace(".", "_");

          const studentsSnap = await getDocs(
            collection(db, "DATA", classKey, "HOCSINH")
          );

          backupData[`DATA_${namHocKey}`][classKey] = { HOCSINH: {} };

          studentsSnap.forEach((doc) => {
            backupData[`DATA_${namHocKey}`][classKey].HOCSINH[doc.id] =
              doc.data();
          });

          progressCount += perClassStep;
          onProgress?.(Math.round(progressCount));
        }
      }

      // ================== ONTAP (THEO NĂM) ==================
      if (hasONTAP) {
        backupData[`DATA_ONTAP_${namHocKey}`] = {};

        const classListSnap = await getDocs(collection(db, "DANHSACH"));
        const classList = classListSnap.docs.map((d) => d.id);

        const perClassStep = ONTAP_WEIGHT / (classList.length || 1);

        for (const classId of classList) {
          const classKey = classId.replace(".", "_");

          const studentSnap = await getDocs(
            collection(db, `DATA_ONTAP_${namHocKey}`, classKey, "HOCSINH")
          );

          backupData[`DATA_ONTAP_${namHocKey}`][classKey] = {
            HOCSINH: {},
          };

          studentSnap.forEach((s) => {
            backupData[`DATA_ONTAP_${namHocKey}`][classKey].HOCSINH[s.id] =
              s.data();
          });

          progressCount += perClassStep;
          onProgress?.(Math.round(progressCount));
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

    const dataKey = `DATA_${namHocKey}`;
    const ontapKey = `DATA_ONTAP_${namHocKey}`;

    let selected = Object.keys(backupOptions).filter(
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

      // 🔥 export đúng dữ liệu đã chọn (đã include ONTAP nếu cần)
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

  const GROUPS = {
    HOCSINH: [
      `DANHSACH_${namHocKey}`,
      `DATA_${namHocKey}`,
      `DATA_ONTAP_${namHocKey}`,
    ],
    DETHI: ["NGANHANG_DE", "DETHI", "BAITAP_TUAN"],
    TRACNGHIEM: [
      "TRACNGHIEM3",
      "TRACNGHIEM4",
      "TRACNGHIEM5",
      "TRACNGHIEM3_New",
      "TRACNGHIEM4_New",
      "TRACNGHIEM5_New",
    ],
  };

  const isGroupChecked = (groupKeys) =>
    groupKeys.every((k) => backupOptions[k]);

  const isGroupIndeterminate = (groupKeys) => {
    const checkedCount = groupKeys.filter((k) => backupOptions[k]).length;
    return checkedCount > 0 && checkedCount < groupKeys.length;
  };

  const toggleGroup = (groupKeys) => {
    const allChecked = isGroupChecked(groupKeys);

    const newState = {};
    groupKeys.forEach((k) => {
      newState[k] = !allChecked;
    });

    setBackupOptions((prev) => ({ ...prev, ...newState }));
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
            overflow: "hidden",
            bgcolor: "#f8fafc",
          },
        }}
      >
        {/* ===== HEADER (style mới) ===== */}
        <Box
          sx={{
            px: 3,
            py: 1.5,
            background: "#1976d2",
            color: "#fff",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                SAO LƯU DỮ LIỆU
              </Typography>
            </Box>

            <IconButton
              onClick={onClose}
              sx={{
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                transition: "all .2s ease",

                "&:hover": {
                  bgcolor: "#fff",
                  color: "#ef4444",
                  transform: "scale(1.05)",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* ===== CONTENT ===== */}
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={2.2}>

            {/* ===== HỌC SINH ===== */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={isGroupChecked(GROUPS.HOCSINH)}
                    indeterminate={isGroupIndeterminate(GROUPS.HOCSINH)}
                    onChange={() => toggleGroup(GROUPS.HOCSINH)}
                  />
                }
                label={
                  <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                    Học sinh
                  </Typography>
                }
              />

              <Box sx={{ ml: 3, mt: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
                <FormControlLabel
                  sx={{ ml: 0 }}
                  control={
                    <Checkbox
                      checked={backupOptions[`DANHSACH_${namHocKey}`]}
                      onChange={() => toggleOption(`DANHSACH_${namHocKey}`)}
                    />
                  }
                  label="Danh sách lớp"
                />

                <FormControlLabel
                  sx={{ ml: 0 }}
                  control={
                    <Checkbox
                      checked={backupOptions[`DATA_${namHocKey}`]}
                      onChange={() => toggleOption(`DATA_${namHocKey}`)}
                    />
                  }
                  label="Kết quả KTĐK"
                />

                <FormControlLabel
                  sx={{ ml: 0 }}
                  control={
                    <Checkbox
                      checked={backupOptions[`DATA_ONTAP_${namHocKey}`]}
                      onChange={() => toggleOption(`DATA_ONTAP_${namHocKey}`)}
                    />
                  }
                  label="Kết quả ôn tập"
                />
              </Box>
            </Box>

            {/* ===== ĐỀ KIỂM TRA ===== */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={isGroupChecked(GROUPS.DETHI)}
                    indeterminate={isGroupIndeterminate(GROUPS.DETHI)}
                    onChange={() => toggleGroup(GROUPS.DETHI)}
                  />
                }
                label={
                  <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                    Đề kiểm tra
                  </Typography>
                }
              />

              <Box sx={{ ml: 3, mt: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
                <FormControlLabel
                  sx={{ ml: 0 }}
                  control={
                    <Checkbox
                      checked={backupOptions["NGANHANG_DE"]}
                      onChange={() => toggleOption("NGANHANG_DE")}
                    />
                  }
                  label="Ngân hàng đề KTĐK"
                />

                <FormControlLabel
                  sx={{ ml: 0 }}
                  control={
                    <Checkbox
                      checked={backupOptions["DETHI"]}
                      onChange={() => toggleOption("DETHI")}
                    />
                  }
                  label="Đề chọn thi"
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

            {/* ===== LUYỆN TẬP ===== */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={isGroupChecked(GROUPS.TRACNGHIEM)}
                    indeterminate={isGroupIndeterminate(GROUPS.TRACNGHIEM)}
                    onChange={() => toggleGroup(GROUPS.TRACNGHIEM)}
                  />
                }
                label={
                  <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                    Luyện tập tin học
                  </Typography>
                }
              />

              <Box sx={{ ml: 3, mt: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
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

        {/* ===== PROGRESS ===== */}
        {loading && (
          <Box sx={{ px: 3, pb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 10,
              }}
            />
            <Typography
              sx={{
                mt: 1,
                textAlign: "center",
                fontSize: 13,
                color: "#64748b",
              }}
            >
              Đang sao lưu... {progress}%
            </Typography>
          </Box>
        )}

        {/* ===== ACTION ===== */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e2e8f0",
            bgcolor: "#fff",
          }}
        >
          <Button onClick={onClose}>Hủy</Button>

          <Button
            variant="contained"
            startIcon={<BackupIcon />}
            onClick={handleBackup}
            disabled={loading}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              boxShadow: "none",
              "&:hover": { boxShadow: "none" },
            }}
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
