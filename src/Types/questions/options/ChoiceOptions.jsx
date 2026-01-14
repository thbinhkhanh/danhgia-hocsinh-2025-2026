import React, { useRef, useState } from "react";
import {
  Stack,
  IconButton,
  Radio,
  Checkbox,
  Button,
  Box,
  Tooltip,
} from "@mui/material";

import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/* ================= QUILL CONFIG ================= */
const quillModules = {
  toolbar: false, // ❌ tắt toolbar mặc định
};

const quillFormats = ["bold", "italic", "underline"];

/* ================= COMPONENT ================= */
const ChoiceOptions = ({ q, qi, update }) => {
  const fileInputRefs = useRef([]);
  const quillRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(null);

  /* ---------- Upload Cloudinary ---------- */
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "tracnghiem_upload");
    formData.append("folder", "questions");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dxzpfljv4/image/upload",
      { method: "POST", body: formData }
    );

    if (!res.ok) throw new Error("Upload hình thất bại");
    const data = await res.json();
    return data.secure_url;
  };

  /* ---------- Toolbar handler ---------- */
  const applyFormat = (format) => {
    if (activeIndex === null) return;

    const quill = quillRefs.current[activeIndex]?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (!range || range.length === 0) return;

    const current = quill.getFormat(range);
    quill.format(format, !current[format]);
  };

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {/* ================= TOOLBAR CHUNG ================= */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1}}>
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

      {/* ================= OPTIONS ================= */}
      {q.options?.map((opt, oi) => (
        <Stack key={oi} direction="row" spacing={1} alignItems="center">
          {/* ---------- Chọn đáp án ---------- */}
          {q.type === "single" && (
            <Radio
              checked={q.correct?.[0] === oi}
              onChange={() => update(qi, { correct: [oi] })}
              size="small"
            />
          )}

          {q.type === "multiple" && (
            <Checkbox
              checked={q.correct?.includes(oi)}
              onChange={(e) => {
                let corr = [...(q.correct || [])];
                if (e.target.checked) corr.push(oi);
                else corr = corr.filter((c) => c !== oi);
                update(qi, { correct: corr });
              }}
              size="small"
            />
          )}

          {/* ---------- Editor ---------- */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {/* ===== HÌNH TRƯỚC TEXT ===== */}
            {opt.image && (
              <Box
                component="img"
                src={opt.image}
                alt=""
                sx={{
                  height: "2em",
                  width: "auto",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />
            )}

            {/* ===== TEXT / EDITOR ===== */}
            <Box sx={{ flex: 1 }}>
              <ReactQuill
                ref={(el) => (quillRefs.current[oi] = el)}
                theme="snow"
                value={opt.text || ""}
                modules={quillModules}
                formats={quillFormats}
                className="choice-option-editor"
                onFocus={() => setActiveIndex(oi)}
                onChange={(value) => {
                  if (value === opt.text) return;

                  const newOptions = [...q.options];
                  newOptions[oi] = { ...newOptions[oi], text: value };
                  update(qi, { options: newOptions });
                }}
              />
            </Box>
          </Box>

          {/* ---------- Chèn / Xóa hình ---------- */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title={opt.image ? "Xóa hình" : "Chèn hình"}>
              <IconButton
                size="small"
                sx={{ color: opt.image ? "#ff9800" : "#2196f3" }}
                onClick={() =>
                  opt.image
                    ? (() => {
                        const newOptions = [...q.options];
                        newOptions[oi] = { ...newOptions[oi], image: "" };
                        update(qi, { options: newOptions });
                      })()
                    : fileInputRefs.current[oi]?.click()
                }
              >
                {opt.image ? <DeleteIcon /> : <PhotoCameraIcon />}
              </IconButton>
            </Tooltip>

            <input
              type="file"
              accept="image/*"
              hidden
              ref={(el) => (fileInputRefs.current[oi] = el)}
              onChange={async (e) => {
                if (!e.target.files?.[0]) return;
                const url = await uploadToCloudinary(e.target.files[0]);
                const newOptions = [...q.options];
                newOptions[oi] = { ...newOptions[oi], image: url };
                update(qi, { options: newOptions });
              }}
            />

            {/* ---------- Xóa option ---------- */}
            <IconButton
              onClick={() => {
                const newOptions = [...q.options];
                newOptions.splice(oi, 1);

                let newCorrect = [...(q.correct || [])];
                newCorrect = newCorrect
                  .filter((c) => c !== oi)
                  .map((c) => (c > oi ? c - 1 : c));

                update(qi, { options: newOptions, correct: newCorrect });
              }}
            >
              <RemoveCircleOutlineIcon sx={{ color: "error.main" }} />
            </IconButton>
          </Stack>
        </Stack>
      ))}

      {/* ---------- Thêm option ---------- */}
      <Button
        variant="outlined"
        onClick={() =>
          update(qi, {
            options: [...(q.options || []), { text: "", image: "" }],
          })
        }
      >
        Thêm mục
      </Button>
    </Stack>
  );
};

export default ChoiceOptions;
