// src/DangCau/questions/options/TrueFalseOptions.jsx
import React, { useRef, useState } from "react";
import {
  Stack,
  IconButton,
  Button,
  Box,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";

import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/* ================= QUILL CONFIG ================= */
const quillModules = { toolbar: false }; // tắt toolbar mặc định
const quillFormats = ["bold", "italic", "underline"];

/* ================= COMPONENT ================= */
const TrueFalseOptions = ({ q, qi, update }) => {
  const quillRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(null);

  /* ---------- Toolbar handler ---------- */
  const applyFormat = (format) => {
    if (activeIndex === null) return;

    const quill = quillRefs.current[activeIndex]?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (!range || range.length === 0) return;

    const current = quill.getFormat(range);
    quill.format(format, !current[format]); // toggle định dạng
  };

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {/* Toolbar định dạng chung */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={() => applyFormat("bold")}>
          <FormatBoldIcon fontSize="medium" />
        </IconButton>
        <IconButton size="small" onClick={() => applyFormat("italic")}>
          <FormatItalicIcon fontSize="medium" />
        </IconButton>
        <IconButton size="small" onClick={() => applyFormat("underline")}>
          <FormatUnderlinedIcon fontSize="medium" />
        </IconButton>
      </Box>

      {q.options?.map((opt, oi) => (
        <Stack key={oi} direction="row" spacing={1} alignItems="center">
          {/* Editor */}
          <Box sx={{ flex: 1 }}>
            <ReactQuill
              ref={(el) => (quillRefs.current[oi] = el)}
              theme="snow"
              value={opt || ""}
              modules={quillModules}
              formats={quillFormats}
              className="choice-option-editor"
              onFocus={() => setActiveIndex(oi)}
              onChange={(value) => {
                if (value === opt) return;
                const newOptions = [...q.options];
                newOptions[oi] = value;
                update(qi, { options: newOptions });
              }}
            />
          </Box>

          {/* Dropdown chọn Đúng/Sai */}
          <FormControl size="small" sx={{ width: 120 }}>
            <Select
              value={q.correct?.[oi] || ""}
              onChange={(e) => {
                const newCorrect = [...(q.correct || [])];
                newCorrect[oi] = e.target.value;
                update(qi, { correct: newCorrect });
              }}
            >
              <MenuItem value="">Chọn</MenuItem>
              <MenuItem value="Đ">Đúng</MenuItem>
              <MenuItem value="S">Sai</MenuItem>
            </Select>
          </FormControl>

          {/* Xóa option */}
          <IconButton
            onClick={() => {
              const newOptions = [...q.options];
              newOptions.splice(oi, 1);
              const newCorrect = [...(q.correct || [])];
              newCorrect.splice(oi, 1);
              update(qi, { options: newOptions, correct: newCorrect });
            }}
          >
            <RemoveCircleOutlineIcon sx={{ color: "error.main" }} />
          </IconButton>
        </Stack>
      ))}

      {/* Thêm option */}
      <Button
        variant="outlined"
        onClick={() =>
          update(qi, {
            options: [...(q.options || []), ""],
            correct: [...(q.correct || []), ""],
          })
        }
      >
        Thêm mục
      </Button>
    </Stack>
  );
};

export default TrueFalseOptions;