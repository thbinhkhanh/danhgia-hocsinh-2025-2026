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
import InsertPhotoIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import InsertPhotoOutlinedIcon from "@mui/icons-material/Image";

import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import UnsupportedImageDialog from "../../../dialog/UnsupportedImageDialog";
import EditTrueFalseDialog from "../../../dialog/EditTrueFalseDialog";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const quillModules = { toolbar: false };
const quillFormats = ["bold", "italic", "underline"];

const TrueFalseOptions = ({ q, qi, update }) => {
  const quillRefs = useRef([]);
  const fileInputRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [tempLabel, setTempLabel] = useState("");
  const trueLabel = q.trueLabel ?? "Đúng";
  const falseLabel = q.falseLabel ?? "Sai";
  const [openEdit, setOpenEdit] = useState(false);
  const [editTrue, setEditTrue] = useState("");
  const [editFalse, setEditFalse] = useState("");
 

  const ALLOWED_TYPES = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
  ];

  const showUnsupportedDialog = () => {
    setOpenDialog(true);
  };


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
      {/* Toolbar */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mb: 1 }}>
        <IconButton
          size="small"
          onClick={() => applyFormat("bold")}
          sx={{ p: 0.4 }}
        >
          <FormatBoldIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => applyFormat("italic")}
          sx={{ p: 0.4 }}
        >
          <FormatItalicIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => applyFormat("underline")}
          sx={{ p: 0.4 }}
        >
          <FormatUnderlinedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Options */}
      {q.options?.map((opt, oi) => (
        <Stack key={oi} direction="row" spacing={1} alignItems="center">
          {/* Editor + Image */}
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
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
                  newOptions[oi] = { ...newOptions[oi], text: html };
                  update(qi, { options: newOptions });
                }}
              />
            </Box>
          </Box>

          {/* True/False Select */}
        
          <FormControl size="small" sx={{ width: 140 }}>
            <Select
              value={q.correct?.[oi] || ""}
              displayEmpty
              onChange={(e) => {
                const value = e.target.value;

                // nếu chọn chỉnh sửa thì không update value
                if (value === "__edit_labels__") {
                  setEditTrue(trueLabel);
                  setEditFalse(falseLabel);
                  setOpenEdit(true);
                  return;
                }

                const newCorrect = [...(q.correct || [])];
                newCorrect[oi] = value;

                update(qi, {
                  ...q,
                  correct: newCorrect,
                });
              }}
              renderValue={(selected) => {
                if (!selected) return "Chọn";

                if (selected === "Đ") return trueLabel;
                if (selected === "S") return falseLabel;

                return selected;
              }}
            >
              <MenuItem value="">Chọn</MenuItem>

              <MenuItem value="Đ">{trueLabel}</MenuItem>

              <MenuItem value="S">{falseLabel}</MenuItem>

              {/* 👇 MENU CHỈNH SỬA */}
              <MenuItem
                value="__edit_labels__"
                sx={{
                  borderTop: "1px solid #eee",
                  mt: 1,
                  pt: 1,
                  color: "primary.main",
                  fontWeight: 500,
                }}
              >
                Chỉnh sửa nhãn…
              </MenuItem>
            </Select>
          </FormControl>

          {/* Image buttons */}
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
                      image: "",
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

            <input
              type="file"
              accept="image/*"
              hidden
              ref={(el) => (fileInputRefs.current[oi] = el)}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                // ❌ validate ảnh
                if (!ALLOWED_TYPES.includes(file.type)) {
                  showUnsupportedDialog();
                  e.target.value = "";
                  return;
                }

                const previewUrl = URL.createObjectURL(file);

                const newOptions = [...q.options];
                newOptions[oi] = {
                  ...newOptions[oi],
                  imagePreview: previewUrl,
                  imageFile: file,
                };

                update(qi, { options: newOptions });
                e.target.value = "";
              }}
            />

            {/* Delete option */}
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
        </Stack>
      ))}

      {/* Add option */}
      <Button
        variant="outlined"
        onClick={() =>
          update(qi, {
            options: [
              ...(q.options || []),
              { text: "", imagePreview: "", imageFile: null, image: "", formats: {} },
            ],
            correct: [...(q.correct || []), ""],
          })
        }
      >
        Thêm mục
      </Button>

      <UnsupportedImageDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      />

      <EditTrueFalseDialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        editTrue={editTrue}
        setEditTrue={setEditTrue}
        editFalse={editFalse}
        setEditFalse={setEditFalse}
        onSave={() => {
          update(qi, {
            ...q,
            trueLabel: editTrue || "Đúng",
            falseLabel: editFalse || "Sai",
          });

          setOpenEdit(false);
        }}
      />

    </Stack>
  );
};

export default TrueFalseOptions;
