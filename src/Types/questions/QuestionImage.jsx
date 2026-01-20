import React from "react";
import { Box, IconButton, Button } from "@mui/material";

const QuestionImage = ({ q, qi, update }) => {
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
  const handleImageChange = async (file) => {
    try {
      const url = await uploadToCloudinary(file);
      update(qi, { questionImage: url });
    } catch (err) {
      console.error(err);
      alert("Upload hình thất bại!");
    }
  };

  return (
    <Box sx={{ mt: -1, mb: 2 }}>
      {q.questionImage ? (
        <Box sx={{ position: "relative", display: "inline-block" }}>
          <img
            src={q.questionImage}
            alt="question"
            style={{
              maxWidth: "100%",
              maxHeight: 120,
              objectFit: "contain",
              borderRadius: 8,
              border: "1px solid #ccc",
              marginTop: 8,
            }}
          />

          <IconButton
            size="small"
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              backgroundColor: "#fff",
            }}
            onClick={() => update(qi, { questionImage: "" })}
          >
            ✕
          </IconButton>
        </Box>
      ) : (
        <Button variant="outlined" component="label">
          📷 Thêm hình minh họa
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) =>
              e.target.files?.[0] && handleImageChange(e.target.files[0])
            }
          />
        </Button>
      )}
    </Box>
  );
};

export default QuestionImage;
