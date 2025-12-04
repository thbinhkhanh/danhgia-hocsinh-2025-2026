import React from "react";
import { Stack, FormControl, InputLabel, Select, MenuItem, Typography, Tooltip, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

const QuestionFooter = ({ q, qi, update, handleDelete }) => (
  <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
    <FormControl size="small" sx={{ width: 150 }}>
      <InputLabel>Kiểu sắp xếp</InputLabel>
      <Select
        value={q.sortType || "fixed"}
        label="Kiểu sắp xếp"
        onChange={(e) => update(qi, { sortType: e.target.value })}
      >
        <MenuItem value="fixed">Cố định</MenuItem>
        <MenuItem value="shuffle">Đảo câu</MenuItem>
      </Select>
    </FormControl>

    {/*<Typography sx={{ color: q.isValid ? "green" : "red" }}>
      {q.isValid ? "Hợp lệ" : "Chưa hợp lệ"}
    </Typography>*/}

    <Tooltip title={`Xóa câu ${qi + 1}`}>
      <IconButton onClick={() => handleDelete(qi)}>
        <DeleteIcon color="error" />
      </IconButton>
    </Tooltip>
  </Stack>
);

export default QuestionFooter;
