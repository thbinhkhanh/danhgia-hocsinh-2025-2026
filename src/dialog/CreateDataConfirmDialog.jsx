import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { db } from "../firebase";
import { getDocs, getDoc, collection, writeBatch, doc } from "firebase/firestore";

const CreateDataConfirmDialog = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState("update"); // "update" hoặc "new"
  const [disableConfirm, setDisableConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(false);
      setProgress(0);
      setMessage("");
      setSuccess(false);
      setMode("update");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const checkClassList = async () => {
      const classSnap = await getDocs(collection(db, "DANHSACH"));
      setDisableConfirm(classSnap.empty);
    };

    checkClassList();
  }, [open]);

  const handleCreateDATA = async () => {
  try {
    setLoading(true);
    setMessage(mode === "new" ? "🔄 Đang tạo dữ liệu mới..." : "🔄 Đang cập nhật dữ liệu...");
    setProgress(0);

    const classSnap = await getDocs(collection(db, "DANHSACH"));
    const CLASS_LIST = classSnap.docs.map(doc => doc.id);

    // ⛔ KIỂM TRA DANH SÁCH LỚP RỖNG
    if (CLASS_LIST.length === 0) {
      setMessage("⚠️ Không có lớp nào trong DANHSACH. Không thể tạo DATA.");
      setSuccess(false);
      setLoading(false);
      return;
    }

    let done = 0;

    for (const lop of CLASS_LIST) {
      const lopKey = lop.replace(".", "_");
      const dsSnap = await getDoc(doc(db, "DANHSACH", lop));
      if (!dsSnap.exists()) continue;
      const danhSach = dsSnap.data();

      // Lấy toàn bộ học sinh hiện có trong lớp nếu mode = "update"
      let existingHS = {};
      if (mode === "update") {
        const hsSnap = await getDocs(collection(db, "DATA", lopKey, "HOCSINH"));
        hsSnap.forEach(docSnap => {
          existingHS[docSnap.id] = docSnap.data();
        });
      }

      const batch = writeBatch(db);

      for (const [maHS, hs] of Object.entries(danhSach)) {
        const hsRef = doc(db, "DATA", lopKey, "HOCSINH", maHS);

        let hsData = {};
        if (mode === "update") {
          const existingData = existingHS[maHS] || {};
          hsData = {
            hoVaTen: hs.hoVaTen || existingData.hoVaTen || "",
            stt: hs.stt ?? existingData.stt ?? null,
            TinHoc: {
              dgtx: existingData.TinHoc?.dgtx || {},
              ktdk: existingData.TinHoc?.ktdk || {},
            },
            CongNghe: {
              dgtx: existingData.CongNghe?.dgtx || {},
              ktdk: existingData.CongNghe?.ktdk || {},
            },
          };
        } else {
          hsData = {
            hoVaTen: hs.hoVaTen || "",
            stt: hs.stt || null,
            TinHoc: { dgtx: {}, ktdk: {} },
            CongNghe: { dgtx: {}, ktdk: {} },
          };
        }

        batch.set(hsRef, hsData, { merge: true });
      }

      await batch.commit();
      done++;
      setProgress(Math.round((done / CLASS_LIST.length) * 100));
    }

    setMessage(mode === "new" ? "✅ Tạo dữ liệu mới thành công!" : "✅ Cập nhật dữ liệu thành công!");
    setSuccess(true);
  } catch (err) {
    console.error("❌ Lỗi khi tạo/cập nhật dữ liệu:", err);
    setMessage("❌ Lỗi khi tạo/cập nhật dữ liệu");
    setSuccess(false);
  } finally {
    setLoading(false);
  }
};


  return (
    <Dialog
      open={open}
      onClose={loading ? null : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 3,
          bgcolor: "#e3f2fd",
          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.15)",
        },
      }}
    >
      {/* ===== HEADER ===== */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: success ? "#4caf50" : "#f44336",
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
          {success ? "✅" : "⚠️"}
        </Box>

        <DialogTitle
          sx={{
            p: 0,
            fontWeight: "bold",
            color: "#d32f2f",
          }}
        >
          {disableConfirm
            ? "Cảnh báo"
            : mode === "new"
            ? "Tạo DATA mới"
            : "Cập nhật DATA"}
        </DialogTitle>
      </Box>

      {/* ===== CONTENT ===== */}
      <DialogContent>
        {/* 🔴 CẢNH BÁO KHI DANHSACH RỖNG */}
        {disableConfirm && (
          <Typography
            sx={{
              fontSize: 16,
              color: "error.main",
              textAlign: "left",
              mt: 2,
            }}
          >
            ⚠️ Không tìm thấy danh sách học sinh. Vui lòng tải danh sách học sinh lên trước.
          </Typography>
        )}

        {/* 🟢 NỘI DUNG XÁC NHẬN (CHỈ KHI CÓ LỚP) */}
        {!disableConfirm && !loading && !success && (
          <>
            <Typography sx={{ fontSize: 16, color: "#0d47a1" }}>
              Bạn chắc chắn muốn{" "}
              {mode === "new"
                ? "xóa dữ liệu cũ và tạo DATA mới"
                : "cập nhật DATA, giữ dữ liệu hiện có"}
              ?<br />
              Hành động này <strong>không thể hoàn tác</strong>.
            </Typography>

            <FormControl component="fieldset" sx={{ mt: 4 }}>
              <FormLabel component="legend">Chọn chế độ</FormLabel>
              <RadioGroup
                row
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <FormControlLabel value="new" control={<Radio />} label="Tạo mới" />
                <FormControlLabel
                  value="update"
                  control={<Radio />}
                  label="Cập nhật"
                />
              </RadioGroup>
            </FormControl>
          </>
        )}

        {/* 🔄 LOADING */}
        {loading && (
          <Box
            sx={{
              mt: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                width: "80%",
                borderRadius: 2,
                height: 4,
                backgroundColor: "#cfe8fc",
                "& .MuiLinearProgress-bar": {
                  backgroundColor: "#1976d2",
                },
                mb: 0.5,
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {message} ({progress}%)
            </Typography>
          </Box>
        )}

        {/* ✅ SUCCESS */}
        {success && !loading && (
          <Typography
            sx={{
              fontSize: 16,
              color: "#0d47a1",
              textAlign: "center",
            }}
          >
            ✅{" "}
            {mode === "new"
              ? "Dữ liệu mới đã được tạo thành công!"
              : "Cập nhật dữ liệu thành công!"}
          </Typography>
        )}
      </DialogContent>

      {/* ===== ACTIONS ===== */}
      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        {/* 🔴 CHỈ OK KHI DANHSACH RỖNG */}
        {disableConfirm && (
          <Button
            variant="contained"
            color="primary"
            onClick={onClose}
            sx={{ borderRadius: 1, px: 4 }}
          >
            OK
          </Button>
        )}

        {/* 🟢 NÚT XÁC NHẬN KHI CÓ LỚP */}
        {!disableConfirm && !loading && !success && (
          <>
            <Button variant="outlined" onClick={onClose}>
              Hủy
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleCreateDATA}
            >
              Xác nhận
            </Button>
          </>
        )}

        {!loading && success && (
          <Button variant="contained" onClick={onClose}>
            OK
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

};

export default CreateDataConfirmDialog;
