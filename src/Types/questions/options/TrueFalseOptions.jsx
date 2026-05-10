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
  Tooltip,
} from "@mui/material";

import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
//import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
//import InsertPhotoOutlinedIcon from "@mui/icons-material/InsertPhotoOutlined";

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
const TrueFalseOptions = ({ q, qi, update }) => {
  const quillRefs = useRef([]);
  const fileInputRefs = useRef([]);

  const [activeIndex, setActiveIndex] = useState(null);

  /* ---------- Upload Cloudinary ---------- */
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", "tracnghiem_upload");
    formData.append("folder", "questions");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dxzpfljv4/image/upload",
      {
        method: "POST",
        body: formData,
      }
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
      {/* ================= TOOLBAR ================= */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          mb: 1,
        }}
      >
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
        <Stack
          key={oi}
          direction="row"
          spacing={1}
          alignItems="center"
        >
          {/* ================= EDITOR ================= */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {/* ===== IMAGE ===== */}
            {opt.image && (
              <Box
                component="img"
                src={opt.image}
                alt=""
                sx={{
                  height: 50,          // = chiều cao option
                  width: "auto",       // tự co theo tỉ lệ
                  //maxWidth: 120,       // tránh ảnh quá dài
                  objectFit: "contain",
                  borderRadius: 1,
                  flexShrink: 0,
                  display: "block",
                }}
              />
            )}

            {/* ===== QUILL ===== */}
            <Box sx={{ flex: 1 }}>
              <ReactQuill
                ref={(el) => (quillRefs.current[oi] = el)}
                theme="snow"
                value={opt.text || ""}
                modules={quillModules}
                formats={quillFormats}
                className="choice-option-editor"
                onFocus={() => setActiveIndex(oi)}
                onChange={(html) => {
                  const newOptions = [...q.options];

                  newOptions[oi] = {
                    ...newOptions[oi],
                    text: html,
                  };

                  update(qi, {
                    options: newOptions,
                  });
                }}
              />
            </Box>
          </Box>

          {/* ================= TRUE / FALSE ================= */}
          <FormControl size="small" sx={{ width: 120 }}>
            <Select
              value={q.correct?.[oi] || ""}
              onChange={(e) => {
                const newCorrect = [...(q.correct || [])];

                newCorrect[oi] = e.target.value;

                update(qi, {
                  correct: newCorrect,
                });
              }}
            >
              <MenuItem value="">Chọn</MenuItem>
              <MenuItem value="Đ">Đúng</MenuItem>
              <MenuItem value="S">Sai</MenuItem>
            </Select>
          </FormControl>

          {/* ================= IMAGE BUTTONS ================= */}
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
          >
            <Tooltip title={opt.image ? "Xóa hình" : "Chèn hình"}>
              <IconButton
                size="small"
                sx={{
                  color: opt.image ? "#ff9800" : "#2196f3",
                }}
                onClick={() =>
                  opt.image
                    ? (() => {
                        const newOptions = [...q.options];

                        newOptions[oi] = {
                          ...newOptions[oi],
                          image: "",
                        };

                        update(qi, {
                          options: newOptions,
                        });
                      })()
                    : fileInputRefs.current[oi]?.click()
                }
              >
                {opt.image ? (
                    <InsertPhotoIcon sx={{ color: "#ff9800" }} />
                  ) : (
                    <InsertPhotoOutlinedIcon sx={{ color: "#2196f3" }} />
                  )}
              </IconButton>
            </Tooltip>

            <input
              type="file"
              accept="image/*"
              hidden
              ref={(el) => (fileInputRefs.current[oi] = el)}
              onChange={async (e) => {
                if (!e.target.files?.[0]) return;

                const url = await uploadToCloudinary(
                  e.target.files[0]
                );

                const newOptions = [...q.options];

                newOptions[oi] = {
                  ...newOptions[oi],
                  image: url,
                };

                update(qi, {
                  options: newOptions,
                });
              }}
            />

            {/* ================= DELETE OPTION ================= */}
            <IconButton
              onClick={() => {
                const newOptions = [...q.options];

                newOptions.splice(oi, 1);

                const newCorrect = [...(q.correct || [])];

                newCorrect.splice(oi, 1);

                update(qi, {
                  options: newOptions,
                  correct: newCorrect,
                });
              }}
            >
              <RemoveCircleOutlineIcon
                sx={{ color: "error.main" }}
              />
            </IconButton>
          </Stack>
        </Stack>
      ))}

      {/* ================= ADD OPTION ================= */}
      <Button
        variant="outlined"
        onClick={() =>
          update(qi, {
            options: [
              ...(q.options || []),
              {
                text: "",
                image: "",
                formats: {},
              },
            ],
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