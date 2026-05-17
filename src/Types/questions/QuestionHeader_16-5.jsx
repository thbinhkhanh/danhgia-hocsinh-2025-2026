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
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    // lấy selection chuẩn, tránh mất chọn
    const range = quill.getSelection(true);
    if (!range || range.length === 0) return;

    const current = quill.getFormat(range);
    // áp dụng format cho toàn bộ vùng chọn
    quill.formatText(range.index, range.length, format, !current[format]);
    // giữ nguyên selection sau khi format
    quill.setSelection(range.index, range.length, "silent");
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
        <Typography className="question-header-title" fontWeight="bold">
          Câu hỏi {qi + 1}:
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            size="small"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormat("bold");
            }}
          >
            <FormatBoldIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormat("italic");
            }}
          >
            <FormatItalicIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormat("underline");
            }}
          >
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