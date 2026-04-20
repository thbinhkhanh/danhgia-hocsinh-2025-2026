import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";

export default function QuizLoading({ loading, progress }) {
  if (!loading) return null;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 1, width: "100%" }}>
      <Box sx={{ width: { xs: "60%", sm: "30%" } }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 3, borderRadius: 3 }}
        />
        <Typography variant="body2" sx={{ mt: 0.5, textAlign: "center" }}>
          🔄 Đang tải... {progress}%
        </Typography>
      </Box>
    </Box>
  );
}