
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Checkbox,
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

export default function BangTongHopDialog({
  open,
  onClose,
  onPrint,
  initialOptions,
  onOptionsChange
}) {
  const [hidePrincipalName, setHidePrincipalName] = useState(true);
  const [printDate, setPrintDate] = useState(getToday());

  const sectionTitleSx = {
    fontWeight: 700,
    fontSize: 16,
    mb: 1
  };

  useEffect(() => {
    if (!open) return;

    setHidePrincipalName(true);

    setPrintDate(
        initialOptions?.printDate || getToday()
    );
  }, [open]);

  const handlePrint = () => {
    if (typeof onPrint !== "function") {
      console.error(
        "PrintBangTongHopOptionsDialog: Chưa truyền hàm onPrint!"
      );
      return;
    }

    onPrint(hidePrincipalName, printDate);
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
          THIẾT LẬP CHỮ KÝ VÀ NGÀY IN
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Typography sx={sectionTitleSx}>
          Phần ký xác nhận
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={hidePrincipalName}
              onChange={(e) => {
                const checked = e.target.checked;

                setHidePrincipalName(checked);
                onOptionsChange?.(checked);
              }}
            />
          }
          label="Ẩn tên Hiệu trưởng"
          sx={{
            "& .MuiFormControlLabel-label": {
              fontSize: 14
            }
          }}
        />

        <Divider sx={{ my: 2 }} />

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
          Ngày được chọn sẽ thay thế ngày hiện có trên phần ký xác nhận.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">
          Đóng
        </Button>

        <Button
          variant="contained"
          onClick={handlePrint}
          startIcon={<Printer size={17} />}
        >
          In tổng hợp
        </Button>
      </DialogActions>
    </Dialog>
  );
}
