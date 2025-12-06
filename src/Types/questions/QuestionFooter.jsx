import React from "react";
import {
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";

const QuestionFooter = ({ q, qi, update, handleDelete, saveAllQuestions }) => {

  const handleSaveQuestion = () => {
    // Gọi hàm lưu toàn bộ đề
    if (saveAllQuestions) {
      saveAllQuestions();
    } else {
      console.warn("saveAllQuestions không tồn tại!");
    }
  };

  return (
    <Stack
      direction="row"
      spacing={2}
      justifyContent="space-between"
      alignItems="center"
    >
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

      <Stack direction="row" spacing={1}>
        {/* Nút lưu */}
        <Tooltip title={`Lưu đề`}>
          <IconButton onClick={handleSaveQuestion} sx={{ color: "#1976d2" }}>
            <SaveIcon />
          </IconButton>
        </Tooltip>

        {/* Nút xoá */}
        <Tooltip title={`Xóa câu ${qi + 1}`}>
          <IconButton onClick={() => handleDelete(qi)}>
            <DeleteIcon color="error" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

export default QuestionFooter;
