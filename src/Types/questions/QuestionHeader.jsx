// src/Types/questions/QuestionHeader.jsx
import React, { useRef, useState } from "react";
import { Typography, Box, IconButton, Stack, FormControl, InputLabel, Select, MenuItem, TextField } from "@mui/material";

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

    const range = quill.getSelection(true);
    if (!range || range.length === 0) return;

    const current = quill.getFormat(range);
    quill.formatText(range.index, range.length, format, !current[format]);
    quill.setSelection(range.index, range.length, "silent");
  };

  return (
    <>
      {/* ===== HEADER ===== */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        {/* LEFT: TITLE + 2 Ô MỚI */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography className="question-header-title" fontWeight="bold">
            Câu {qi + 1}:
          </Typography>

          {/* ===== TYPE ===== */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Loại câu hỏi</InputLabel>
            <Select
              value={q.type}
              label="Loại câu hỏi"
              onChange={(e) => update(qi, { type: e.target.value })}
            >
              <MenuItem value="truefalse">Đúng – Sai</MenuItem>
              <MenuItem value="single">Một lựa chọn</MenuItem>
              <MenuItem value="multiple">Nhiều lựa chọn</MenuItem>
              <MenuItem value="matching">Ghép đôi</MenuItem>
              <MenuItem value="image">Hình ảnh</MenuItem>
              <MenuItem value="sort">Sắp xếp</MenuItem>
              <MenuItem value="fillblank">Điền khuyết</MenuItem>
            </Select>
          </FormControl>

          {/* ===== SCORE ===== */}
          <TextField
            label="Điểm"
            type="number"
            size="small"
            value={q.score}
            inputProps={{ step: 0.5 }}
            onChange={(e) =>
              update(qi, {
                score: e.target.value === "" ? "" : parseFloat(e.target.value),
              })
            }
            sx={{ width: 80 }}
          />
        </Box>

        {/* RIGHT: TOOLBAR */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            size="small"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormat("bold");
            }}
            sx={{ p: 0.4 }}
          >
            <FormatBoldIcon sx={{ fontSize: 20 }} />
          </IconButton>

          <IconButton
            size="small"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormat("italic");
            }}
            sx={{ p: 0.4 }}
          >
            <FormatItalicIcon sx={{ fontSize: 20 }} />
          </IconButton>

          <IconButton
            size="small"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormat("underline");
            }}
            sx={{ p: 0.4 }}
          >
            <FormatUnderlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </Box>

      {/* ReactQuill */}
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

      {/* IMAGE */}
      <QuestionImage q={q} qi={qi} update={update} />
    </>
  );
};

export default QuestionHeader;