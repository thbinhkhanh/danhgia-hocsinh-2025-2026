import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from "@mui/material";

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
          borderRadius: 3,
          p: 0,
          bgcolor: "#e3f2fd",
          boxShadow: "0 4px 12px rgba(33, 150, 243, 0.15)",
        },
      }}
    >
      {/* ===== HEADER ===== */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 0.75,
          bgcolor: "#90caf9",
          borderRadius: "12px 12px 0 0",
          mb: 2,
        }}
      >
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
          🎉
        </Box>

        <DialogTitle
          sx={{
            p: 0,
            fontWeight: "bold",
            color: "#0d47a1",
            fontSize: 20,
          }}
        >
          Kết quả
        </DialogTitle>
      </Box>

      {/* ===== NỘI DUNG ===== */}
      <DialogContent sx={{ textAlign: "center", px: 3, pb: 3 }}>
        <Typography
          sx={{ fontSize: 18, fontWeight: "bold", color: "#0d47a1", mb: 1 }}
        >
          {studentResult?.hoVaTen?.toUpperCase()}
        </Typography>

        <Typography sx={{ fontSize: 17, color: "#1565c0", mb: 1 }}>
          <strong>Lớp: </strong>
          <span style={{ fontWeight: "bold" }}>
            {studentResult?.lop}
          </span>
        </Typography>

        {choXemDiem ? (
          <Typography sx={{ fontSize: 17, fontWeight: 700, mt: 1 }}>
            <span style={{ color: "#1565c0" }}>Điểm:</span>{" "}
            <span style={{ color: "red" }}>
              {studentResult?.diem}
            </span>
          </Typography>
        ) : (
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 700,
              color: "red",
              mt: 2,
            }}
          >
            ĐÃ HOÀN THÀNH BÀI KIỂM TRA
          </Typography>
        )}
      </DialogContent>

      {/* ===== ACTION ===== */}
      <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            px: 4,
            borderRadius: 2,
            bgcolor: "#42a5f5",
            color: "#fff",
            "&:hover": { bgcolor: "#1e88e5" },
            fontWeight: "bold",
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TestResultDialog;
