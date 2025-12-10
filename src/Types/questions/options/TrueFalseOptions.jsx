// src/DangCau/questions/options/TrueFalseOptions.jsx
import React from "react";
import { Stack, TextField, FormControl, Select, MenuItem, IconButton, Button } from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";

const TrueFalseOptions = ({ q, qi, update }) => (
  <Stack spacing={1} sx={{ mb: 2 }}>
    {q.options?.map((opt, oi) => (
      <Stack key={oi} direction="row" spacing={1} alignItems="center">
        <TextField
          value={opt}
          size="small"
          fullWidth
          multiline          // cho phép xuống dòng
          minRows={1}        // tối thiểu 2 dòng
          onChange={(e) => {
            const newOptions = [...q.options];
            newOptions[oi] = e.target.value;
            update(qi, { options: newOptions });
          }}
        />

        <FormControl size="small" sx={{ width: 120 }}>
          <Select
            value={q.correct?.[oi] || ""}
            onChange={(e) => {
              const newCorrect = [...(q.correct || [])];
              newCorrect[oi] = e.target.value;
              update(qi, { correct: newCorrect });
            }}
          >
            <MenuItem value="">Chọn</MenuItem>
            <MenuItem value="Đ">Đúng</MenuItem>
            <MenuItem value="S">Sai</MenuItem>
          </Select>
        </FormControl>

        <IconButton
          onClick={() => {
            const newOptions = [...q.options];
            newOptions.splice(oi, 1);
            const newCorrect = [...(q.correct || [])];
            newCorrect.splice(oi, 1);
            update(qi, { options: newOptions, correct: newCorrect });
          }}
        >
          <RemoveCircleOutlineIcon sx={{ color: "error.main" }} />
        </IconButton>
      </Stack>
    ))}

    <Button
      variant="outlined"
      onClick={() =>
        update(qi, {
          options: [...q.options, ""],
          correct: [...(q.correct || []), ""],
        })
      }
    >
      Thêm mục
    </Button>
  </Stack>
);

export default TrueFalseOptions;