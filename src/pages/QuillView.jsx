import React from "react";
import { Box } from "@mui/material";
import { normalizeQuillHTML } from "../utils/quill";

const QuillView = ({ value, sx }) => {
  const html = normalizeQuillHTML(value);

  if (!html) return null;

  return (
    <Box
      sx={{
        "& p": { margin: 0 },
        whiteSpace: "pre-wrap",
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default QuillView;
