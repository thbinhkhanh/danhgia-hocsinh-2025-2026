import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const TestResultDialog = ({
  open,
  onClose,
  studentResult,
  choXemDiem,
}) => {
  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
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
          fontFamily:
            '"Segoe UI","Arial","Helvetica","Noto Sans","sans-serif"',
          textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
        },
      }}
    >
      {/* ===== HEADER ===== */}
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
              bgcolor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🎯
          </Box>

          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
            KẾT QUẢ
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

      {/* ===== CONTENT ===== */}
      <DialogContent sx={{ px: 3, py: 4, textAlign: "center" }}>
        <Stack spacing={2.5} alignItems="center">

          {/* ICON */}
          <Box
            sx={{
              width: 85,
              height: 85,
              borderRadius: "50%",
              background: "#4caf50",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 36,
            }}
          >
            {choXemDiem ? "🏆" : "✓"}
          </Box>

          {/* NAME */}
          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {studentResult?.hoVaTen?.toUpperCase()}
          </Typography>

          {/* CLASS */}
          <Typography
            sx={{
              fontSize: 15,
              color: "#1565c0",
              fontWeight: 600,
            }}
          >
            Lớp: {studentResult?.lop}
          </Typography>

          {/* STATUS */}
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 600,
              color: choXemDiem ? "#16a34a" : "#dc2626",
            }}
          >
            Đã hoàn thành bài kiểm tra
          </Typography>

          {/* ===== SCORE BOX (GIỐNG MẪU RESULT DIALOG) ===== */}
          <Box
            sx={{
              mt: 1,
              px: 3,
              py: 2,
              borderRadius: "14px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              minWidth: 160,
            }}
          >
            <Typography sx={{ fontSize: 13, color: "#64748b" }}>
              Điểm của bạn
            </Typography>

            <Typography
              sx={{
                fontSize: 30,
                fontWeight: 900,
                color: "#1976d2",
                minHeight: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {choXemDiem ? studentResult?.diem : "\u200B"}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      {/* ===== ACTION ===== */}
      <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
        <Box
          onClick={onClose}
          sx={{
            px: 3,
            py: 1,
            borderRadius: "12px",
            background: "#1976d2",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            "&:hover": { opacity: 0.9 },
          }}
        >
          OK
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default TestResultDialog;