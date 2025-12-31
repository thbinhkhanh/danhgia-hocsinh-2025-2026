import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
  Stack,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { nhanXetTinHocCuoiKy } from "../utils/nhanXet";
import { useMediaQuery } from "@mui/material";

const CapNhatLyThuyetDialog = ({
  open,
  onClose,
  student,
  lop,
  value,
  setValue,
  handleCellChange,
  onSaveOne,
}) => {
  const [error, setError] = useState("");
  const [thucHanh, setThucHanh] = useState("");
  const [tongCong, setTongCong] = useState("");
  const [mucDat, setMucDat] = useState("");
  const [nhanXet, setNhanXet] = useState("");
  const isMobile = useMediaQuery("(max-width:768px)");

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (student) {
      setThucHanh(student.thucHanh ?? "");
      setTongCong(student.tongCong ?? "");
      setMucDat(student.mucDat ?? "");
      setNhanXet(student.nhanXet ?? "");
    }
    setError("");
  }, [open, student]);

  // Cập nhật tổng cộng, mức đạt, nhận xét khi thay đổi value/thucHanh
  useEffect(() => {
    const lt = parseFloat(value);
    const th = parseFloat(thucHanh);

    if (!isNaN(lt) && !isNaN(th)) {
        // Tổng cộng làm tròn
        const tong = Math.ceil(lt + th);
        setTongCong(tong);

        let md = "";
        if (tong >= 9) md = "T";
        else if (tong >= 5) md = "H";
        else md = "C";
        setMucDat(md);

        // Nhận xét tự động
        let loaiLT = lt > 4 ? "tot" : lt > 3 ? "kha" : lt >= 2.5 ? "trungbinh" : "yeu";
        let loaiTH = th > 4 ? "tot" : th > 3 ? "kha" : th >= 2.5 ? "trungbinh" : "yeu";

        const arrLT = nhanXetTinHocCuoiKy[loaiLT]?.lyThuyet || [];
        const arrTH = nhanXetTinHocCuoiKy[loaiTH]?.thucHanh || [];
        const nxLT = arrLT.length ? arrLT[Math.floor(Math.random() * arrLT.length)] : "";
        const nxTH = arrTH.length ? arrTH[Math.floor(Math.random() * arrTH.length)] : "";

        setNhanXet(`${nxLT}; ${nxTH}`.trim());
    } else {
        setTongCong("");
        setMucDat("");
        setNhanXet("");
    }
  }, [value, thucHanh]);

  const handleSave = async () => {
    const lt = parseFloat(value);
    const th = parseFloat(thucHanh);

    if (isNaN(lt) || lt < 0 || lt > 5) {
        setError("⚠️ Điểm lý thuyết không hợp lệ!");
        return;
    }
    if (!isNaN(th) && (th < 0 || th > 5)) {
        setError("⚠️ Điểm thực hành không hợp lệ!");
        return;
    }

    const lyThuyetPhanTram = (lt / 5) * 100;

    const updatedStudent = {
        ...student,
        lyThuyet: lt,
        lyThuyetPhanTram,
        thucHanh: !isNaN(th) ? th : null,
        tongCong,
        mucDat,
        nhanXet,
    };

    // Cập nhật state tạm trong bảng
    handleCellChange(student.maDinhDanh, "lyThuyet", lt);
    handleCellChange(student.maDinhDanh, "lyThuyetPhanTram", lyThuyetPhanTram);
    if (!isNaN(th)) handleCellChange(student.maDinhDanh, "thucHanh", th);
    handleCellChange(student.maDinhDanh, "tongCong", tongCong);
    handleCellChange(student.maDinhDanh, "mucDat", mucDat);
    handleCellChange(student.maDinhDanh, "nhanXet", nhanXet);

    onClose();

    // Lưu Firestore nền, snackbar sẽ được hiển thị ở handleSaveOne
    onSaveOne(updatedStudent).catch(err => console.error(err));
  };

  if (!student) return null;

  return (
  <>
    <Dialog
      open={open}
      onClose={(e, reason) => { if (reason !== "backdropClick") onClose(); }}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, bgcolor: "#fff" } }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", bgcolor: "#1976d2", color: "#fff", px: 2, py: 1.2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>CẬP NHẬT ĐIỂM</Typography>
        <IconButton onClick={onClose} sx={{ color: "#fff" }}><CloseIcon /></IconButton>
      </Box>

      <DialogContent sx={{ mt: 1 }}>
        <Stack spacing={2}>
          {/* Họ và tên */}
          <TextField
            label="Họ và tên"
            value={student.hoVaTen}
            size="small"
            InputProps={{ readOnly: true }}
            sx={{
              width: "100%",
              "& .MuiInputBase-input": { color: "#1976d2", fontWeight: "bold" },
              "& .MuiInputLabel-root": { color: "#1976d2" },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#1976d2" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#115293" },
            }}
          />

          {/* Trên điện thoại tách thành 2 hàng, trên máy tính giữ 1 hàng */}
          {isMobile ? (
            <>
              {/* Hàng 1: Lý thuyết + Thực hành */}
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Lý thuyết"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  size="small"
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, max: 5, step: 0.5, style: { textAlign: "center" } }}
                />
                <TextField
                  label="Thực hành"
                  value={thucHanh}
                  onChange={e => setThucHanh(e.target.value)}
                  size="small"
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, max: 5, step: 0.5, style: { textAlign: "center" } }}
                />
              </Stack>

              {/* Hàng 2: Tổng cộng + Mức đạt */}
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Tổng cộng"
                  value={tongCong}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  inputProps={{ style: { textAlign: "center" } }}
                />
                <TextField
                  label="Mức đạt"
                  value={mucDat}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  inputProps={{ style: { textAlign: "center" } }}
                />
              </Stack>
            </>
          ) : (
            // Máy tính: 1 hàng như cũ
            <Stack direction="row" spacing={2}>
              {[
                { label: "Lý thuyết", value: value, onChange: e => setValue(e.target.value) },
                { label: "Thực hành", value: thucHanh, onChange: e => setThucHanh(e.target.value) },
                { label: "Tổng cộng", value: tongCong },
                { label: "Mức đạt", value: mucDat },
              ].map((item, idx) => (
                <TextField
                  key={idx}
                  label={item.label}
                  type={item.onChange ? "number" : "text"}
                  size="small"
                  fullWidth
                  value={item.value}
                  onChange={item.onChange}
                  inputProps={{
                    min: 0,
                    max: 5,
                    step: 0.5,
                    style: { textAlign: "center" },
                  }}
                  InputProps={{
                    readOnly: !item.onChange,
                  }}
                />
              ))}
            </Stack>
          )}

          {/* Nhận xét */}
          <TextField
            label="Nhận xét"
            size="small"
            fullWidth
            value={nhanXet}
            multiline
            maxRows={3}
            InputProps={{ readOnly: true }}
            sx={{
              "& .MuiInputBase-root": { height: 60, alignItems: "flex-start", paddingTop: "8px", paddingBottom: "8px" },
              "& .MuiInputBase-input": { height: "100%", overflow: "auto" },
            }}
          />

          {error && <Typography color="error">{error}</Typography>}

          <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
            <Button onClick={onClose}>Hủy</Button>
            <Button variant="contained" onClick={handleSave}>Lưu</Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>

    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
    </Snackbar>
  </>
);
};

export default CapNhatLyThuyetDialog;
