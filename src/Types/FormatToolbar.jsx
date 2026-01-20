// src/pages/types/FormatToolbar.jsx
import React from "react";
import { Box, IconButton } from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";

const FormatToolbar = ({ applyFormat }) => {
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <IconButton size="small" onClick={() => applyFormat("bold")}>
        <FormatBoldIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={() => applyFormat("italic")}>
        <FormatItalicIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={() => applyFormat("underline")}>
        <FormatUnderlinedIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export default FormatToolbar;