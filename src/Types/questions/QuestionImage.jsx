import React from "react";
import { Box, IconButton, Button } from "@mui/material";

const QuestionImage = ({ q, qi, update }) => (
  <Box sx={{ mt: -1, mb: 2 }}>
    {q.questionImage ? (
      <Box sx={{ position: "relative", display: "inline-block" }}>
        <img
          src={q.questionImage}
          alt="question"
          style={{
            maxWidth: "100%",
            maxHeight: 260,
            objectFit: "contain",
            borderRadius: 8,
            border: "1px solid #ccc",
            marginTop: 8
          }}
        />
        <IconButton
          size="small"
          sx={{ position: "absolute", top: 4, right: 4, backgroundColor: "#fff" }}
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
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => update(qi, { questionImage: reader.result });
            reader.readAsDataURL(f);
          }}
        />
      </Button>
    )}
  </Box>
);

export default QuestionImage;
