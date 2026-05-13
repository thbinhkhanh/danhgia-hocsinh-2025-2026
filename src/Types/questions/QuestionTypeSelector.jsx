// src/DangCau/questions/QuestionTypeSelector.jsx
import React from "react";
import { Stack, FormControl, TextField, InputLabel, Select, MenuItem } from "@mui/material";


const QuestionTypeSelector = ({ q, qi, update }) => {
  const handleChange = (type) => {
    let patch = { type };

    // ===== SORT =====
    if (
      type === "sort" &&
      (!q.correct || q.correct.length === 0)
    ) {
      patch.correct = q.options?.map((_, i) => i) || [];
    }

    // ===== MATCHING =====
    if (
      type === "matching" &&
      (!q.pairs || q.pairs.length === 0)
    ) {
      patch.pairs = Array.from({ length: 4 }, () => ({
        left: "",
        right: "",
      }));
    }

    // ===== SINGLE =====
    if (
      type === "single" &&
      (!q.correct || q.correct.length === 0)
    ) {
      patch.correct = [0];
    }

    // ===== MULTIPLE =====
    if (type === "multiple" && !q.correct) {
      patch.correct = [];
    }

    // ===== IMAGE =====
    if (
      type === "image" &&
      (!q.options || q.options.length === 0)
    ) {
      patch.options = [
        { text: "", image: "" },
        { text: "", image: "" },
        { text: "", image: "" },
        { text: "", image: "" },
      ];
    }

    // ===== FILLBLANK =====
    if (type === "fillblank") {
      if (!q.option) {
        patch.option = "";
      }

      if (!q.answers) {
        patch.answers = [];
      }
    }

    update(qi, patch);
  };


return (
<Stack direction="row" spacing={2} sx={{ mb: -2 }}>
<FormControl size="small" sx={{ width: 180 }}>
<InputLabel>Loại câu hỏi</InputLabel>
<Select value={q.type} label="Loại câu hỏi" onChange={(e) => handleChange(e.target.value)}>
<MenuItem value="truefalse">Đúng – Sai</MenuItem>
<MenuItem value="single">Một lựa chọn</MenuItem>
<MenuItem value="multiple">Nhiều lựa chọn</MenuItem>
<MenuItem value="matching">Ghép đôi</MenuItem>
<MenuItem value="image">Hình ảnh</MenuItem>
<MenuItem value="sort">Sắp xếp</MenuItem>
<MenuItem value="fillblank">Điền khuyết</MenuItem>
</Select>
</FormControl>

<TextField
  label="Điểm"
  type="number"
  size="small"
  value={q.score}
  inputProps={{ step: 0.5 }}     // ⭐ Bước tăng 0.5
  onChange={(e) => {
    const v = e.target.value;
    update(qi, { score: v === "" ? "" : parseFloat(v) });
  }}
  sx={{ width: 80 }}
/>

</Stack>
);
};
export default QuestionTypeSelector;