// src/DangCau/questions/QuestionHeader.jsx
import React from "react";
import { Typography, TextField, Box, IconButton, Button } from "@mui/material";
import QuestionImage from "./QuestionImage";

const QuestionHeader = ({ q, qi, update }) => (
<>
<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
Câu hỏi {qi + 1}
</Typography>


<TextField
fullWidth
multiline
label="Nội dung câu hỏi"
value={q.question || ""}
onChange={(e) => update(qi, { question: e.target.value })}
sx={{ mb: 2 }}
/>


<QuestionImage q={q} qi={qi} update={update} />
</>
);
export default QuestionHeader;