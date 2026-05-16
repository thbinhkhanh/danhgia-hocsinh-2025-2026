import React from "react";
import { Box, IconButton, Button } from "@mui/material";

const QuestionImage = ({ q, qi, update }) => {
  // Lấy src: nếu là string thì dùng trực tiếp, nếu là object thì lấy preview/url
  const getImageSrc = () => {
    if (!q.questionImage) return "";
    if (typeof q.questionImage === "string") return q.questionImage;
    return q.questionImage.preview || q.questionImage.url || "";
  };

  const src = getImageSrc();

  return (
    <Box sx={{ mt: -1, mb: 2 }}>
      {src ? (
        <Box sx={{ position: "relative", display: "inline-block" }}>
          <img
            src={src}
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
            onClick={() => update(qi, { questionImage: null })}
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
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const previewUrl = URL.createObjectURL(file);

              update(qi, {
                questionImage: {
                  preview: previewUrl,
                  file,
                  name: file.name,
                  url: "", // sẽ upload khi lưu
                },
              });

              e.target.value = "";
            }}
          />
        </Button>
      )}
    </Box>
  );
};

export default QuestionImage;
