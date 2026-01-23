import React, { useRef, useState } from "react";
import { Stack, IconButton, Button, Box, Tooltip } from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
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

  /* ================= Upload Cloudinary ================= */
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
            <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
              {pair.leftImage && (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    maxHeight: 100,     // ⭐ tối đa 100
                    mr: 1,
                    flexShrink: 0,
                    overflow: "hidden", // tránh tràn
                  }}
                >
                  <img
                    src={pair.leftImage.url}
                    alt={pair.leftImage.name}
                    style={{
                      maxHeight: 60,            // ⭐ giới hạn chiều cao
                      width: "auto",            // ⭐ auto chiều rộng
                      height: "auto",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </Box>
              )}

              {!pair.leftImage && (
                <>
                  {pair.leftIconImage && (
                    <Box
                      component="img"
                      src={pair.leftIconImage.url}
                      alt={pair.leftIconImage.name}
                      sx={{
                        maxHeight: 40,
                        width: "auto",
                        objectFit: "contain",
                        mr: 1,
                      }}
                    />
                  )}

                  <Box sx={{ flex: 1 }}>
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
                </>
              )}
            </Box>


            {/* ================= ICONS (GIỮ NGUYÊN) ================= */}
            <Stack direction="row" spacing={0.5}>
              {!pair.leftIconImage ? (
                <Tooltip title="Chèn hình trước text">
                  <IconButton
                    size="small"
                    sx={{ color: "#1976d2", border: "1px solid #1976d2" }}
                    onClick={() => fileInputs.current[`icon-${pi}`]?.click()}
                  >
                    <PhotoCamera />
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      ref={(el) =>
                        (fileInputs.current[`icon-${pi}`] = el)
                      }
                      onChange={async (e) => {
                        if (!e.target.files?.[0]) return;
                        const url = await uploadToCloudinary(
                          e.target.files[0]
                        );
                        const newPairs = [...q.pairs];
                        newPairs[pi].leftIconImage = {
                          url,
                          name: e.target.files[0].name,
                        };
                        update(qi, { pairs: newPairs });
                      }}
                    />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Xóa hình trước text">
                  <IconButton
                    size="small"
                    sx={{ color: "#ff9800", border: "1px solid #ff9800" }}
                    onClick={() => {
                      const newPairs = [...q.pairs];
                      newPairs[pi].leftIconImage = null;
                      update(qi, { pairs: newPairs });
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}

              {!pair.leftImage ? (
                <Tooltip title="Chèn hình thay text">
                  <IconButton
                    size="small"
                    sx={{ color: "#64b5f6", border: "1px solid #64b5f6" }}
                    onClick={() => fileInputs.current[`img-${pi}`]?.click()}
                  >
                    <PhotoCamera />
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      ref={(el) =>
                        (fileInputs.current[`img-${pi}`] = el)
                      }
                      onChange={async (e) => {
                        if (!e.target.files?.[0]) return;
                        const url = await uploadToCloudinary(
                          e.target.files[0]
                        );
                        const newPairs = [...q.pairs];
                        newPairs[pi].leftImage = {
                          url,
                          name: e.target.files[0].name,
                        };
                        newPairs[pi].left = "";
                        update(qi, { pairs: newPairs });
                      }}
                    />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Xóa hình thay text">
                  <IconButton
                    size="small"
                    sx={{ color: "#ff9800", border: "1px solid #ff9800" }}
                    onClick={() => {
                      const newPairs = [...q.pairs];
                      newPairs[pi].leftImage = null;
                      update(qi, { pairs: newPairs });
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            {/* ================= RIGHT ================= */}
            <Box sx={{ flex: 1 }}>
              <ReactQuill
                ref={(el) => (quillRefs.current[`${pi}-right`] = el)}
                theme="snow"
                value={pair.right || ""}
                modules={quillModules}
                formats={quillFormats}
                className="choice-option-editor"
                placeholder={`B ${pi + 1}`}
                onFocus={() =>
                  setFocused({ pairIndex: pi, side: "right" })
                }
                onChange={(value) => {
                  if (value === pair.right) return;
                  const newPairs = [...q.pairs];
                  newPairs[pi].right = value;
                  update(qi, { pairs: newPairs });
                }}
              />
            </Box>

            {/* ================= REMOVE ================= */}
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
