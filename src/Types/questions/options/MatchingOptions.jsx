// src/DangCau/questions/options/MatchingOptions.jsx
import React from "react";
import { Stack, TextField, IconButton, Button } from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";


const MatchingOptions = ({ q, qi, update }) => (
<Stack spacing={1} sx={{ mb: 2 }}>
{q.pairs?.map((pair, pi) => (
<Stack key={pi} direction="row" spacing={1} alignItems="center">
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
/>


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
/>


<IconButton onClick={() => {
const newPairs = [...q.pairs];
newPairs.splice(pi, 1);
update(qi, { pairs: newPairs });
}}>
<RemoveCircleOutlineIcon sx={{ color: "error.main" }} />
</IconButton>
</Stack>
))}


<Button variant="outlined" onClick={() => update(qi, { pairs: [...q.pairs, { left: "", right: "" }] })}>
Thêm cặp
</Button>
</Stack>
);
export default MatchingOptions;