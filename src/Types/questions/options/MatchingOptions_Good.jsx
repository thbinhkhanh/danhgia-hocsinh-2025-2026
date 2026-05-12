import React, { useRef, useState } from "react";
import { Stack, IconButton, Button, Box, Tooltip, FormControl, Select, MenuItem, InputLabel } from "@mui/material";
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

/* ===== Quill config ===== */
const quillModules = { toolbar: false };
const quillFormats = ["bold", "italic", "underline"];

const MatchingOptions = ({ q, qi, update }) => {
  const fileInputs = useRef({});
  const quillRefs = useRef({});
  const [focused, setFocused] = useState({ pairIndex: null, side: null });
  const ratio = q.columnRatio || { left: 1, right: 1 };

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
        <FormControl size="small" sx={{ width: 80 }}>
          <InputLabel id="ratio-label">Tỉ lệ</InputLabel>
            <Select
              labelId="ratio-label"
              label="Tỉ lệ"
              value={`${ratio.left}:${ratio.right}`}
              onChange={(e) => {
                const [l, r] = e.target.value.split(":").map(Number);

                update(qi, {
                  columnRatio: { left: l, right: r },
                });
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
                        maxHeight: 50,
                        width: "auto",
                        objectFit: "contain",
                        mr: 1,
                      }}
                    />
                  )}

                  <Box
                    sx={{
                      flexGrow: ratio.right,
                      flexBasis: 0,
                    }}
                  >

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
                    sx={{ color: "#1976d2" }}
                    onClick={() => fileInputs.current[`icon-${pi}`]?.click()}
                  >
                    <InsertPhotoOutlinedIcon />
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
                    sx={{ color: "#ff9800" }}
                    onClick={() => {
                      const newPairs = [...q.pairs];
                      newPairs[pi].leftIconImage = null;
                      update(qi, { pairs: newPairs });
                    }}
                  >
                    <InsertPhotoIcon />
                  </IconButton>
                </Tooltip>
              )}

              {!pair.leftImage ? (
                <Tooltip title="Chèn hình thay text">
                  <IconButton
                    size="small"
                    sx={{ color: "#64b5f6" }}
                    onClick={() => fileInputs.current[`img-${pi}`]?.click()}
                  >
                    <InsertPhotoOutlinedIcon />
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
                    sx={{ color: "#ff9800" }}
                    onClick={() => {
                      const newPairs = [...q.pairs];
                      newPairs[pi].leftImage = null;
                      update(qi, { pairs: newPairs });
                    }}
                  >
                    <InsertPhotoIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            {/* ================= RIGHT ================= */}
            <Box
              sx={{
                flexGrow: ratio.right,
                flexBasis: 0,
                display: "flex",
                alignItems: "center",
                minWidth: 0,
              }}
            >

              {/* ================= CONTENT ================= */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {/* ===== IMAGE REPLACE TEXT ===== */}
                {pair.rightImage ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mr: 1,
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={pair.rightImage.url}
                      alt={pair.rightImage.name}
                      style={{
                        maxHeight: 50,
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </Box>
                ) : (
                  <>
                    {/* ICON BEFORE TEXT */}
                    {pair.rightIconImage && (
                      <Box
                        component="img"
                        src={pair.rightIconImage.url}
                        alt={pair.rightIconImage.name}
                        sx={{
                          maxHeight: 50,
                          mr: 1,
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {/* TEXT EDITOR */}
                    <Box sx={{ width: "100%", minWidth: 0 }}>
                      <ReactQuill
                        ref={(el) =>
                          (quillRefs.current[`${pi}-right`] = el)
                        }
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
                          const newPairs = [...q.pairs];
                          newPairs[pi].right = value;
                          update(qi, { pairs: newPairs });
                        }}
                      />
                    </Box>
                  </>
                )}
              </Box>

              {/* ================= FIXED GAP ================= */}
              <Box sx={{ width: 8, flexShrink: 0 }} />

              {/* ================= ICON COLUMN (CỐ ĐỊNH THẲNG HÀNG) ================= */}
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  width: 90,
                  minWidth: 90,
                  justifyContent: "flex-end",
                  flexShrink: 0,
                }}
              >
                {/* ===== ICON BEFORE TEXT ===== */}
                {!pair.rightIconImage ? (
                  <Tooltip title="Chèn hình trước text">
                    <IconButton
                      size="small"
                      sx={{ color: "#1976d2" }}
                      onClick={() =>
                        fileInputs.current[`ricon-${pi}`]?.click()
                      }
                    >
                      <InsertPhotoOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Xóa hình trước text">
                    <IconButton
                      size="small"
                      sx={{ color: "#ff9800" }}
                      onClick={() => {
                        const newPairs = [...q.pairs];
                        newPairs[pi].rightIconImage = null;
                        update(qi, { pairs: newPairs });
                      }}
                    >
                      <InsertPhotoIcon />
                    </IconButton>
                  </Tooltip>
                )}

                {/* ===== ICON REPLACE TEXT ===== */}
                {!pair.rightImage ? (
                  <Tooltip title="Chèn hình thay text">
                    <IconButton
                      size="small"
                      sx={{ color: "#64b5f6" }}
                      onClick={() =>
                        fileInputs.current[`rimg-${pi}`]?.click()
                      }
                    >
                      <InsertPhotoOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Xóa hình thay text">
                    <IconButton
                      size="small"
                      sx={{ color: "#ff9800" }}
                      onClick={() => {
                        const newPairs = [...q.pairs];
                        newPairs[pi].rightImage = null;
                        newPairs[pi].right = "";
                        update(qi, { pairs: newPairs });
                      }}
                    >
                      <InsertPhotoIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>

              {/* ================= FILE INPUTS (STABLE, KHÔNG MẤT EVENT) ================= */}
              <input
                type="file"
                hidden
                ref={(el) => (fileInputs.current[`ricon-${pi}`] = el)}
                onChange={async (e) => {
                  if (!e.target.files?.[0]) return;

                  const url = await uploadToCloudinary(e.target.files[0]);

                  const newPairs = [...q.pairs];
                  newPairs[pi].rightIconImage = {
                    url,
                    name: e.target.files[0].name,
                  };

                  update(qi, { pairs: newPairs });
                }}
              />

              <input
                type="file"
                hidden
                ref={(el) => (fileInputs.current[`rimg-${pi}`] = el)}
                onChange={async (e) => {
                  if (!e.target.files?.[0]) return;

                  const url = await uploadToCloudinary(e.target.files[0]);

                  const newPairs = [...q.pairs];
                  newPairs[pi].rightImage = {
                    url,
                    name: e.target.files[0].name,
                  };

                  newPairs[pi].right = "";

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
