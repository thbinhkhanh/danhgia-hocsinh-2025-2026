// src/DangCau/questions/options/FillBlankOptions.jsx
import React from "react";
import { Stack, TextField, Typography, Grid, IconButton, Button, Box } from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";


const FillBlankOptions = ({ q, qi, update }) => (
<Stack spacing={2}>
<TextField fullWidth multiline minRows={2} label="Nhập câu hỏi với [...] cho chỗ trống" value={q.option || ""} onChange={(e) => update(qi, { option: e.target.value })} />


<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Từ cần điền</Typography>


<Grid container spacing={1}>
{q.options?.map((opt, oi) => (
<Grid item xs={12} sm={6} key={oi}>
<Stack direction="row" spacing={1} alignItems="center">
<TextField size="small" fullWidth value={opt} onChange={(e) => {
const newOptions = [...q.options];
newOptions[oi] = e.target.value;
update(qi, { options: newOptions });
}} />


<IconButton onClick={() => {
const newOptions = [...q.options];
newOptions.splice(oi, 1);
update(qi, { options: newOptions });
}}>
<RemoveCircleOutlineIcon sx={{ color: "error.main" }} />
</IconButton>
</Stack>
</Grid>
))}


<Grid item xs={12}>
<Button variant="contained" onClick={() => update(qi, { options: [...q.options, ""] })}>
Thêm từ
</Button>
</Grid>
</Grid>


<Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1976d2" }}>Xem trước câu hỏi</Typography>


<Box sx={{ p: 1, border: "1px dashed #90caf9", borderRadius: 1, minHeight: 50 }}>
{q.option ? q.option.split("[...]").map((part, i, arr) => (
<React.Fragment key={i}>
<span>{part}</span>
{i < arr.length - 1 && <Box component="span" sx={{ display: "inline-block", minWidth: 60, borderBottom: "2px solid #000", mx: 0.5 }} />}
</React.Fragment>
)) : "Câu hỏi chưa có nội dung"}
</Box>
</Stack>
);
export default FillBlankOptions;