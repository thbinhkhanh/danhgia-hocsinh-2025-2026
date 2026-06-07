import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Dialog,
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
  Card
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import RestoreIcon from "@mui/icons-material/Restore";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { doc, setDoc } from "firebase/firestore";

import { db } from "../firebase";
import { ConfigContext } from "../context/ConfigContext";

export default function RestorePage({ open, onClose }) {
  const fileInputRef = useRef(null);

  const { config } = useContext(ConfigContext);

  const namHocKey = (config?.namHoc || "2025-2026").replace(/-/g, "_");

  const BACKUP_KEYS = [
    // ===== HỌC SINH =====
    { key: `DANHSACH_${namHocKey}`, label: "Danh sách lớp" },
    { key: `DATA_${namHocKey}`, label: "Kết quả đánh giá" },
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

  // reset khi mở dialog
  useEffect(() => {
    if (open) {
      const init = {};
      const dis = {};

      BACKUP_KEYS.forEach(({ key }) => {
        init[key] = false;
        dis[key] = true;
      });

      setRestoreOptions(init);
      setDisabledOptions(dis);
      setSelectedFile(null);
      setProgress(0);
      setLoading(false);

      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const toggleOption = (key) => {
    setRestoreOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ================= ĐỌC FILE BACKUP =================
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const newChecked = {};
      const newDisabled = {};

      BACKUP_KEYS.forEach(({ key }) => {
        const data = json?.[key];

        const hasData =
          data &&
          typeof data === "object" &&
          Object.keys(data).length > 0;

        newChecked[key] = hasData;
        newDisabled[key] = !hasData;
      });

      setRestoreOptions(newChecked);
      setDisabledOptions(newDisabled);
    } catch (err) {
      console.error(err);

      setSnackbar({
        open: true,
        severity: "error",
        message: "❌ File backup không hợp lệ",
      });
    }
  };

  // ================= RESTORE =================
  const handleRestore = async () => {
    const selectedKeys = Object.keys(restoreOptions)
      .filter((k) => restoreOptions[k]);

    const VALID_KEYS = [
      `DANHSACH_${namHocKey}`,
      `DATA_${namHocKey}`,
      `DATA_ONTAP_${namHocKey}`,

      "NGANHANG_DE",
      "DETHI",
      "BAITAP_TUAN",
      "TRACNGHIEM3",
      "TRACNGHIEM4",
      "TRACNGHIEM5",
      "TRACNGHIEM3_New",
      "TRACNGHIEM4_New",
      "TRACNGHIEM5_New",
    ];

    if (!selectedFile) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "Vui lòng chọn file backup",
      });
      return;
    }

    if (selectedKeys.length === 0) {
      setSnackbar({
        open: true,
        severity: "warning",
        message: "Chọn ít nhất 1 nhóm dữ liệu",
      });
      return;
    }

    try {
      setLoading(true);
      setProgress(0);

      const text = await selectedFile.text();
      const jsonDataRaw = JSON.parse(text);

      const jsonData = Object.fromEntries(
        Object.entries(jsonDataRaw).filter(([k]) =>
          VALID_KEYS.includes(k)
        )
      );

      let totalDocs = 0;

      // ================= ĐẾM TỔNG =================
      const effectiveKeys = selectedKeys.filter((k) => jsonData[k]);

      for (const key of effectiveKeys) {
        const docs = jsonData[key];

        if (!docs) continue;

        if (key === `DATA_${namHocKey}`) {
          for (const c of Object.keys(docs)) {
            totalDocs += Object.keys(
              docs[c]?.HOCSINH || {}
            ).length;
          }
        } else if (key === `DATA_ONTAP_${namHocKey}`) {
          for (const c of Object.keys(docs)) {
            totalDocs += Object.keys(
              docs[c]?.HOCSINH || {}
            ).length;
          }
        } else {
          totalDocs += Object.keys(docs).length;
        }
      }

      let done = 0;

      // ================= RESTORE =================
      for (const key of selectedKeys) {
        const docs = jsonData[key];

        if (!docs) continue;

        // ===== DATA (gộp luôn ONTAP xử lý riêng) =====
        if (key === `DATA_${namHocKey}` || key === `DATA_ONTAP_${namHocKey}`) {
          for (const classId of Object.keys(docs)) {
            const hsObj = docs[classId]?.HOCSINH || {};

            await Promise.all(
              Object.keys(hsObj).map(async (studentId) => {
                await setDoc(
                  doc(db, key, classId, "HOCSINH", studentId),
                  hsObj[studentId],
                  { merge: true }
                );

                done++;
                setProgress(Math.min(100, Math.round((done / totalDocs) * 100)));
              })
            );
          }
        }

        // ===== COLLECTION THƯỜNG =====
        else {
          await Promise.all(
            Object.keys(docs).map(async (docId) => {
              await setDoc(doc(db, key, docId), docs[docId], {
                merge: true,
              });

              done++;
              setProgress(Math.min(100, Math.round((done / totalDocs) * 100)));
            })
          );
        }
      }

      setProgress(100);

      setSnackbar({
        open: true,
        severity: "success",
        message: "✅ Phục hồi dữ liệu thành công",
      });

      onClose();
    } catch (err) {
      console.error(err);

      setSnackbar({
        open: true,
        severity: "error",
        message: "❌ Lỗi khi phục hồi dữ liệu",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasAnyChecked = Object.values(restoreOptions).some(Boolean);

  // ================= GROUPS =================
  const GROUPS = {
    HOCSINH: [
      `DANHSACH_${namHocKey}`,
      `DATA_${namHocKey}`,
      `DATA_ONTAP_${namHocKey}`, // 👈 THÊM MỚI
    ],

    DETHI: [
      "NGANHANG_DE",
      "DETHI",
      "BAITAP_TUAN",
    ],

    TRACNGHIEM: [
      "TRACNGHIEM3",
      "TRACNGHIEM4",
      "TRACNGHIEM5",
      "TRACNGHIEM3_New",
      "TRACNGHIEM4_New",
      "TRACNGHIEM5_New",
    ],
  };

  const getEnabledKeys = (keys) =>
    keys.filter((k) => !disabledOptions[k]);

  const isGroupChecked = (keys) => {
    const enabled = getEnabledKeys(keys);

    return (
      enabled.length > 0 &&
      enabled.every((k) => restoreOptions[k])
    );
  };

  const isGroupIndeterminate = (keys) => {
    const enabled = getEnabledKeys(keys);

    const checked = enabled.filter(
      (k) => restoreOptions[k]
    ).length;

    return checked > 0 && checked < enabled.length;
  };

  const toggleGroup = (keys) => {
    const enabled = getEnabledKeys(keys);

    const allChecked = enabled.every(
      (k) => restoreOptions[k]
    );

    const newState = {};

    enabled.forEach((k) => {
      newState[k] = !allChecked;
    });

    setRestoreOptions((prev) => ({
      ...prev,
      ...newState,
    }));
  };

  return (
  <>
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#e3f2fd",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        //pt: 3,
      }}
    >
      {/* ===== CARD WRAPPER ===== */}
      <Card
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 900,
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "#f8fafc",
        }}
      >
        {/* ===== HEADER ===== */}
        <Box
          sx={{
            px: 3,
            pr: 1.5, // 12px
            py: 1.4,
            background: "#1976d2",
            color: "#fff",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
              PHỤC HỒI DỮ LIỆU
            </Typography>

            <IconButton
              onClick={onClose}
              sx={{
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                "&:hover": {
                  bgcolor: "#fff",
                  color: "#ef4444",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* ===== UPLOAD ===== */}
        <Box sx={{ px: 3, pt: 2 }}>
          <Box
            onClick={() => fileInputRef.current.click()}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1.2,
              border: "1px solid #94a3b8",
              borderRadius: "10px",
              cursor: "pointer",
              bgcolor: "#fff",
              "&:hover": {
                borderColor: "#1976d2",
                bgcolor: "#f1f5f9",
              },
            }}
          >
            <UploadFileIcon sx={{ color: "#1976d2" }} />

            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
              Chọn file phục hồi (.json)
            </Typography>
          </Box>

          <input
            hidden
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          {selectedFile && (
            <Typography sx={{ mt: 1, fontWeight: 600, color: "#ef4444" }}>
              📄 {selectedFile.name}
            </Typography>
          )}
        </Box>

        {/* ===== CONTENT (3 CỘT) ===== */}
        <Box sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2.2}>

            {/* ===== HỌC SINH ===== */}
            <Box sx={{ p: 2, bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, flex: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isGroupChecked(GROUPS.HOCSINH)}
                    indeterminate={isGroupIndeterminate(GROUPS.HOCSINH)}
                    onChange={() => toggleGroup(GROUPS.HOCSINH)}
                  />
                }
                label={<Typography fontWeight={700}>Học sinh</Typography>}
              />

              <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
                {GROUPS.HOCSINH.map((key) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={restoreOptions[key] || false}
                        disabled={disabledOptions[key]}
                        onChange={() => toggleOption(key)}
                      />
                    }
                    label={BACKUP_KEYS.find((b) => b.key === key)?.label || key}
                  />
                ))}
              </Box>
            </Box>

            {/* ===== ĐỀ THI ===== */}
            <Box sx={{ p: 2, bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, flex: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isGroupChecked(GROUPS.DETHI)}
                    indeterminate={isGroupIndeterminate(GROUPS.DETHI)}
                    onChange={() => toggleGroup(GROUPS.DETHI)}
                    disabled={getEnabledKeys(GROUPS.DETHI).length === 0}
                  />
                }
                label={<Typography fontWeight={700}>Đề kiểm tra</Typography>}
              />

              <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
                {GROUPS.DETHI.map((key) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={restoreOptions[key] || false}
                        disabled={disabledOptions[key]}
                        onChange={() => toggleOption(key)}
                      />
                    }
                    label={BACKUP_KEYS.find((b) => b.key === key)?.label || key}
                  />
                ))}
              </Box>
            </Box>

            {/* ===== LUYỆN TẬP ===== */}
            <Box sx={{ p: 2, bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, flex: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isGroupChecked(GROUPS.TRACNGHIEM)}
                    indeterminate={isGroupIndeterminate(GROUPS.TRACNGHIEM)}
                    onChange={() => toggleGroup(GROUPS.TRACNGHIEM)}
                    disabled={getEnabledKeys(GROUPS.TRACNGHIEM).length === 0}
                  />
                }
                label={<Typography fontWeight={700}>Luyện tập tin học</Typography>}
              />

              <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
                {GROUPS.TRACNGHIEM.map((key) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={restoreOptions[key] || false}
                        disabled={disabledOptions[key]}
                        onChange={() => toggleOption(key)}
                      />
                    }
                    label={BACKUP_KEYS.find((b) => b.key === key)?.label || key}
                  />
                ))}
              </Box>
            </Box>

          </Stack>
        </Box>

        {/* ===== PROGRESS ===== */}
        {loading && (
          <Box
            sx={{
              px: 3,
              pb: 2,
              mt: 2,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Box sx={{ width: { xs: "75%", md: "50%" } }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 8, borderRadius: 10 }}
              />

              <Typography sx={{ mt: 1, textAlign: "center", fontSize: 13 }}>
                Đang phục hồi... {progress}%
              </Typography>
            </Box>
          </Box>
        )}

        {/* ===== ACTION ===== */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e2e8f0",
            bgcolor: "#fff",
          }}
        >
          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button
              onClick={onClose}
              sx={{
                textTransform: "none",
              }}
            >
              Hủy
            </Button>

            <Button
              variant="contained"
              startIcon={<RestoreIcon />}
              onClick={handleRestore}
              disabled={loading || !hasAnyChecked}
              sx={{
                textTransform: "none",
                borderRadius: "12px",
                fontWeight: 700,
                boxShadow: "none",
                px: 2.5,
                py: 1,

                "&:hover": {
                  boxShadow: "none",
                },
              }}
            >
              Phục hồi
            </Button>
          </Stack>
        </Box>
      </Card>
    </Box>

    {/* SNACKBAR */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={4000}
      onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert severity={snackbar.severity}>
        {snackbar.message}
      </Alert>
    </Snackbar>
  </>
);
}