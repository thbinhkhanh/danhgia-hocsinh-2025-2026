import React from "react";
import { Box, Paper, IconButton, Typography, Checkbox, Stack } from "@mui/material";

const ImageOptions = ({ q, qi, update }) => {
  const handleImageChange = (file, index) => {
    const reader = new FileReader();
    reader.onload = () => {
      const newOptions = [...q.options];
      newOptions[index] = reader.result;
      update(qi, { options: newOptions });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
      {Array.from({ length: 4 }).map((_, oi) => {
        const img = q.options?.[oi] || "";
        const isChecked = q.correct?.includes(oi) || false;

        return (
          <Box key={oi} sx={{ position: "relative" }}>
            <Paper
              sx={{
                width: { xs: "80%", sm: 120 },
                height: { xs: 80, sm: 120 },
                border: "2px dashed #90caf9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {img ? (
                <>
                  <img
                    src={img}
                    alt={`option-${oi}`}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                  <IconButton
                    size="small"
                    sx={{ position: "absolute", top: 2, right: 2 }}
                    onClick={() => {
                      const newOptions = [...q.options];
                      newOptions[oi] = "";
                      update(qi, { options: newOptions });

                      const newCorrect = (q.correct || []).filter(c => c !== oi);
                      update(qi, { correct: newCorrect });
                    }}
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
                  <Typography variant="body2" sx={{ textAlign: "center" }}>
                    Tải hình lên
                  </Typography>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0], oi)}
                  />
                </label>
              )}
            </Paper>

            {img && (
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
    </Stack>
  );
};

export default ImageOptions;
