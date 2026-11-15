
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Button,
  Divider
} from "@mui/material";

import { Settings2, Printer } from "lucide-react";

const getToday = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function PhieuDanhGiaDialog({
  open,
  onClose,
  onPrint,
  initialOptions
}) {
  const [confirmationType, setConfirmationType] = useState("none");
  const [printDate, setPrintDate] = useState(getToday());

  // Cấu hình chung cho các tiêu đề trong Dialog
  const sectionTitleSx = {
    fontWeight: 700,
    fontSize: 16,
    mb: 1
  };

  // Cập nhật lựa chọn khi mở Dialog
  useEffect(() => {
    if (!open) return;

    // Mặc định không in phần xác nhận
    setConfirmationType("none");

    setPrintDate(
        initialOptions?.printDate || getToday()
    );
    }, [open]);

  const handlePrint = () => {
    if (typeof onPrint !== "function") {
      console.error("PhieuDanhGiaDialog: Chưa truyền hàm onPrint!");
      return;
    }

    onPrint({
      confirmationType,
      printDate
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3
        }
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          color: "#1e40af",
          pb: 1
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Settings2 size={21} />
          THIẾT LẬP THÔNG TIN PHIẾU IN
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* PHẦN KÝ XÁC NHẬN */}
        <Typography sx={sectionTitleSx}>
          Phần ký xác nhận
        </Typography>

        <RadioGroup
          value={confirmationType}
          onChange={(e) => setConfirmationType(e.target.value)}
        >
          <FormControlLabel
            value="none"
            control={<Radio size="small" />}
            label="Không in phần xác nhận"
          />

          <FormControlLabel
            value="principal"
            control={<Radio size="small" />}
            label="Xác nhận của Hiệu trưởng"
          />

          <FormControlLabel
            value="parent"
            control={<Radio size="small" />}
            label="Xác nhận của Phụ huynh"
          />
        </RadioGroup>

        <Divider sx={{ my: 2 }} />

        {/* NGÀY THÁNG IN PHIẾU */}
        <Typography sx={sectionTitleSx}>
          Ngày tháng in phiếu
        </Typography>

        <TextField
          type="date"
          fullWidth
          size="small"
          value={printDate}
          onChange={(e) => setPrintDate(e.target.value)}
          InputLabelProps={{
            shrink: true
          }}
        />

        <Typography
          sx={{
            mt: 1,
            fontSize: 12,
            color: "text.secondary"
          }}
        >
          Ngày được chọn sẽ thay thế ngày lấy từ file Excel khi in phiếu.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button
          onClick={onClose}
          color="inherit"
        >
          Đóng
        </Button>

        <Button
          variant="contained"
          onClick={handlePrint}
          startIcon={<Printer size={17} />}
        >
          In phiếu
        </Button>
      </DialogActions>
    </Dialog>
  );
}
