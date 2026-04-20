import React from "react";
import { Box, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

export default function QuizHeader({
  studentInfo,
  loading,
  config,
  hocKiDisplay,
  monHocDisplay,
  started,
  timeLeft,
  formatTime,
  capitalizeName,
}) {
  return (
    <>
      <Box
        sx={{
          p: 1.5,
          border: "2px solid #1976d2",
          borderRadius: 2,
          color: "#1976d2",
          width: "fit-content",
          position: { xs: "relative", sm: "absolute" },
          top: { sm: 16 },
          left: { sm: 16 },
          bgcolor: "#fff",
        }}
      >
        <Typography fontWeight="bold">
          Tên: {capitalizeName(studentInfo.name)}
        </Typography>
        <Typography fontWeight="bold">
          Lớp: {studentInfo.className}
        </Typography>
      </Box>

      <Typography
        variant="h5"
        fontWeight="bold"
        sx={{ color: "#1976d2", textAlign: "center" }}
      >
        {loading
          ? "TRẮC NGHIỆM"
          : config?.kiemTraDinhKi
          ? `KTĐK ${hocKiDisplay?.toUpperCase()} - ${monHocDisplay?.toUpperCase()}`
          : "TRẮC NGHIỆM"}
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        {started && !loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccessTimeIcon color="error" />
            <Typography fontWeight="bold" color="error">
              {formatTime(timeLeft)}
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
}