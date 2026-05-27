import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Stack,
  Button,
  IconButton,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  LinearProgress,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import { db } from "../firebase";
import { getDocs, getDoc, collection, writeBatch, doc } from "firebase/firestore";

const CreateDataConfirmDialog = ({ open, onClose, configData }) => {
  const namHocKey = (configData?.namHoc || "2025-2026").replace("-", "_");

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState("update");
  const [disableConfirm, setDisableConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(false);
    setProgress(0);
    setMessage("");
    setSuccess(false);
    setMode("update");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const checkClassList = async () => {
      const classSnap = await getDocs(collection(db, `DANHSACH_${namHocKey}`));
      const hasData = classSnap.docs.some(
        (d) => Object.keys(d.data() || {}).length > 0
      );
      setDisableConfirm(!hasData);
    };

    checkClassList();
  }, [open, namHocKey]);

  const handleCreateDATA = async () => {
    try {
      setLoading(true);
      setProgress(0);
      setMessage("Đang xử lý...");

      const classSnap = await getDocs(collection(db, `DANHSACH_${namHocKey}`));
      const CLASS_LIST = classSnap.docs.map((d) => d.id);

      if (CLASS_LIST.length === 0) {
        setMessage("Không có lớp dữ liệu");
        setLoading(false);
        return;
      }

      let done = 0;

      for (const lop of CLASS_LIST) {
        const lopKey = lop.replace(".", "_");

        const dsSnap = await getDoc(doc(db, `DANHSACH_${namHocKey}`, lop));
        if (!dsSnap.exists()) continue;

        const danhSach = dsSnap.data();

        let existingHS = {};
        if (mode === "update") {
          const hsSnap = await getDocs(
            collection(db, `DATA_${namHocKey}`, lopKey, "HOCSINH")
          );
          hsSnap.forEach((d) => {
            existingHS[d.id] = d.data();
          });
        }

        const batch = writeBatch(db);

        for (const [maHS, hs] of Object.entries(danhSach)) {
          const hsRef = doc(
            db,
            `DATA_${namHocKey}`,
            lopKey,
            "HOCSINH",
            maHS
          );

          const old = existingHS[maHS] || {};

          const hsData =
            mode === "update"
              ? {
                  hoVaTen: hs.hoVaTen || old.hoVaTen || "",
                  stt: hs.stt ?? old.stt ?? null,
                  TinHoc: old.TinHoc || { dgtx: {}, ktdk: {} },
                  CongNghe: old.CongNghe || { dgtx: {}, ktdk: {} },
                }
              : {
                  hoVaTen: hs.hoVaTen || "",
                  stt: hs.stt || null,
                  TinHoc: { dgtx: {}, ktdk: {} },
                  CongNghe: { dgtx: {}, ktdk: {} },
                };

          batch.set(hsRef, hsData, { merge: true });
        }

        await batch.commit();

        done++;
        setProgress(Math.round((done / CLASS_LIST.length) * 100));
      }

      setSuccess(true);
      setMessage(
        mode === "new"
          ? "Tạo DATA thành công"
          : "Cập nhật DATA thành công"
      );
    } catch (err) {
      console.error(err);
      setMessage("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (loading) return;
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        onClose();
      }}
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "18px",
          overflow: "hidden",
          background: "#f8fafc",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 3,
          py: 2,
          color: "#fff",
          background: "linear-gradient(135deg, #1976d2, #42a5f5)",
          position: "relative",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              bgcolor: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            <WarningAmberRoundedIcon
              sx={{
                fontSize: 18,
                color: "#f59e0b",
              }}
            />
          </Box>

          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
            {disableConfirm
              ? "Cảnh báo"
              : mode === "new"
              ? "Tạo DATA"
              : "Cập nhật DATA"}
          </Typography>
        </Stack>

        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 10,
            top: 10,
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.15)",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.25)",
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent sx={{ px: 3, py: 4 }}>
        <Stack spacing={2} alignItems="center">

          {/* DISABLE */}
          {disableConfirm && (
            <Typography sx={{ color: "#d32f2f", textAlign: "center" }}>
              Không tìm thấy danh sách học sinh
            </Typography>
          )}

          {/* CONFIRM UI */}
          {!disableConfirm && !loading && !success && (
            <>
              <Typography sx={{ color: "#64748b", textAlign: "center" }}>
                <Typography
                  sx={{
                    color: "#64748b",
                    textAlign: "center",
                  }}
                >
                  Bạn muốn{" "}
                  {mode === "new"
                    ? "tạo mới"
                    : "cập nhật"}{" "}
                  dữ liệu năm học{" "}
                  <b>
                    {namHocKey.replace("_", "-")}
                  </b>
                  ?
                </Typography>
              </Typography>

              <FormControl
                sx={{
                  width: "100%",
                  pl: 5,
                  alignItems: "flex-start",
                }}
              >
                <FormLabel
                  sx={{
                    mb: 0.5,
                  }}
                >
                  Chọn kiểu
                </FormLabel>

                <RadioGroup
                  row
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value)
                  }
                  sx={{
                    justifyContent: "flex-start",
                  }}
                >
                  <FormControlLabel
                    value="new"
                    control={<Radio />}
                    label="Tạo mới"
                  />

                  <FormControlLabel
                    value="update"
                    control={<Radio />}
                    label="Cập nhật"
                  />
                </RadioGroup>
              </FormControl>
            </>
          )}

          {/* LOADING */}
          {loading && (
            <Box sx={{ width: "100%" }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography sx={{ mt: 1, fontSize: 13, textAlign: "center" }}>
                {message} ({progress}%)
              </Typography>
            </Box>
          )}

          {/* SUCCESS */}
          {success && (
            <Typography sx={{ color: "#1976d2", fontWeight: 700 }}>
              {message}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      {/* ACTIONS */}
      <Stack
        direction="row"
        spacing={2}
        justifyContent="center"
        sx={{ pb: 3 }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            minWidth: 110,
            height: 42,
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          {disableConfirm || success ? "Đóng" : "Hủy"}
        </Button>

        {!success && !loading && (
          <Button
            variant="contained"
            onClick={handleCreateDATA}
            disabled={disableConfirm}
            sx={{
              minWidth: 130,
              height: 42,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(135deg, #1976d2, #42a5f5)",
              boxShadow: "0 10px 20px rgba(25,118,210,0.25)",
              "&:hover": {
                background: "linear-gradient(135deg, #1565c0, #1976d2)",
              },
            }}
          >
            Xác nhận
          </Button>
        )}
      </Stack>
    </Dialog>
  );
};

export default CreateDataConfirmDialog;