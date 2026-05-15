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
import InsertPhotoIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import InsertPhotoOutlinedIcon from "@mui/icons-material/Image";

import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/* ================= QUILL CONFIG ================= */
const quillModules = {
  toolbar: false,
};

const quillFormats = ["bold", "italic", "underline"];

/* ================= COMPONENT ================= */
const ChoiceOptions = ({ q, qi, update }) => {
  const fileInputRefs = useRef([]);
  const quillRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(null);

  /* ---------- Format ---------- */
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
      {/* ================= TOOLBAR ================= */}
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

      {/* ================= OPTIONS ================= */}
      {q.options?.map((opt, oi) => (
        <Stack key={oi} direction="row" spacing={1} alignItems="center">
          {/* chọn đáp án */}
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

          {/* ================= EDITOR ================= */}
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
            {/* ===== IMAGE PREVIEW OR URL ===== */}
            {(opt.imagePreview || opt.image) && (
              <Box
                component="img"
                src={opt.imagePreview || opt.image}
                alt=""
                sx={{
                  height: 50,
                  width: "auto",
                  objectFit: "contain",
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />
            )}


            {/* TEXT */}
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
                  const newOptions = [...q.options];
                  newOptions[oi] = {
                    ...newOptions[oi],
                    text: value,
                  };
                  update(qi, { options: newOptions });
                }}
              />
            </Box>
          </Box>

          {/* ================= IMAGE ACTION ================= */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title={(opt.imagePreview || opt.image) ? "Xóa hình" : "Chèn hình"}>
              <IconButton
                size="small"
                sx={{ color: (opt.imagePreview || opt.image) ? "#ff9800" : "#2196f3" }}
                onClick={() => {
                  if (opt.imagePreview || opt.image) {
                    const newOptions = [...q.options];
                    newOptions[oi] = {
                      ...newOptions[oi],
                      imagePreview: "",
                      imageFile: null,
                      image: "", // xoá luôn URL Cloudinary nếu có
                    };
                    update(qi, { options: newOptions });
                  } else {
                    fileInputRefs.current[oi]?.click();
                  }
                }}
              >
                {(opt.imagePreview || opt.image) ? (
                  <InsertPhotoIcon sx={{ color: "#ff9800" }} />
                ) : (
                  <InsertPhotoOutlinedIcon sx={{ color: "#2196f3" }} />
                )}
              </IconButton>
            </Tooltip>


            {/* input file */}
            <input
              type="file"
              accept="image/*"
              hidden
              ref={(el) => (fileInputRefs.current[oi] = el)}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const previewUrl = URL.createObjectURL(file);

                const newOptions = [...q.options];
                newOptions[oi] = {
                  ...newOptions[oi],
                  imagePreview: previewUrl, // hiển thị ngay
                  imageFile: file,          // giữ file để upload khi lưu
                };

                update(qi, { options: newOptions });
                e.target.value = "";
              }}
            />

            {/* delete option */}
            <IconButton
              onClick={() => {
                const newOptions = [...q.options];
                newOptions.splice(oi, 1);

                let newCorrect = [...(q.correct || [])];
                newCorrect = newCorrect
                  .filter((c) => c !== oi)
                  .map((c) => (c > oi ? c - 1 : c));

                update(qi, {
                  options: newOptions,
                  correct: newCorrect,
                });
              }}
            >
              <RemoveCircleOutlineIcon sx={{ color: "error.main" }} />
            </IconButton>
          </Stack>
        </Stack>
      ))}

      {/* add option */}
      <Button
        variant="outlined"
        onClick={() =>
          update(qi, {
            options: [...(q.options || []), { text: "", imagePreview: "", imageFile: null }],
          })
        }
      >
        Thêm mục
      </Button>
    </Stack>
  );
};

export default ChoiceOptions;
