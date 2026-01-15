import React from "react";
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Checkbox,
  Stack,
  Button,
} from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";

const ImageOptions = ({ q, qi, update }) => {
  // ---- Upload Cloudinary ----
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

  // ---- Khi chọn hình ----
  const handleImageChange = async (file, index) => {
    try {
      const url = await uploadToCloudinary(file);

      const newOptions = [...q.options];
      newOptions[index] = url;

      update(qi, { options: newOptions });
    } catch (err) {
      console.error(err);
      alert("Upload hình thất bại!");
    }
  };

  // ---- Thêm ô hình ----
  const addOption = () => {
    const newOptions = [...(q.options || []), ""];
    update(qi, { options: newOptions });
  };

  // ---- Xoá ô hình (dồn mảng) ----
  const removeOption = (index) => {
    const options = q.options || [];
    const correct = q.correct || [];

    const newOptions = options.filter((_, i) => i !== index);

    // cập nhật correct vì index bị dịch
    const newCorrect = correct
      .filter((c) => c !== index)
      .map((c) => (c > index ? c - 1 : c));

    update(qi, { options: newOptions, correct: newCorrect });
  };

  return (
    <Stack spacing={2} mb={2}>
      {/* ===== Toolbar chung (chỉ để đồng bộ, disable) ===== */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <IconButton size="small" disabled>
          <FormatBoldIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" disabled>
          <FormatItalicIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" disabled>
          <FormatUnderlinedIcon fontSize="small" />
        </IconButton>
      </Box>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        flexWrap="wrap"
        alignItems="center"
      >
        {(q.options || []).map((option, oi) => {
          const imageUrl = option?.text || "";
          const isChecked = q.correct?.includes(oi) || false;

          return (
            <Box key={oi} sx={{ position: "relative" }}>
              <Paper
                sx={{
                  width: 120,
                  height: 120,
                  border: "2px dashed #90caf9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt={`option-${oi}`}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />

                    <IconButton
                      size="small"
                      sx={{ position: "absolute", top: 2, right: 2 }}
                      onClick={() => removeOption(oi)}
                    >
                      ✕
                    </IconButton>
                  </>
                ) : (
                  <label
                    style={{
                      cursor: "pointer",
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography variant="body2" align="center">
                      Tải hình
                    </Typography>

                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleImageChange(qi, oi, e.target.files[0])
                      }
                    />
                  </label>
                )}
              </Paper>

              {imageUrl && (
                <Checkbox
                  checked={isChecked}
                  onChange={(e) => {
                    let newCorrect = [...(q.correct || [])];
                    if (e.target.checked) newCorrect.push(oi);
                    else newCorrect = newCorrect.filter((c) => c !== oi);
                    update(qi, { correct: newCorrect });
                  }}
                  sx={{
                    position: "absolute",
                    top: -10,
                    left: -10,
                    bgcolor: "background.paper",
                    borderRadius: "50%",
                  }}
                />
              )}
            </Box>
          );
        })}


        {/* Nút thêm hình */}
        <Button
          variant="outlined"
          onClick={addOption}
          sx={{
            height: 120,
            width: 120,
            borderRadius: 2,
            borderStyle: "dashed",
          }}
        >
          + Thêm hình
        </Button>
      </Stack>
    </Stack>
  );
};

export default ImageOptions;