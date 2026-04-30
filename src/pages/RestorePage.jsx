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

const BACKUP_KEYS = [
  
  // ===== HỌC SINH =====
  { key: "DANHSACH", label: "Danh sách lớp" },
  { key: "BAITAP_TUAN", label: "Bài tập tuần" },

  // ===== ĐỀ KIỂM TRA =====
  { key: "NGANHANG_DE", label: "Ngân hàng đề KTĐK" },
  { key: "DETHI", label: "Đề chọn thi" },
  { key: "DATA", label: "Kết quả đánh giá" },

  // ===== LUYỆN TẬP =====
  { key: "TRACNGHIEM3", label: "Lớp 3 (CTST)" },
  { key: "TRACNGHIEM4", label: "Lớp 4 (CTST)" },
  { key: "TRACNGHIEM5", label: "Lớp 5 (CTST)" },

  { key: "TRACNGHIEM3_New", label: "Lớp 3 (KNTT)" },
  { key: "TRACNGHIEM4_New", label: "Lớp 4 (KNTT)" },
  { key: "TRACNGHIEM5_New", label: "Lớp 5 (KNTT)" },
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
    setRestoreOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // đọc file backup
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

  // restore dữ liệu
  const handleRestore = async () => {
  // 🔥 chỉ cho phép các key đúng UI
  const VALID_KEYS = [
    "DANHSACH",
    "DATA",
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

  const selectedKeys = Object.keys(restoreOptions).filter(
    (k) => restoreOptions[k] && VALID_KEYS.includes(k)
  );

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

    // 🔥 lọc dữ liệu theo UI (tránh restore rác)
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

      if (key === "DATA") {
        for (const c of Object.keys(docs)) {
          totalDocs += Object.keys(docs[c]?.HOCSINH || {}).length;
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

      // ===== DATA =====
      if (key === "DATA") {
        for (const classId of Object.keys(docs)) {
          const hsObj = docs[classId]?.HOCSINH || {};

          await Promise.all(
            Object.keys(hsObj).map(async (studentId) => {
              await setDoc(
                doc(db, "DATA", classId, "HOCSINH", studentId),
                hsObj[studentId],
                { merge: true }
              );

              done++;
              setProgress(Math.round((done / totalDocs) * 100));
            })
          );
        }
      }

      // ===== TRẮC NGHIỆM =====
      else if (key.startsWith("TRACNGHIEM")) {
        await Promise.all(
          Object.keys(docs).map(async (docId) => {
            await setDoc(doc(db, key, docId), docs[docId], {
              merge: true,
            });

            done++;
            setProgress(Math.round((done / totalDocs) * 100));
          })
        );
      }

      // ===== COLLECTION THƯỜNG =====
      else {
        await Promise.all(
          Object.keys(docs).map(async (docId) => {
            await setDoc(doc(db, key, docId), docs[docId], {
              merge: true,
            });

            done++;
            setProgress(Math.round((done / totalDocs) * 100));
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

  const renderGroup = (title, keys) => (
    <>
      <Typography sx={{ fontWeight: "bold", color: "error.main" }}>
        {title}
      </Typography>

      <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
        {keys.map((key) => (
          <FormControlLabel
            key={key}
            control={
              <Checkbox
                checked={restoreOptions[key] || false}
                disabled={disabledOptions[key]}
                onChange={() => toggleOption(key)}
              />
            }
            label={
              BACKUP_KEYS.find((b) => b.key === key)?.label || key
            }
          />
        ))}
      </Box>

      <Divider sx={{ my: 1 }} />
    </>
  );

  const GROUPS = {
    HOCSINH: ["DANHSACH", "DATA"],
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

  const getEnabledKeys = (keys) =>
    keys.filter((k) => !disabledOptions[k]);

  const isGroupChecked = (keys) => {
    const enabled = getEnabledKeys(keys);
    return enabled.length > 0 && enabled.every((k) => restoreOptions[k]);
  };

  const isGroupIndeterminate = (keys) => {
    const enabled = getEnabledKeys(keys);
    const checked = enabled.filter((k) => restoreOptions[k]).length;

    return checked > 0 && checked < enabled.length;
  };

  const toggleGroup = (keys) => {
    const enabled = getEnabledKeys(keys);
    const allChecked = enabled.every((k) => restoreOptions[k]);

    const newState = {};
    enabled.forEach((k) => {
      newState[k] = !allChecked;
    });

    setRestoreOptions((prev) => ({ ...prev, ...newState }));
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
              fontSize: 18,
            }}
          >
            🔄
          </Box>

          <DialogTitle
            sx={{ p: 0, fontWeight: "bold", color: "#1565c0", flex: 1 }}
          >
            PHỤC HỒI DỮ LIỆU
          </DialogTitle>

          <IconButton
            onClick={onClose}
            sx={{
              color: "#f44336",
              "&:hover": { bgcolor: "rgba(244,67,54,0.1)" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* UPLOAD */}
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

        {/* CONTENT */}
        <DialogContent dividers>
          <Stack spacing={2}>
            {/* HỌC SINH */}
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isGroupChecked(GROUPS.HOCSINH)}
                    indeterminate={isGroupIndeterminate(GROUPS.HOCSINH)}
                    onChange={() => toggleGroup(GROUPS.HOCSINH)}
                    disabled={getEnabledKeys(GROUPS.HOCSINH).length === 0}
                  />
                }
                label={
                  <Typography sx={{ fontWeight: "bold", color: "error.main" }}>
                    Học sinh
                  </Typography>
                }
              />

              <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={restoreOptions["DANHSACH"] || false}
                      disabled={disabledOptions["DANHSACH"]}
                      onChange={() => toggleOption("DANHSACH")}
                    />
                  }
                  label="Danh sách lớp"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={restoreOptions["DATA"] || false}
                      disabled={disabledOptions["DATA"]}
                      onChange={() => toggleOption("DATA")}
                    />
                  }
                  label="Kết quả đánh giá"
                />
              </Box>
            </Box>

            <Divider />

            {/* ĐỀ KIỂM TRA */}
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isGroupChecked(GROUPS.DETHI)}
                    indeterminate={isGroupIndeterminate(GROUPS.DETHI)}
                    onChange={() => toggleGroup(GROUPS.DETHI)}
                    disabled={getEnabledKeys(GROUPS.DETHI).length === 0}
                  />
                }
                label={
                  <Typography sx={{ fontWeight: "bold", color: "error.main" }}>
                    Đề kiểm tra
                  </Typography>
                }
              />

              <Box sx={{ ml: 3, display: "flex", flexDirection: "column" }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={restoreOptions["NGANHANG_DE"] || false}
                      disabled={disabledOptions["NGANHANG_DE"]}
                      onChange={() => toggleOption("NGANHANG_DE")}
                    />
                  }
                  label="Ngân hàng đề KTĐK"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={restoreOptions["DETHI"] || false}
                      disabled={disabledOptions["DETHI"]}
                      onChange={() => toggleOption("DETHI")}
                    />
                  }
                  label="Đề chọn thi"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={restoreOptions["BAITAP_TUAN"] || false}
                      disabled={disabledOptions["BAITAP_TUAN"]}
                      onChange={() => toggleOption("BAITAP_TUAN")}
                    />
                  }
                  label="Bài tập tuần"
                />
              </Box>
            </Box>

            <Divider />

            {/* LUYỆN TẬP */}
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isGroupChecked(GROUPS.TRACNGHIEM)}
                    indeterminate={isGroupIndeterminate(GROUPS.TRACNGHIEM)}
                    onChange={() => toggleGroup(GROUPS.TRACNGHIEM)}
                    disabled={getEnabledKeys(GROUPS.TRACNGHIEM).length === 0}
                  />
                }
                label={
                  <Typography sx={{ fontWeight: "bold", color: "error.main" }}>
                    Luyện tập tin học
                  </Typography>
                }
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
                    label={
                      BACKUP_KEYS.find((b) => b.key === key)?.label || key
                    }
                  />
                ))}
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
            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Đang phục hồi... {progress}%
            </Typography>
          </>
        )}

        {/* ACTION */}
        <DialogActions sx={{ justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            variant="contained"
            startIcon={<RestoreIcon />}
            onClick={handleRestore}
            disabled={loading || !hasAnyChecked}
          >
            PHỤC HỒI
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
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