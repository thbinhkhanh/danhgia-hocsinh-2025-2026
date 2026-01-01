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
} from "@mui/material";
import { db } from "../firebase";
import { getDocs, getDoc, collection, writeBatch, doc } from "firebase/firestore";

const CreateDataConfirmDialog = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(false);
      setProgress(0);
      setMessage("");
      setSuccess(false);
    }
  }, [open]);

  const handleTaoDATA_NEW = async () => {
    try {
      setLoading(true);
      setMessage("🔄 Đang tạo dữ liệu mới...");
      setProgress(0);

      const classSnap = await getDocs(collection(db, "DANHSACH"));
      const CLASS_LIST = classSnap.docs.map(doc => doc.id);

      let done = 0;

      for (const lop of CLASS_LIST) {
        const lopKey = lop.replace(".", "_");
        const dsSnap = await getDoc(doc(db, "DANHSACH", lop));
        if (!dsSnap.exists()) continue;
        const danhSach = dsSnap.data();

        const batch = writeBatch(db);
        for (const [maHS, hs] of Object.entries(danhSach)) {
          const hsRef = doc(db, "DATA_NEW", lopKey, "HOCSINH", maHS);
          const hsData = {
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

      setMessage("✅ Tạo dữ liệu mới thành công!");
      setSuccess(true);
    } catch (err) {
      console.error("❌ Lỗi khi tạo dữ liệu mới:", err);
      setMessage("❌ Lỗi khi tạo dữ liệu mới");
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
          sx={{ p: 0, fontWeight: "bold", color: success ? "#2e7d32" : "#d32f2f" }}
        >
          Tạo DATA mới
        </DialogTitle>
      </Box>

      <DialogContent>
        {!loading && !success && (
          <Typography sx={{ fontSize: 16, color: "#0d47a1" }}>
            Bạn chắc chắn muốn xóa toàn bộ dữ liệu cũ và tạo dữ liệu mới?<br />
            Hành động này <strong>không thể hoàn tác</strong>.
          </Typography>
        )}

        {loading && (
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                width: "80%",          // thanh tiến trình chiếm 80% chiều rộng dialog
                borderRadius: 2,       // bo tròn
                height: 4,            // chiều cao thanh
                backgroundColor: "#cfe8fc",
                "& .MuiLinearProgress-bar": {
                  backgroundColor: "#1976d2",
                },
                mb: 1,
              }}
            />
            <Typography
              variant="body2"
              sx={{ textAlign: "center", fontWeight: 500 }}
            >
              {message} ({progress}%)
            </Typography>
          </Box>
        )}

        {success && !loading && (
          <Typography sx={{ fontSize: 16, color: "#0d47a1", textAlign: "center" }}>
            ✅ Dữ liệu mới đã được tạo thành công!
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pt: 2 }}>
        {!loading && !success && (
          <>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{ borderRadius: 1, px: 3 }}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleTaoDATA_NEW}
              sx={{ borderRadius: 1, px: 3 }}
            >
              Xác nhận
            </Button>
          </>
        )}
        {!loading && success && (
          <Button
            variant="contained"
            color="primary"
            onClick={onClose}
            sx={{ borderRadius: 1, px: 4 }}
          >
            OK
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateDataConfirmDialog;
