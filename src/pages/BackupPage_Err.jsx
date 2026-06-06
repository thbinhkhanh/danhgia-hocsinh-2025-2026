import React, { useEffect, useRef, useState } from "react";
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
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import RestoreIcon from "@mui/icons-material/Restore";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function RestorePage({
  open,
  onClose,
  namHoc = "2025-2026",
}) {
  // ================= NAM HỌC =================
  const namHocKey = namHoc.replace(/-/g, "_");

  // ================= BACKUP KEYS =================
  const BACKUP_KEYS = [
    // ===== HỌC SINH =====
    {
      key: `DANHSACH_${namHocKey}`,
      label: "Danh sách lớp",
    },
    {
      key: `DATA_${namHocKey}`,
      label: "Kết quả đánh giá",
    },

    // ===== ĐỀ KIỂM TRA =====
    { key: "BAITAP_TUAN", label: "Bài tập tuần" },
    { key: "NGANHANG_DE", label: "Ngân hàng đề KTĐK" },
    { key: "DETHI", label: "Đề chọn thi" },

    // ===== LUYỆN TẬP =====
    { key: "TRACNGHIEM3", label: "Lớp 3 (CTST)" },
    { key: "TRACNGHIEM4", label: "Lớp 4 (CTST)" },
    { key: "TRACNGHIEM5", label: "Lớp 5 (CTST)" },

    { key: "TRACNGHIEM3_New", label: "Lớp 3 (KNTT)" },
    { key: "TRACNGHIEM4_New", label: "Lớp 4 (KNTT)" },
    { key: "TRACNGHIEM5_New", label: "Lớp 5 (KNTT)" },
  ];

  // ================= GROUPS =================
  const GROUPS = {
    HOCSINH: [
      `DANHSACH_${namHocKey}`,
      `DATA_${namHocKey}`,
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

  // ================= RESET =================
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

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  // ================= TOGGLE =================
  const toggleOption = (key) => {
    setRestoreOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ================= ĐỌC FILE =================
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
    const VALID_KEYS = BACKUP_KEYS.map((k) => k.key);

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

      const jsonData = Object.fromEntries(
        Object.entries(jsonDataRaw).filter(([k]) =>
          VALID_KEYS.includes(k)
        )
      );

      let totalDocs = 0;

      // ================= ĐẾM TỔNG =================
      const effectiveKeys = selectedKeys.filter(
        (k) => jsonData[k]
      );

      for (const key of effectiveKeys) {
        const docs = jsonData[key];

        // ===== DATA =====
        if (key === `DATA_${namHocKey}`) {
          for (const c of Object.keys(docs)) {
            totalDocs += Object.keys(
              docs[c]?.HOCSINH || {}
            ).length;
          }
        }

        // ===== COLLECTION KHÁC =====
        else {
          totalDocs += Object.keys(docs).length;
        }
      }

      let done = 0;

      // ================= RESTORE =================
      for (const key of selectedKeys) {
        const docs = jsonData[key];

        if (!docs) continue;

        // ================= DATA =================
        if (key === `DATA_${namHocKey}`) {
          for (const classId of Object.keys(docs)) {
            const hsObj =
              docs[classId]?.HOCSINH || {};

            await Promise.all(
              Object.keys(hsObj).map(async (studentId) => {
                await setDoc(
                  doc(
                    db,
                    `DATA_${namHocKey}`,
                    classId,
                    "HOCSINH",
                    studentId
                  ),
                  hsObj[studentId],
                  { merge: true }
                );

                done++;

                setProgress(
                  Math.round((done / totalDocs) * 100)
                );
              })
            );
          }
        }

        // ================= COLLECTION THƯỜNG =================
        else {
          await Promise.all(
            Object.keys(docs).map(async (docId) => {
              await setDoc(
                doc(db, key, docId),
                docs[docId],
                { merge: true }
              );

              done++;

              setProgress(
                Math.round((done / totalDocs) * 100)
              );
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

  // ================= GROUP HELPERS =================
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

  const hasAnyChecked =
    Object.values(restoreOptions).some(Boolean);

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
        {/* ================= HEADER ================= */}
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
            <Typography
              sx={{
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              PHỤC HỒI DỮ LIỆU
            </Typography>

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

        {/* ================= UPLOAD ================= */}
        <Box sx={{ px: 3, pt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() =>
              fileInputRef.current.click()
            }
            sx={{
              borderRadius: 2,
              textTransform: "none",
            }}
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
            <Typography
              sx={{
                mt: 1,
                color: "#ef4444",
                fontWeight: 600,
              }}
            >
              📄 {selectedFile.name}
            </Typography>
          )}
        </Box>

        {/* ================= CONTENT ================= */}
        <DialogContent
          sx={{ px: 3, py: 2.5 }}
        >
          <Stack spacing={2.2}>
            {/* ================= HỌC SINH ================= */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
              }}
            >
              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={isGroupChecked(
                      GROUPS.HOCSINH
                    )}
                    indeterminate={isGroupIndeterminate(
                      GROUPS.HOCSINH
                    )}
                    onChange={() =>
                      toggleGroup(
                        GROUPS.HOCSINH
                      )
                    }
                    disabled={
                      getEnabledKeys(
                        GROUPS.HOCSINH
                      ).length === 0
                    }
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    Học sinh
                  </Typography>
                }
              />

              <Box
                sx={{
                  ml: 3,
                  mt: 0.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        restoreOptions[
                          `DANHSACH_${namHocKey}`
                        ] || false
                      }
                      disabled={
                        disabledOptions[
                          `DANHSACH_${namHocKey}`
                        ]
                      }
                      onChange={() =>
                        toggleOption(
                          `DANHSACH_${namHocKey}`
                        )
                      }
                    />
                  }
                  label="Danh sách lớp"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        restoreOptions[
                          `DATA_${namHocKey}`
                        ] || false
                      }
                      disabled={
                        disabledOptions[
                          `DATA_${namHocKey}`
                        ]
                      }
                      onChange={() =>
                        toggleOption(
                          `DATA_${namHocKey}`
                        )
                      }
                    />
                  }
                  label="Kết quả đánh giá"
                />
              </Box>
            </Box>

            {/* ================= ĐỀ KIỂM TRA ================= */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
              }}
            >
              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={isGroupChecked(
                      GROUPS.DETHI
                    )}
                    indeterminate={isGroupIndeterminate(
                      GROUPS.DETHI
                    )}
                    onChange={() =>
                      toggleGroup(
                        GROUPS.DETHI
                      )
                    }
                    disabled={
                      getEnabledKeys(
                        GROUPS.DETHI
                      ).length === 0
                    }
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    Đề kiểm tra
                  </Typography>
                }
              />

              <Box
                sx={{
                  ml: 3,
                  mt: 0.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                }}
              >
                {GROUPS.DETHI.map((key) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={
                          restoreOptions[key] ||
                          false
                        }
                        disabled={
                          disabledOptions[key]
                        }
                        onChange={() =>
                          toggleOption(key)
                        }
                      />
                    }
                    label={
                      BACKUP_KEYS.find(
                        (b) => b.key === key
                      )?.label || key
                    }
                  />
                ))}
              </Box>
            </Box>

            {/* ================= TRẮC NGHIỆM ================= */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
              }}
            >
              <FormControlLabel
                sx={{ ml: 0 }}
                control={
                  <Checkbox
                    checked={isGroupChecked(
                      GROUPS.TRACNGHIEM
                    )}
                    indeterminate={isGroupIndeterminate(
                      GROUPS.TRACNGHIEM
                    )}
                    onChange={() =>
                      toggleGroup(
                        GROUPS.TRACNGHIEM
                      )
                    }
                    disabled={
                      getEnabledKeys(
                        GROUPS.TRACNGHIEM
                      ).length === 0
                    }
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    Luyện tập tin học
                  </Typography>
                }
              />

              <Box
                sx={{
                  ml: 3,
                  mt: 0.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                }}
              >
                {GROUPS.TRACNGHIEM.map((key) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={
                          restoreOptions[key] ||
                          false
                        }
                        disabled={
                          disabledOptions[key]
                        }
                        onChange={() =>
                          toggleOption(key)
                        }
                      />
                    }
                    label={
                      BACKUP_KEYS.find(
                        (b) => b.key === key
                      )?.label || key
                    }
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        {/* ================= PROGRESS ================= */}
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
              Đang phục hồi... {progress}%
            </Typography>
          </Box>
        )}

        {/* ================= ACTION ================= */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e2e8f0",
            bgcolor: "#fff",
          }}
        >
          <Button onClick={onClose}>
            Hủy
          </Button>

          <Button
            variant="contained"
            startIcon={<RestoreIcon />}
            onClick={handleRestore}
            disabled={
              loading || !hasAnyChecked
            }
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              boxShadow: "none",
            }}
          >
            PHỤC HỒI
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================= SNACKBAR ================= */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar((s) => ({
            ...s,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}