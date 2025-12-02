// src/DangCau/questions/QuestionTypeSelector.jsx
import React from "react";
import { Stack, FormControl, TextField, InputLabel, Select, MenuItem } from "@mui/material";


const QuestionTypeSelector = ({ q, qi, update }) => {
const handleChange = (type) => {
let patch = { type };
if (type === "sort") patch.correct = q.options.map((_, i) => i);
if (type === "matching") patch.pairs = q.pairs?.length ? q.pairs : Array.from({ length: 4 }, () => ({ left: "", right: "" }));
if (type === "single") patch.correct = [0];
if (type === "multiple") patch.correct = [];
if (type === "image") patch.options = ["", "", "", ""];
if (type === "fillblank") { patch.options = []; patch.answers = []; }
update(qi, patch);
};


return (
<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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


<TextField label="Điểm" type="number" size="small" value={q.score} onChange={(e) => update(qi, { score: parseFloat(e.target.value) || 1 })} sx={{ width: 80 }} />
</Stack>
);
};
export default QuestionTypeSelector;