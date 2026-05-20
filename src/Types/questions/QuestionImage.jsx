import React, { useState } from "react";
import { Box, IconButton, Button } from "@mui/material";
import UnsupportedImageDialog from "../../dialog/UnsupportedImageDialog";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";

const QuestionImage = ({ q, qi, update }) => {
  const [openDialog, setOpenDialog] = useState(false);

  const ALLOWED_TYPES = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
  ];

  // Lấy src: nếu là string thì dùng trực tiếp, nếu là object thì lấy preview/url
  const getImageSrc = () => {
    if (!q.questionImage) return "";
    if (typeof q.questionImage === "string") return q.questionImage;
    return q.questionImage.preview || q.questionImage.url || "";
  };

  const showUnsupportedDialog = () => {
    setOpenDialog(true);
  };

  const src = getImageSrc();

  return (
    <Box sx={{ mt: -1, mb: -4 }}>
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
            onClick={() => update(qi, { questionImage: null })}
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              bgcolor: "white",
              color: "red",
              fontSize: 14,
              "&:hover": {
                bgcolor: "#eee",
              },
            }}
          >
            ✕
          </IconButton>
        </Box>
      ) : (
        <Button
          variant="outlined"
          component="label"
          startIcon={<AddPhotoAlternateRoundedIcon />}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 500,
            px: 2,
            py: 1,
          }}
        >
          Hình câu hỏi

          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              if (!ALLOWED_TYPES.includes(file.type)) {
                setOpenDialog(true); // ✅ gọi trực tiếp luôn cho chắc
                e.target.value = "";
                return;
              }

              const previewUrl = URL.createObjectURL(file);

              update(qi, {
                questionImage: {
                  preview: previewUrl,
                  file,
                  name: file.name,
                  url: "",
                },
              });

              e.target.value = "";
            }}
          />
        </Button>
      )}

      {/* ===== DIALOG ===== */}
      <UnsupportedImageDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      />

    </Box>
  );
};

export default QuestionImage;
