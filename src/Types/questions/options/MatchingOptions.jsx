import React, { useRef, useState } from "react";
import {
  Stack,
  IconButton,
  Button,
  Box,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import InsertPhotoIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import InsertPhotoOutlinedIcon from "@mui/icons-material/Image";

import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/* ===== Quill config ===== */
const quillModules = { toolbar: false };
const quillFormats = ["bold", "italic", "underline"];

const MatchingOptions = ({ q, qi, update }) => {
  const fileInputs = useRef({});
  const quillRefs = useRef({});
  const [focused, setFocused] = useState({ pairIndex: null, side: null });
  const ratio = q.columnRatio || { left: 1, right: 1 };

  /* ================= Toolbar chung ================= */
  const applyFormat = (format) => {
    const { pairIndex, side } = focused;
    if (pairIndex == null || !side) return;

    const quill = quillRefs.current[`${pairIndex}-${side}`]?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (!range || range.length === 0) return;

    const current = quill.getFormat(range);
    quill.format(format, !current[format]);
  };

  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      {/* ===== Toolbar chung ===== */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mb: 1 }}>
        <FormControl size="small" sx={{ width: 80 }}>
          <InputLabel id="ratio-label">Tỉ lệ</InputLabel>
          <Select
            labelId="ratio-label"
            label="Tỉ lệ"
            value={`${ratio.left}:${ratio.right}`}
            onChange={(e) => {
              const [l, r] = e.target.value.split(":").map(Number);
              update(qi, { columnRatio: { left: l, right: r } });
            }}
          >
            <MenuItem value="1:1">1 : 1</MenuItem>
            <MenuItem value="1:2">1 : 2</MenuItem>
            <MenuItem value="2:1">2 : 1</MenuItem>
            <MenuItem value="1:3">1 : 3</MenuItem>
            <MenuItem value="3:1">3 : 1</MenuItem>
          </Select>
        </FormControl>

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

      {q.pairs?.map((pair, pi) => {
        const rowHeight = pair.leftImage ? 80 : "auto";

        return (
          <Stack
            key={pi}
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ minHeight: rowHeight }}
          >
            {/* ================= LEFT ================= */}
            <Box
              sx={{
                flexGrow: ratio.left,
                flexBasis: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              {(pair.leftImage?.preview || pair.leftImage?.url) && (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    maxHeight: 100,
                    mr: 1,
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={pair.leftImage.preview || pair.leftImage.url}
                    alt={pair.leftImage.name || ""}
                    style={{
                      maxHeight: 60,
                      width: "auto",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </Box>
              )}

              <Box sx={{ flexGrow: 1, flexBasis: 0 }}>
                <ReactQuill
                  ref={(el) => (quillRefs.current[`${pi}-left`] = el)}
                  theme="snow"
                  value={pair.left || ""}
                  modules={quillModules}
                  formats={quillFormats}
                  className="choice-option-editor"
                  placeholder={`A ${pi + 1}`}
                  onFocus={() => setFocused({ pairIndex: pi, side: "left" })}
                  onChange={(value) => {
                    if (value === pair.left) return;
                    const newPairs = [...q.pairs];
                    newPairs[pi].left = value;
                    update(qi, { pairs: newPairs });
                  }}
                />
              </Box>
            </Box>

            {/* ================= RIGHT (chỉ text, không ảnh) ================= */}
            <Box sx={{ flexGrow: ratio.right, flexBasis: 0 }}>
              <ReactQuill
                ref={(el) => (quillRefs.current[`${pi}-right`] = el)}
                theme="snow"
                value={pair.right || ""}
                modules={quillModules}
                formats={quillFormats}
                className="choice-option-editor"
                placeholder={`B ${pi + 1}`}
                onFocus={() => setFocused({ pairIndex: pi, side: "right" })}
                onChange={(value) => {
                  if (value === pair.right) return;
                  const newPairs = [...q.pairs];
                  newPairs[pi].right = value;
                  update(qi, { pairs: newPairs });
                }}
              />
            </Box>

            {/* ================= ACTIONS ================= */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={(pair.leftImage?.preview || pair.leftImage?.url) ? "Xóa hình" : "Chèn hình"}>
                <IconButton
                  size="small"
                  sx={{ color: (pair.leftImage?.preview || pair.leftImage?.url) ? "#ff9800" : "#2196f3" }}
                  onClick={() => {
                    if (pair.leftImage?.preview || pair.leftImage?.url) {
                      const newPairs = [...q.pairs];
                      newPairs[pi].leftImage = null;
                      update(qi, { pairs: newPairs });
                    } else {
                      fileInputs.current[`img-${pi}`]?.click();
                    }
                  }}
                >
                  {(pair.leftImage?.preview || pair.leftImage?.url) ? (
                    <InsertPhotoIcon sx={{ color: "#ff9800" }} />
                  ) : (
                    <InsertPhotoOutlinedIcon sx={{ color: "#2196f3" }} />
                  )}
                </IconButton>
              </Tooltip>

              <input
                hidden
                type="file"
                accept="image/*"
                ref={(el) => (fileInputs.current[`img-${pi}`] = el)}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const previewUrl = URL.createObjectURL(file);

                  const newPairs = [...q.pairs];
                  newPairs[pi].leftImage = {
                    preview: previewUrl,
                    file,
                    name: file.name,
                    url: "", // sẽ upload khi lưu
                  };
                  newPairs[pi].left = "";
                  update(qi, { pairs: newPairs });
                  e.target.value = "";
                }}
              />

              <IconButton
                onClick={() => {
                  const newPairs = [...q.pairs];
                  newPairs.splice(pi, 1);
                  update(qi, { pairs: newPairs });
                }}
              >
                <RemoveCircleOutlineIcon sx={{ color: "error.main" }} />
              </IconButton>
            </Stack>
          </Stack>
        );
      })}

      <Button
        variant="outlined"
        onClick={() =>
          update(qi, { pairs: [...q.pairs, { left: "", right: "" }] })
        }
      >
        Thêm cặp
      </Button>
    </Stack>
  );
};

export default MatchingOptions;
