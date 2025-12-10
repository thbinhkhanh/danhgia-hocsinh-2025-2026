// src/Types/questions/options/MatchingOptions.jsx
import React, { useRef } from "react";
import { Stack, TextField, IconButton, Button, Box } from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";

const MatchingOptions = ({ q, qi, update }) => {
  const fileInputs = useRef({});

  // Upload Cloudinary
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "tracnghiem_upload");
    formData.append("folder", "questions");

    const res = await fetch("https://api.cloudinary.com/v1_1/dxzpfljv4/image/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload hình thất bại");

    const data = await res.json();
    return data.secure_url;
  };

  // Khi chọn hình
  const handleImageChange = async (e, pi) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newPairs = [...q.pairs];

    try {
      const url = await uploadToCloudinary(file);

      newPairs[pi] = {
        ...newPairs[pi],
        leftImage: { url, name: file.name },
        left: "", // chuyển text → ảnh
      };

      update(qi, { pairs: newPairs });

      e.target.value = ""; // reset file input để lần sau chọn file giống nhau vẫn trigger
    } catch (err) {
      console.error(err);
      alert("Upload hình thất bại!");
    }
  };

  // Xóa hình → quay lại TextField
  const removeImage = (pi) => {
    const newPairs = [...q.pairs];

    newPairs[pi] = {
      left: "",
      right: newPairs[pi].right ?? "",
    };

    update(qi, { pairs: newPairs });
  };

  return (
  <Stack spacing={1} sx={{ mb: 2 }}>
    {q.pairs?.map((pair, pi) => {
      const rowHeight = pair.leftImage ? 80 : 40;

      return (
        <Stack
          key={pi}
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ height: rowHeight }}
        >
          {/* LEFT TEXT OR IMAGE */}
          {pair.leftImage ? (
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
                width: "100%",
                height: rowHeight,

                // ⭐ Nền trắng khi là hình
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={pair.leftImage.url}
                alt={pair.leftImage.name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            </Box>
          ) : (
            <TextField
              label={`A ${pi + 1}`}
              size="small"
              value={pair.left}
              fullWidth
              onChange={(e) => {
                const newPairs = [...q.pairs];
                newPairs[pi].left = e.target.value;
                update(qi, { pairs: newPairs });
              }}
              sx={{
                height: rowHeight,
                "& .MuiInputBase-root": { height: rowHeight },
              }}
            />
          )}

          {/* IMAGE BUTTON / DELETE */}
          {!pair.leftImage ? (
            <>
              <input
                type="file"
                accept="image/*"
                id={`img-${pi}`}
                hidden
                onChange={(e) => handleImageChange(e, pi)}
              />
              <label htmlFor={`img-${pi}`}>
                <IconButton component="span" size="small">
                  <PhotoCamera />
                </IconButton>
              </label>
            </>
          ) : (
            <IconButton size="small" onClick={() => removeImage(pi)}>
              <DeleteIcon />
            </IconButton>
          )}

          {/* RIGHT TEXTFIELD (MATCH HEIGHT) */}
          <TextField
            label={`B ${pi + 1}`}
            size="small"
            fullWidth
            value={pair.right}
            onChange={(e) => {
              const newPairs = [...q.pairs];
              newPairs[pi].right = e.target.value;
              update(qi, { pairs: newPairs });
            }}
            sx={{
              height: rowHeight,
              "& .MuiInputBase-root": { height: rowHeight },
            }}
          />

          {/* REMOVE ROW */}
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

    {/* ADD PAIR */}
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
