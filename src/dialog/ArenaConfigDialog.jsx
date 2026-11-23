import React from "react";
import {
  Dialog, DialogContent, DialogActions, Box, Typography, Button,
  TextField, Paper, Stack, Chip, Fade, MenuItem, Divider
} from "@mui/material";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import DialogHeader from "./DialogHeader";

const paperSx = {
  borderRadius: 3,
  border: "1px solid #e2e8f0",
  bgcolor: "#fff",
  boxShadow: "none",
};
const primaryButtonSx = {
  borderRadius: 2.5,
  fontWeight: 900,
  textTransform: "none",
  background: "linear-gradient(90deg,#2563eb,#0ea5e9)",
  boxShadow: "0 5px 14px rgba(37,99,235,.18)",
  "&:hover": { background: "linear-gradient(90deg,#1d4ed8,#0284c7)" },
  "&.Mui-disabled": { color: "#fff", opacity: 0.45 },
};

export default function ArenaConfigDialog({ open, onClose, duration, setDuration }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      TransitionComponent={Fade}
      PaperProps={{
        sx: {
          display: "flex",
          flexDirection: "column",
          height: "min(420px, 85vh)",
          maxHeight: "85vh",
          overflow: "hidden",
          borderRadius: 3,
        },
      }}
    >
      <DialogHeader
        title="CẤU HÌNH CUỘC THI"
        subtitle="Thiết lập thời gian trả lời"
        icon={<SettingsRoundedIcon />}
        onClose={onClose}
      />

      <DialogContent
        sx={{
          p: 2.5,
          overflowY: "auto",
          minHeight: 0,
          flex: 1,
          bgcolor: "#f8fbff",
        }}
      >
        <Paper sx={{ ...paperSx, p: 2 }}>
          <Stack spacing={1.5}>
            <Typography
              sx={{ fontSize: 13, fontWeight: 900, color: "#172554" }}
            >
              THỜI GIAN TRẢ LỜI
            </Typography>

            <TextField
              select
              fullWidth
              size="small"
              label="Thời gian cho mỗi câu"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {[10, 15, 20, 30, 45, 60].map((value) => (
                <MenuItem key={value} value={value}>
                  {value} giây
                </MenuItem>
              ))}
            </TextField>

            <Divider />

            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip size="small" color="success" label="+10 điểm" />
              <Typography sx={{ fontSize: 11, color: "#64748b" }}>
                Mỗi câu trả lời đúng được cộng 10 điểm.
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </DialogContent>

      <DialogActions
        sx={{
          p: 1.5,
          borderTop: "1px solid #e2e8f0",
          flexShrink: 0,
        }}
      >
        <Button onClick={onClose} variant="contained" sx={primaryButtonSx}>
          Hoàn tất
        </Button>
      </DialogActions>
    </Dialog>
  );
}
