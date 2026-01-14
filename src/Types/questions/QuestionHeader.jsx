// src/Types/questions/QuestionHeader.jsx
import React, { useRef, useState } from "react";
import { Typography, Box, IconButton } from "@mui/material";

import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import QuestionImage from "./QuestionImage";

/* ===== QUILL CONFIG ===== */
const quillModules = { toolbar: false };
const quillFormats = ["bold", "italic", "underline"];

const QuestionHeader = ({ q, qi, update }) => {
  const quillRef = useRef(null);
  const [focused, setFocused] = useState(false);

  const applyFormat = (format) => {
    if (!focused) return;

    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (!range || range.length === 0) return;

    const current = quill.getFormat(range);
    quill.format(format, !current[format]);
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Typography className="question-header-title">
          Câu hỏi {qi + 1}
        </Typography>

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
      </Box>

      {/* ReactQuill cho NỘI DUNG CÂU HỎI */}
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={q.question || ""}
        modules={quillModules}
        formats={quillFormats}
        placeholder="Nội dung câu hỏi"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(value) => {
          if (value === q.question) return;
          update(qi, { question: value });
        }}
        className="question-header-editor"
        style={{ marginBottom: 16 }}
      />

      <QuestionImage q={q} qi={qi} update={update} />
    </>
  );
};

export default QuestionHeader;
