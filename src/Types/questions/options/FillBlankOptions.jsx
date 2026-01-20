import React, { useRef, useState } from "react";
import {
  Stack,
  Typography,
  Grid,
  IconButton,
  Button,
  Box,
  TextField,
} from "@mui/material";

import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/* ===== QUILL CONFIG ===== */
const quillModules = { toolbar: false };
const quillFormats = ["bold", "italic", "underline"];

const FillBlankOptions = ({ q, qi, update }) => {
  const quillRef = useRef(null);
  const [focused, setFocused] = useState(false);

  /* ===== FORMAT TEXT ===== */
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
    <Stack spacing={2}>
      {/* ===== TOOLBAR ===== */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
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

      {/* ===== NHẬP CÂU HỎI (QUILL) ===== */}
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={q.option || ""}
        modules={quillModules}
        formats={quillFormats}
        className="choice-option-editor"
        placeholder="Nhập câu hỏi với [...] cho chỗ trống"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(value) => {
          if (value === q.option) return;
          update(qi, { option: value });
        }}
      />

      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Từ cần điền
      </Typography>

      {/* ===== ĐÁP ÁN ===== */}
      <Grid container spacing={1}>
        {q.options?.map((opt, oi) => (
          <Grid item xs={12} sm={6} key={oi}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                fullWidth
                value={opt?.text || ""}
                onChange={(e) => {
                  const newOptions = [...q.options];
                  newOptions[oi] = {
                    ...newOptions[oi],
                    text: e.target.value,
                  };
                  update(qi, { options: newOptions });
                }}
              />

              <IconButton
                onClick={() => {
                  const newOptions = [...q.options];
                  newOptions.splice(oi, 1);
                  update(qi, { options: newOptions });
                }}
              >
                <RemoveCircleOutlineIcon sx={{ color: "error.main" }} />
              </IconButton>
            </Stack>
          </Grid>
        ))}

        <Grid item xs={12} sm={6}>
          <Button
            variant="outlined"
            onClick={() =>
              update(qi, {
                options: [
                  ...(q.options || []),
                  { text: "", image: "", formats: {} }, // ✅ đúng schema
                ],
              })
            }
            sx={{
              height: 40,
              width: "100%",
              borderRadius: 2,
              borderStyle: "dashed",
            }}
          >
            + Thêm từ
          </Button>
        </Grid>
      </Grid>


      {/* ===== PREVIEW ===== */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1976d2" }}>
        Xem trước câu hỏi
      </Typography>

      <Box
        sx={{
          p: 1,
          border: "1px dashed #90caf9",
          borderRadius: 1,
          minHeight: 50,
        }}
        dangerouslySetInnerHTML={{
          __html: q.option
            ? q.option.replace(
                /\[\.\.\.\]/g,
                `<span style="
                  display:inline-block;
                  min-width:60px;
                  border-bottom:2px solid #000;
                  margin:0 4px;
                "></span>`
              )
            : "Câu hỏi chưa có nội dung",
        }}
      />
    </Stack>
  );
};

export default FillBlankOptions;
