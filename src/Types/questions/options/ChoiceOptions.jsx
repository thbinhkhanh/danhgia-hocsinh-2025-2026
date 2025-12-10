// src/DangCau/questions/options/ChoiceOptions.jsx
import React from "react";
import { Stack, TextField, IconButton, Radio, Checkbox, Button } from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";

const ChoiceOptions = ({ q, qi, update }) => (
  <Stack spacing={1} sx={{ mb: 2 }}>
    {q.options?.map((opt, oi) => (
      <Stack key={oi} direction="row" spacing={1} alignItems="center">
        {q.type === "single" && (
          <Radio
            checked={q.correct?.[0] === oi}
            onChange={() => update(qi, { correct: [oi] })}
            size="small"
          />
        )}
        {q.type === "multiple" && (
          <Checkbox
            checked={q.correct?.includes(oi)}
            onChange={(e) => {
              let corr = [...(q.correct || [])];
              if (e.target.checked) corr.push(oi);
              else corr = corr.filter((c) => c !== oi);
              update(qi, { correct: corr });
            }}
            size="small"
          />
        )}

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

        <IconButton
          onClick={() => {
            const newOptions = [...q.options];
            newOptions.splice(oi, 1);
            let newCorrect = [...(q.correct || [])];
            newCorrect = newCorrect
              .filter((c) => c !== oi)
              .map((c) => (c > oi ? c - 1 : c));
            update(qi, { options: newOptions, correct: newCorrect });
          }}
        >
          <RemoveCircleOutlineIcon sx={{ color: "error.main" }} />
        </IconButton>
      </Stack>
    ))}

    <Button
      variant="outlined"
      onClick={() => update(qi, { options: [...q.options, ""] })}
    >
      Thêm mục
    </Button>
  </Stack>
);

export default ChoiceOptions;